import type { RgbaImage } from './png.js';

/**
 * Pluggable image similarity metric. The default is SSIM; perceptual metrics
 * such as CLIP embedding cosine similarity can be supplied by callers that are
 * willing to take on a model dependency.
 */
export interface ImageSimilarityMetric {
  readonly name: string;
  /**
   * Returns a similarity in [0, 1] where 1 means identical. Both images are
   * guaranteed to share the same dimensions when this is called.
   */
  compare(candidate: RgbaImage, reference: RgbaImage): number | Promise<number>;
}

/**
 * Splits RGBA pixels into three colour planes, compositing transparent pixels
 * over white so that an empty render never matches a dark reference by
 * accident.
 */
export function toColorPlanes(image: RgbaImage): [Float64Array, Float64Array, Float64Array] {
  const { width, height, data } = image;
  const planes: [Float64Array, Float64Array, Float64Array] = [
    new Float64Array(width * height),
    new Float64Array(width * height),
    new Float64Array(width * height),
  ];
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const alpha = data[o + 3]! / 255;
    for (let c = 0; c < 3; c++) {
      planes[c]![i] = data[o + c]! * alpha + 255 * (1 - alpha);
    }
  }
  return planes;
}

/**
 * Bilinearly resamples an RGBA image to the requested dimensions.
 *
 * @throws Error when either target dimension is not a positive integer.
 */
export function resizeRgba(image: RgbaImage, width: number, height: number): RgbaImage {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`resizeRgba: target size must be positive integers (got ${width}x${height}).`);
  }
  if (image.width === width && image.height === height) {
    return image;
  }
  const out = new Uint8Array(width * height * 4);
  const xRatio = image.width / width;
  const yRatio = image.height / height;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(image.height - 1, Math.max(0, (y + 0.5) * yRatio - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.max(0, (x + 0.5) * xRatio - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const fx = sx - x0;
      for (let c = 0; c < 4; c++) {
        const p00 = image.data[(y0 * image.width + x0) * 4 + c]!;
        const p10 = image.data[(y0 * image.width + x1) * 4 + c]!;
        const p01 = image.data[(y1 * image.width + x0) * 4 + c]!;
        const p11 = image.data[(y1 * image.width + x1) * 4 + c]!;
        const top = p00 + (p10 - p00) * fx;
        const bottom = p01 + (p11 - p01) * fx;
        out[(y * width + x) * 4 + c] = Math.round(top + (bottom - top) * fy);
      }
    }
  }
  return { width, height, data: out };
}

/**
 * Options for the SSIM computation.
 */
export interface SsimOptions {
  /** Side length of the square comparison window in pixels (default 8). */
  windowSize?: number;
  /** Step between window origins in pixels (default windowSize / 2). */
  stride?: number;
}

/**
 * Mean Structural Similarity Index (Wang et al., 2004) computed independently
 * on the R, G, and B planes and averaged. Working per channel keeps the metric
 * colour-sensitive: two colours of equal luma (for example pure red and a
 * mid gray) are not reported as a match.
 *
 * Each plane uses a sliding square window with the standard stabilising
 * constants C1 = (0.01 * 255)^2 and C2 = (0.03 * 255)^2.
 *
 * @returns similarity in [-1, 1]; 1 for identical images. Zero-area images
 *   return 0, since an empty render carries no evidence of a match.
 * @throws Error when the images differ in size.
 */
export function computeSsim(a: RgbaImage, b: RgbaImage, options: SsimOptions = {}): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `computeSsim: images must share dimensions (got ${a.width}x${a.height} and ${b.width}x${b.height}).`
    );
  }
  const { width, height } = a;
  if (width === 0 || height === 0) {
    return 0;
  }
  const windowSize = Math.max(1, Math.min(options.windowSize ?? 8, width, height));
  const stride = Math.max(1, options.stride ?? Math.floor(windowSize / 2));
  const planesA = toColorPlanes(a);
  const planesB = toColorPlanes(b);
  let total = 0;
  for (let c = 0; c < 3; c++) {
    total += planeSsim(planesA[c]!, planesB[c]!, width, height, windowSize, stride);
  }
  return total / 3;
}

/**
 * Mean windowed SSIM of a single plane. The window always fits because the
 * caller clamps it to the image size.
 */
function planeSsim(
  la: Float64Array,
  lb: Float64Array,
  width: number,
  height: number,
  windowSize: number,
  stride: number
): number {
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const n = windowSize * windowSize;
  let total = 0;
  let windows = 0;
  for (let y = 0; y + windowSize <= height; y += stride) {
    for (let x = 0; x + windowSize <= width; x += stride) {
      let sumA = 0;
      let sumB = 0;
      let sumAA = 0;
      let sumBB = 0;
      let sumAB = 0;
      for (let wy = 0; wy < windowSize; wy++) {
        const row = (y + wy) * width + x;
        for (let wx = 0; wx < windowSize; wx++) {
          const va = la[row + wx]!;
          const vb = lb[row + wx]!;
          sumA += va;
          sumB += vb;
          sumAA += va * va;
          sumBB += vb * vb;
          sumAB += va * vb;
        }
      }
      const meanA = sumA / n;
      const meanB = sumB / n;
      const varA = sumAA / n - meanA * meanA;
      const varB = sumBB / n - meanB * meanB;
      const cov = sumAB / n - meanA * meanB;
      total +=
        ((2 * meanA * meanB + c1) * (2 * cov + c2)) /
        ((meanA * meanA + meanB * meanB + c1) * (varA + varB + c2));
      windows++;
    }
  }
  return total / windows;
}

/**
 * Default metric: per-channel SSIM clamped to [0, 1].
 */
export const ssimMetric: ImageSimilarityMetric = {
  name: 'ssim',
  compare(candidate, reference) {
    return Math.max(0, Math.min(1, computeSsim(candidate, reference)));
  },
};

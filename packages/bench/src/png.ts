import zlib from 'node:zlib';

/**
 * Decoded raster image with 8-bit RGBA pixels in row-major order.
 */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CHANNELS_BY_COLOR_TYPE: Record<number, number> = {
  0: 1, // grayscale
  2: 3, // truecolor
  4: 2, // grayscale + alpha
  6: 4, // truecolor + alpha
};

/**
 * Decodes a non-interlaced 8-bit PNG (grayscale, RGB, or RGBA, with or without
 * alpha) into RGBA pixels. This covers everything `@vitra/renderer` emits and
 * keeps the benchmark free of native image dependencies.
 *
 * @throws Error when the buffer is not a PNG or uses an unsupported encoding.
 */
export function decodePng(buffer: Uint8Array): RgbaImage {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      throw new Error('decodePng: input is not a PNG (signature mismatch).');
    }
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  const idat: Uint8Array[] = [];

  while (offset + 8 <= buffer.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      buffer[offset + 4]!,
      buffer[offset + 5]!,
      buffer[offset + 6]!,
      buffer[offset + 7]!
    );
    const dataStart = offset + 8;
    if (type === 'IHDR') {
      width = view.getUint32(dataStart);
      height = view.getUint32(dataStart + 4);
      bitDepth = buffer[dataStart + 8]!;
      colorType = buffer[dataStart + 9]!;
      interlace = buffer[dataStart + 12]!;
    } else if (type === 'IDAT') {
      idat.push(buffer.subarray(dataStart, dataStart + length));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataStart + length + 4; // skip CRC
  }

  const channels = CHANNELS_BY_COLOR_TYPE[colorType];
  if (width === 0 || height === 0 || channels === undefined) {
    throw new Error(`decodePng: unsupported or missing IHDR (colorType ${colorType}).`);
  }
  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(
      `decodePng: only 8-bit non-interlaced PNGs are supported (got bitDepth ${bitDepth}, interlace ${interlace}).`
    );
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) {
    throw new Error('decodePng: image data is truncated.');
  }

  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[src + x]!;
      const left = x >= channels ? pixels[dst + x - channels]! : 0;
      const up = y > 0 ? pixels[prev + x]! : 0;
      const upLeft = y > 0 && x >= channels ? pixels[prev + x - channels]! : 0;
      let predicted: number;
      switch (filter) {
        case 0:
          predicted = 0;
          break;
        case 1:
          predicted = left;
          break;
        case 2:
          predicted = up;
          break;
        case 3:
          predicted = (left + up) >> 1;
          break;
        case 4:
          predicted = paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`decodePng: unknown filter type ${filter} on row ${y}.`);
      }
      pixels[dst + x] = (value + predicted) & 0xff;
    }
  }

  if (channels === 4) {
    return { width, height, data: pixels };
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += channels) {
    const o = i * 4;
    if (channels === 3) {
      rgba[o] = pixels[j]!;
      rgba[o + 1] = pixels[j + 1]!;
      rgba[o + 2] = pixels[j + 2]!;
      rgba[o + 3] = 255;
    } else {
      const gray = pixels[j]!;
      rgba[o] = gray;
      rgba[o + 1] = gray;
      rgba[o + 2] = gray;
      rgba[o + 3] = channels === 2 ? pixels[j + 1]! : 255;
    }
  }
  return { width, height, data: rgba };
}

/**
 * PNG Paeth predictor: picks whichever of left, up, or upper-left is closest
 * to `left + up - upLeft`.
 */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

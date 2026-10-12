import { describe, it, expect } from 'vitest';
import type { RgbaImage } from '../src/png.js';
import { computeSsim, resizeRgba, ssimMetric, toColorPlanes } from '../src/similarity.js';

function solid(width: number, height: number, rgba: [number, number, number, number]): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { width, height, data };
}

function checkerboard(width: number, height: number, cell: number): RgbaImage {
  const img = solid(width, height, [255, 255, 255, 255]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0) img.data.set([0, 0, 0, 255], (y * width + x) * 4);
    }
  }
  return img;
}

describe('similarity', () => {
  it('scores identical images as 1', () => {
    const img = checkerboard(32, 32, 4);
    expect(computeSsim(img, img)).toBeCloseTo(1, 10);
  });

  it('scores structurally different images well below 1', () => {
    const a = checkerboard(32, 32, 4);
    const b = solid(32, 32, [128, 128, 128, 255]);
    expect(computeSsim(a, b)).toBeLessThan(0.1);
  });

  it('is symmetric', () => {
    const a = checkerboard(24, 24, 3);
    const b = checkerboard(24, 24, 6);
    expect(computeSsim(a, b)).toBeCloseTo(computeSsim(b, a), 10);
  });

  it('decreases monotonically as noise increases', () => {
    const base = checkerboard(32, 32, 8);
    const noisy = (amount: number): RgbaImage => {
      const copy = { ...base, data: base.data.slice() };
      for (let i = 0; i < copy.data.length; i += 4) {
        const delta = ((i * 7919) % 2 === 0 ? 1 : -1) * amount;
        for (let c = 0; c < 3; c++) copy.data[i + c] = Math.max(0, Math.min(255, copy.data[i + c]! + delta));
      }
      return copy;
    };
    const low = computeSsim(base, noisy(10));
    const high = computeSsim(base, noisy(60));
    expect(low).toBeLessThan(1);
    expect(high).toBeLessThan(low);
  });

  it('throws when dimensions differ', () => {
    expect(() => computeSsim(solid(4, 4, [0, 0, 0, 255]), solid(5, 4, [0, 0, 0, 255]))).toThrow(/dimensions/);
  });

  it('composites transparent pixels over white', () => {
    const planes = toColorPlanes(solid(1, 1, [0, 0, 0, 0]));
    expect(planes.map((p) => p[0])).toEqual([255, 255, 255]);
  });

  it('distinguishes colours of equal luma', () => {
    // Rec. 601 luma of pure red is 0.299 * 255 = 76.2, so a flat (76, 76, 76)
    // gray is indistinguishable from red on luma alone.
    const red = solid(16, 16, [255, 0, 0, 255]);
    const gray = solid(16, 16, [76, 76, 76, 255]);
    expect(computeSsim(red, gray)).toBeLessThan(0.3);
    expect(computeSsim(red, red)).toBeCloseTo(1, 10);
  });

  it('penalises a brand colour swap on an otherwise identical layout', () => {
    const withButton = (rgb: [number, number, number]): RgbaImage => {
      const img = solid(32, 32, [15, 17, 26, 255]);
      for (let y = 12; y < 20; y++) {
        for (let x = 4; x < 28; x++) img.data.set([...rgb, 255], (y * 32 + x) * 4);
      }
      return img;
    };
    const blue = withButton([0x89, 0xb4, 0xfa]);
    const pink = withButton([0xf3, 0x8b, 0xa8]);
    expect(computeSsim(blue, pink)).toBeLessThan(0.95);
  });

  it('returns 0 for zero-area images', () => {
    const empty: RgbaImage = { width: 0, height: 0, data: new Uint8Array(0) };
    expect(computeSsim(empty, empty)).toBe(0);
  });

  it('compares single-pixel images instead of treating them as identical', () => {
    expect(computeSsim(solid(1, 1, [255, 255, 255, 255]), solid(1, 1, [0, 0, 0, 255]))).toBeLessThan(0.01);
    expect(computeSsim(solid(1, 1, [10, 20, 30, 255]), solid(1, 1, [10, 20, 30, 255]))).toBeCloseTo(1, 10);
  });

  it('resizes with bilinear sampling and preserves solid colors', () => {
    const resized = resizeRgba(solid(10, 10, [10, 20, 30, 255]), 3, 7);
    expect(resized.width).toBe(3);
    expect(resized.height).toBe(7);
    expect(Array.from(resized.data.subarray(0, 4))).toEqual([10, 20, 30, 255]);
    expect(() => resizeRgba(resized, 0, 1)).toThrow(/positive integers/);
  });

  it('clamps the default metric to [0, 1]', async () => {
    const a = checkerboard(16, 16, 2);
    const inverted = { ...a, data: a.data.map((v, i) => (i % 4 === 3 ? v : 255 - v)) };
    const score = await ssimMetric.compare(a, inverted);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

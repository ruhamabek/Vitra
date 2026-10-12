import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { createDocumentNode, createFrameNode, InMemorySceneStore } from '@vitra/core';
import { TokenRegistry } from '@vitra/tokens';
import { decodePng } from '../src/png.js';
import { renderNode } from '../src/harness.js';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encodes RGB(A) pixels, cycling through every PNG filter type row by row. */
function encodePng(width: number, height: number, channels: 3 | 4, pixels: Uint8Array): Buffer {
  const stride = width * channels;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const filter = y % 5;
    const row = Buffer.alloc(stride + 1);
    row[0] = filter;
    for (let x = 0; x < stride; x++) {
      const cur = pixels[y * stride + x]!;
      const left = x >= channels ? pixels[y * stride + x - channels]! : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels]! : 0;
      let pred = 0;
      if (filter === 1) pred = left;
      if (filter === 2) pred = up;
      if (filter === 3) pred = (left + up) >> 1;
      if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      row[x + 1] = (cur - pred) & 0xff;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function pseudoRandomPixels(length: number): Uint8Array {
  const out = new Uint8Array(length);
  let seed = 12345;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out[i] = seed & 0xff;
  }
  return out;
}

describe('decodePng', () => {
  it('round-trips RGBA data across all five filter types', () => {
    const pixels = pseudoRandomPixels(7 * 10 * 4);
    const image = decodePng(encodePng(7, 10, 4, pixels));
    expect(image.width).toBe(7);
    expect(image.height).toBe(10);
    expect(Array.from(image.data)).toEqual(Array.from(pixels));
  });

  it('expands RGB data to opaque RGBA', () => {
    const pixels = pseudoRandomPixels(3 * 6 * 3);
    const image = decodePng(encodePng(3, 6, 3, pixels));
    for (let i = 0; i < 3 * 6; i++) {
      expect(image.data[i * 4]).toBe(pixels[i * 3]);
      expect(image.data[i * 4 + 1]).toBe(pixels[i * 3 + 1]);
      expect(image.data[i * 4 + 2]).toBe(pixels[i * 3 + 2]);
      expect(image.data[i * 4 + 3]).toBe(255);
    }
  });

  it('rejects input that is not a PNG', () => {
    expect(() => decodePng(Buffer.from('not a png at all'))).toThrow(/signature/);
  });

  it('decodes renderer output to the expected solid fill', async () => {
    const store = new InMemorySceneStore(createDocumentNode({ id: 'root' }));
    store.insertNode(createFrameNode({ id: 'box', width: 40, height: 30, fill: '#336699' }), 'root');
    const image = await renderNode(store, 'box', new TokenRegistry());
    expect(image.width).toBe(40);
    expect(image.height).toBe(30);
    const center = ((15 * 40) + 20) * 4;
    expect(Array.from(image.data.subarray(center, center + 4))).toEqual([0x33, 0x66, 0x99, 255]);
  });
});

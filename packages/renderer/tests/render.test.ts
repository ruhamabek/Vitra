import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  InMemorySceneStore,
} from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '../src/renderer.js';

describe('Headless Renderer (SVG & PNG)', () => {
  it('should render a frame with text into clean SVG markup', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const card = createFrameNode({
      id: 'card',
      name: 'Card',
      fill: '#1E1E2E',
      cornerRadius: 12,
      layout: {
        direction: 'vertical',
        gap: 8,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
      },
    });

    const title = createTextNode({
      id: 'title',
      text: 'Vitra Design System',
      fontSize: 20,
      fill: '#CDD6F4',
    });

    store.insertNode(card, 'root');
    store.insertNode(title, 'card');

    const layout = await computeLayout(store, 'card', {
      textMeasurer: () => ({ width: 180, height: 24 }),
    });

    const svg = renderToSvg(store, 'card', layout);

     expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 212 56"'); // 180 + 32, 24 + 32
    expect(svg).toContain('fill="#1E1E2E"');
    expect(svg).toContain('rx="12"');
    expect(svg).toContain('Vitra Design System');
    expect(svg).toContain('fill="#CDD6F4"');
  });

  it('should rasterize the SVG into a valid PNG buffer', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const button = createFrameNode({
      id: 'btn',
      fill: '#89B4FA',
      cornerRadius: 8,
      layout: {
        direction: 'horizontal',
        padding: { top: 10, right: 20, bottom: 10, left: 20 },
      },
    });

    const label = createTextNode({
      id: 'label',
      text: 'Get Started',
      fontSize: 14,
      fill: '#11111B',
    });

    store.insertNode(button, 'root');
    store.insertNode(label, 'btn');

    const layout = await computeLayout(store, 'btn', {
      textMeasurer: () => ({ width: 80, height: 18 }),
    });

    const svg = renderToSvg(store, 'btn', layout);
    const pngBuffer = await renderToPng(svg);

    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);

    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50);
    expect(pngBuffer[2]).toBe(0x4E);
    expect(pngBuffer[3]).toBe(0x47);
  });
});
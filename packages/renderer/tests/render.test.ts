import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
  InMemorySceneStore,
} from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { TokenRegistry } from '@vitra/tokens';
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
    expect(svg).toContain('viewBox="0 0 212 56"');  
    expect(svg).toContain('fill="#1E1E2E"');
    expect(svg).toContain('rx="12"');
    expect(svg).toContain('Vitra Design System');
    expect(svg).toContain('fill="#CDD6F4"');
  });

  it('should render an artboard node and its nested children to SVG', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const artboard = (await import('@vitra/core')).createArtboardNode({
      id: 'desktop-artboard',
      name: 'Desktop Preview',
      width: 1260,
      height: 840,
      fill: '#0D0E12',
    });

    const label = createTextNode({
      id: 'artboard-label',
      text: 'Test Responsive',
      fontSize: 24,
      fill: '#FFFFFF',
    });

    store.insertNode(artboard, 'root');
    store.insertNode(label, 'desktop-artboard');

    const layout = await computeLayout(store, 'desktop-artboard');
    const svg = renderToSvg(store, 'desktop-artboard', layout);

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 1260 840"');
    expect(svg).toContain('fill="#0D0E12"');
    expect(svg).toContain('Test Responsive');
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

  it('should render shapes (ellipses, dividers), strokes, and drop shadows to SVG', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

     const card = createFrameNode({
      id: 'profile-card',
      fill: '#1E1E2E',
      stroke: '#45475A',
      strokeWidth: 2,
      cornerRadius: 16,
      effects: [
        {
          type: 'drop-shadow',
          color: 'rgba(0, 0, 0, 0.5)',
          offsetX: 0,
          offsetY: 8,
          blur: 16,
        },
      ],
      layout: {
        direction: 'vertical',
        gap: 12,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });

     const avatar = createShapeNode({
      id: 'avatar-circle',
      shapeType: 'ellipse',
      width: 48,
      height: 48,
      fill: '#89B4FA',
      stroke: '#B4BEFE',
      strokeWidth: 2,
    });

     const divider = createShapeNode({
      id: 'divider-line',
      shapeType: 'divider',
      width: 200,
      height: 1,
      fill: '#313244',
    });

    store.insertNode(card, 'root');
    store.insertNode(avatar, 'profile-card');
    store.insertNode(divider, 'profile-card');

    const layout = await computeLayout(store, 'profile-card');
    const svg = renderToSvg(store, 'profile-card', layout);

     expect(svg).toContain('<ellipse');
    expect(svg).toContain('stroke="#45475A"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('<filter id=');
    expect(svg).toContain('feDropShadow');

     const png = await renderToPng(svg);
    expect(png.length).toBeGreaterThan(0);
  });

  it('should resolve design tokens and swap themes (dark / light mode) during rendering', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const registry = new TokenRegistry();
    registry.registerTokens({
      colors: {
        surface: { $value: '#11111B', $type: 'color' },
        text: { $value: '#CDD6F4', $type: 'color' },
      },
    });

    registry.registerTheme('light', {
      colors: {
        surface: { $value: '#FFFFFF', $type: 'color' },
        text: { $value: '#1E1E2E', $type: 'color' },
      },
    });

    const card = createFrameNode({
      id: 'themed-card',
      fill: '$colors.surface',
      width: 200,
      height: 100,
    });

    const text = createTextNode({
      id: 'themed-text',
      text: 'Dynamic Theme',
      fill: '$colors.text',
    });

    store.insertNode(card, 'root');
    store.insertNode(text, 'themed-card');

    const layout = await computeLayout(store, 'themed-card');

     const darkSvg = renderToSvg(store, 'themed-card', layout, { tokenRegistry: registry });
    expect(darkSvg).toContain('fill="#11111B"');
    expect(darkSvg).toContain('fill="#CDD6F4"');

     registry.setTheme('light');
    const lightSvg = renderToSvg(store, 'themed-card', layout, { tokenRegistry: registry });
    expect(lightSvg).toContain('fill="#FFFFFF"');
    expect(lightSvg).toContain('fill="#1E1E2E"');
  });
});
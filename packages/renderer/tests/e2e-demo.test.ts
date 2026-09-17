import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  InMemorySceneStore,
} from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '../src/renderer.js';

describe('E2E Design Generation Smoke Test', () => {
  it('should generate, layout, and render a complete SaaS card to a real PNG file', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

     const card = createFrameNode({
      id: 'pricing-card',
      name: 'Pricing Card',
      fill: '#181825',
      cornerRadius: 16,
      layout: {
        direction: 'vertical',
        gap: 16,
        padding: { top: 32, right: 32, bottom: 32, left: 32 },
        alignItems: 'start',
      },
    });

     const badge = createFrameNode({
      id: 'badge',
      name: 'Badge',
      fill: '#313244',
      cornerRadius: 6,
      layout: {
        direction: 'horizontal',
        padding: { top: 6, right: 12, bottom: 6, left: 12 },
      },
    });
    const badgeText = createTextNode({
      id: 'badge-text',
      text: 'PRO TIER',
      fontSize: 12,
      fontWeight: 700,
      fill: '#89B4FA',
    });

     const priceText = createTextNode({
      id: 'price-text',
      text: '$29 / mo',
      fontSize: 32,
      fontWeight: 700,
      fill: '#CDD6F4',
    });

     const descText = createTextNode({
      id: 'desc-text',
      text: 'Autonomous AI agent visual design workspace with zero vendor lock-in.',
      fontSize: 14,
      fill: '#A6ADC8',
    });

     const button = createFrameNode({
      id: 'cta-btn',
      name: 'CTA Button',
      fill: '#89B4FA',
      cornerRadius: 8,
      layout: {
        direction: 'horizontal',
        padding: { top: 12, right: 24, bottom: 12, left: 24 },
        justifyContent: 'center',
      },
    });
    const btnText = createTextNode({
      id: 'btn-text',
      text: 'Start Free Trial',
      fontSize: 15,
      fontWeight: 600,
      fill: '#11111B',
    });

    store.insertNode(card, 'root');
    store.insertNode(badge, 'pricing-card');
    store.insertNode(badgeText, 'badge');
    store.insertNode(priceText, 'pricing-card');
    store.insertNode(descText, 'pricing-card');
    store.insertNode(button, 'pricing-card');
    store.insertNode(btnText, 'cta-btn');

     const layout = await computeLayout(store, 'pricing-card');

     const svg = renderToSvg(store, 'pricing-card', layout);
    const pngBuffer = await renderToPng(svg, { scale: 2 }); // 2x retina scale

    const outputPath = path.resolve(process.cwd(), 'output-pricing-card.png');
    await fs.writeFile(outputPath, pngBuffer);

     const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(1000);
  });
});

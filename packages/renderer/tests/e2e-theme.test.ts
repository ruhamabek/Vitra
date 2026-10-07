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
import { TokenRegistry } from '@vitra/tokens';
import { renderToSvg, renderToPng } from '../src/renderer.js';

describe('E2E Design System Theme Swapping Smoke Test', () => {
  it('should render the exact same component in both Dark and Light themes via design tokens', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const registry = new TokenRegistry();
    
    registry.registerTokens({
      colors: {
        cardBg: { $value: '#181825', $type: 'color' },
        cardBorder: { $value: '#313244', $type: 'color' },
        textTitle: { $value: '#CDD6F4', $type: 'color' },
        textDesc: { $value: '#A6ADC8', $type: 'color' },
        badgeBg: { $value: '#313244', $type: 'color' },
        badgeText: { $value: '#89B4FA', $type: 'color' },
        btnBg: { $value: '#89B4FA', $type: 'color' },
        btnText: { $value: '#11111B', $type: 'color' },
      },
      radii: {
        card: { $value: 16, $type: 'dimension' },
        btn: { $value: 8, $type: 'dimension' },
      },
    });

    registry.registerTheme('light', {
      colors: {
        cardBg: { $value: '#FFFFFF', $type: 'color' },
        cardBorder: { $value: '#E2E8F0', $type: 'color' },
        textTitle: { $value: '#0F172A', $type: 'color' },
        textDesc: { $value: '#64748B', $type: 'color' },
        badgeBg: { $value: '#EFF6FF', $type: 'color' },
        badgeText: { $value: '#2563EB', $type: 'color' },
        btnBg: { $value: '#2563EB', $type: 'color' },
        btnText: { $value: '#FFFFFF', $type: 'color' },
      },
    });

    const card = createFrameNode({
      id: 'theme-card',
      fill: '$colors.cardBg',
      stroke: '$colors.cardBorder',
      strokeWidth: 1.5,
      cornerRadius: 16,
      effects: [
        {
          type: 'drop-shadow',
          color: 'rgba(0, 0, 0, 0.15)',
          offsetX: 0,
          offsetY: 8,
          blur: 16,
        },
      ],
      layout: {
        direction: 'vertical',
        gap: 16,
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
        alignItems: 'start',
      },
    });

    const badge = createFrameNode({
      id: 'theme-badge',
      fill: '$colors.badgeBg',
      cornerRadius: 6,
      layout: {
        direction: 'horizontal',
        padding: { top: 6, right: 12, bottom: 6, left: 12 },
      },
    });
    const badgeText = createTextNode({
      id: 'theme-badge-text',
      text: 'THEME ENGINE',
      fontSize: 12,
      fontWeight: 700,
      fill: '$colors.badgeText',
    });

    const title = createTextNode({
      id: 'theme-title',
      text: 'Design Token System',
      fontSize: 22,
      fontWeight: 700,
      fill: '$colors.textTitle',
    });

    const desc = createTextNode({
      id: 'theme-desc',
      text: 'Instant theme-swapping with zero manual AST node edits.',
      fontSize: 14,
      fill: '$colors.textDesc',
    });

    const btn = createFrameNode({
      id: 'theme-btn',
      fill: '$colors.btnBg',
      cornerRadius: 8,
      layout: {
        direction: 'horizontal',
        padding: { top: 10, right: 20, bottom: 10, left: 20 },
      },
    });
    const btnText = createTextNode({
      id: 'theme-btn-text',
      text: 'Explore Tokens',
      fontSize: 14,
      fontWeight: 600,
      fill: '$colors.btnText',
    });

    store.insertNode(card, 'root');
    store.insertNode(badge, 'theme-card');
    store.insertNode(badgeText, 'theme-badge');
    store.insertNode(title, 'theme-card');
    store.insertNode(desc, 'theme-card');
    store.insertNode(btn, 'theme-card');
    store.insertNode(btnText, 'theme-btn');

    const layout = await computeLayout(store, 'theme-card');

    registry.setTheme(null); 
    const darkSvg = renderToSvg(store, 'theme-card', layout, { tokenRegistry: registry });
    const darkPng = await renderToPng(darkSvg, { scale: 2 });
    await fs.writeFile(path.resolve(process.cwd(), 'output-theme-dark.png'), darkPng);

    registry.setTheme('light');
    const lightSvg = renderToSvg(store, 'theme-card', layout, { tokenRegistry: registry });
    const lightPng = await renderToPng(lightSvg, { scale: 2 });
    await fs.writeFile(path.resolve(process.cwd(), 'output-theme-light.png'), lightPng);

    expect(darkPng.length).toBeGreaterThan(1000);
    expect(lightPng.length).toBeGreaterThan(1000);
  });
});

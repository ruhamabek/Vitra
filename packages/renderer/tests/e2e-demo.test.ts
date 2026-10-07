import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
  InMemorySceneStore,
} from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '../src/renderer.js';

describe('E2E Design Generation Smoke Test', () => {
  it('should generate, layout, and render a rich profile card with avatar, divider, and shadows', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

     const card = createFrameNode({
      id: 'profile-card',
      name: 'Profile Card',
      fill: '#181825',
      stroke: '#313244',
      strokeWidth: 1.5,
      cornerRadius: 16,
      effects: [
        {
          type: 'drop-shadow',
          color: 'rgba(0, 0, 0, 0.45)',
          offsetX: 0,
          offsetY: 10,
          blur: 20,
        },
      ],
      layout: {
        direction: 'vertical',
        gap: 16,
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
        alignItems: 'start',
      },
    });

     const headerRow = createFrameNode({
      id: 'header-row',
      layout: {
        direction: 'horizontal',
        gap: 14,
        alignItems: 'center',
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

     const nameStack = createFrameNode({
      id: 'name-stack',
      layout: {
        direction: 'vertical',
        gap: 4,
      },
    });
    const nameText = createTextNode({
      id: 'user-name',
      text: 'Alex Rivera',
      fontSize: 18,
      fontWeight: 700,
      fill: '#CDD6F4',
    });
    const roleText = createTextNode({
      id: 'user-role',
      text: 'Senior AI Systems Architect',
      fontSize: 13,
      fill: '#A6ADC8',
    });

     const divider = createShapeNode({
      id: 'card-divider',
      shapeType: 'divider',
      width: 300,
      height: 1,
      fill: '#313244',
    });

     const bioText = createTextNode({
      id: 'bio-text',
      text: 'Building autonomous, vendor-agnostic visual agent runtimes with strict TDD.',
      fontSize: 14,
      fill: '#BAC2DE',
    });

     const btn = createFrameNode({
      id: 'action-btn',
      fill: '#89B4FA',
      cornerRadius: 8,
      layout: {
        direction: 'horizontal',
        padding: { top: 10, right: 20, bottom: 10, left: 20 },
      },
    });
    const btnText = createTextNode({
      id: 'btn-text',
      text: 'Connect',
      fontSize: 14,
      fontWeight: 600,
      fill: '#11111B',
    });

     store.insertNode(card, 'root');
    store.insertNode(headerRow, 'profile-card');
    store.insertNode(avatar, 'header-row');
    store.insertNode(nameStack, 'header-row');
    store.insertNode(nameText, 'name-stack');
    store.insertNode(roleText, 'name-stack');
    store.insertNode(divider, 'profile-card');
    store.insertNode(bioText, 'profile-card');
    store.insertNode(btn, 'profile-card');
    store.insertNode(btnText, 'action-btn');

    const layout = await computeLayout(store, 'profile-card');
    const svg = renderToSvg(store, 'profile-card', layout);
    const png = await renderToPng(svg, { scale: 2 });

    await fs.writeFile(path.resolve(process.cwd(), 'output-profile-card.png'), png);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  applyComponentToProject,
} from '../src/index.js';
import { loadVitraProject, FrameNode, TextNode } from '@vitra/core';

describe('Vitra CLI: apply command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitra-apply-test-'));
    await initProject(tmpDir, { name: 'Apply Test Project' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should atomically insert a declarative component tree into the project', async () => {
    const componentJson = path.join(tmpDir, 'modal.json');
    const declarativeTree = {
      id: 'custom-modal',
      type: 'frame',
      name: 'Custom Modal',
      fill: '#131D33',
      cornerRadius: 16,
      layout: { direction: 'vertical', gap: 12 },
      children: [
        {
          id: 'modal-title',
          type: 'text',
          name: 'Title',
          text: 'Declarative Modal Header',
          fill: '#F8FAFC',
          fontSize: 20,
        },
        {
          id: 'cta-btn',
          type: 'frame',
          name: 'CTA Button',
          fill: '#2563EB',
          children: [
            {
              id: 'cta-btn-text',
              type: 'text',
              text: 'Confirm Action',
              fill: '#FFFFFF',
            },
          ],
        },
      ],
    };

    fs.writeFileSync(componentJson, JSON.stringify(declarativeTree, null, 2), 'utf-8');

    const result = await applyComponentToProject(tmpDir, componentJson);

    expect(result.appliedCount).toBe(4); // modal + title + button + button text
    expect(result.rootNodeId).toBe('custom-modal');

    const reloaded = await loadVitraProject(tmpDir);
    const modalNode = reloaded.store.getNode('custom-modal');
    expect(modalNode).toBeDefined();
    expect(modalNode?.name).toBe('Custom Modal');

    const btnTextNode = reloaded.store.getNode('cta-btn-text');
    expect(btnTextNode).toBeDefined();
    expect((btnTextNode as TextNode).text).toBe('Confirm Action');
  });

  it('should atomically parse and insert a design.md component tree', async () => {
    const componentMd = path.join(tmpDir, 'pricing-card.md');
    const mdContent = `
- Frame: pricing-card [name: "Pricing Card", w: 320, dir: vertical, gap: 16, pad: 20, fill: #0F172A, r: 16]
  - Text: price-title [text: "Pro Plan", size: 20, weight: 600, fill: #FFFFFF]
  - Text: price-value [text: "$29/mo", size: 28, weight: 700, fill: #38BDF8]
  - Frame: cta-row [dir: horizontal, gap: 8]
    - Icon: check-icon [icon: "sparkles", size: 16, color: #38BDF8]
    - Text: feature-text [text: "Unlimited Canvas Sync", size: 14, fill: #94A3B8]
`;

    fs.writeFileSync(componentMd, mdContent, 'utf-8');

    const result = await applyComponentToProject(tmpDir, componentMd);
    expect(result.appliedCount).toBe(6);
    expect(result.rootNodeId).toBe('pricing-card');

    const reloaded = await loadVitraProject(tmpDir);
    const card = reloaded.store.getNode('pricing-card');
    expect(card).toBeDefined();
    expect((card as FrameNode).cornerRadius).toBe(16);

    const priceText = reloaded.store.getNode('price-value');
    expect(priceText).toBeDefined();
    expect((priceText as TextNode).text).toBe('$29/mo');
  });
});

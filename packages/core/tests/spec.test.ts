import { describe, it, expect } from 'vitest';
import {
  InMemorySceneStore,
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createIconNode,
  exportToDesignMarkdown,
  parseDesignMarkdown,
  insertDeclarativeTree,
} from '../src/index.js';

describe('Vitra Native Structural Specification (design.md)', () => {
  it('should parse an indented design.md format into a nested declarative tree', () => {
    const markdown = `
# Artboard: mobile-preview [w: 375, h: 812, fill: #0B0F19]
  - Frame: card [w: 335, dir: vertical, gap: 12, pad: 16, fill: #1E1E2E, r: 12]
    - Text: title [text: "AI-Native Design Runtime", size: 20, weight: 600, fill: #FFFFFF]
    - Frame: icon-row [dir: horizontal, gap: 8, align: center]
      - Icon: star [icon: "star", size: 16, color: #F9E2AF]
      - Text: rating [text: "4.9 (1.2k reviews)", size: 14, fill: #BAC2DE]
`;

    const tree = parseDesignMarkdown(markdown);
    expect(tree.id).toBe('mobile-preview');
    expect(tree.type).toBe('artboard');
    expect(tree.width).toBe(375);
    expect(tree.height).toBe(812);
    expect(tree.children?.length).toBe(1);

    const card = tree.children![0];
    expect(card.id).toBe('card');
    expect(card.type).toBe('frame');
    expect(card.layout?.direction).toBe('vertical');
    expect(card.layout?.gap).toBe(12);
    expect(card.cornerRadius).toBe(12);
    expect(card.children?.length).toBe(2);

    const title = card.children![0];
    expect(title.id).toBe('title');
    expect(title.type).toBe('text');
    expect(title.text).toBe('AI-Native Design Runtime');
    expect(title.fontSize).toBe(20);

    const iconRow = card.children![1];
    expect(iconRow.children?.length).toBe(2);
    const star = iconRow.children![0];
    expect(star.type).toBe('icon');
    expect(star.icon).toBe('star');
    expect(star.color).toBe('#F9E2AF');
  });

  it('should roundtrip: store nodes -> exportToDesignMarkdown -> parseDesignMarkdown -> insertDeclarativeTree', () => {
    const doc = createDocumentNode({ id: 'root', name: 'Root' });
    const store = new InMemorySceneStore(doc);

    const frame = createFrameNode({
      id: 'profile-box',
      name: 'Profile Box',
      width: 320,
      fill: '#181825',
      cornerRadius: 16,
      layout: {
        direction: 'vertical',
        gap: 8,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
      },
    });
    store.insertNode(frame, 'root');

    const text = createTextNode({
      id: 'user-name',
      text: 'Sophia Anderson',
      fontSize: 18,
      fill: '#CDD6F4',
    });
    store.insertNode(text, 'profile-box');

    const icon = createIconNode({
      id: 'shield-icon',
      icon: 'shield',
      size: 16,
      color: '#A6E3A1',
    });
    store.insertNode(icon, 'profile-box');

     const md = exportToDesignMarkdown(store, 'profile-box');
    expect(md).toContain('- Frame: profile-box');
    expect(md).toContain('dir: vertical');
    expect(md).toContain('- Text: user-name');
    expect(md).toContain('text: "Sophia Anderson"');
    expect(md).toContain('- Icon: shield-icon');
    expect(md).toContain('icon: "shield"');

     const parsed = parseDesignMarkdown(md);
    expect(parsed.id).toBe('profile-box');
    expect(parsed.children?.length).toBe(2);

     const store2 = new InMemorySceneStore(createDocumentNode({ id: 'root2' }));
    const result = insertDeclarativeTree(store2, parsed, 'root2');
    expect(result.totalInserted).toBe(3);
    expect(store2.getNode('profile-box')).toBeDefined();
    expect(store2.getNode('user-name')).toBeDefined();
    expect(store2.getNode('shield-icon')).toBeDefined();
  });
});

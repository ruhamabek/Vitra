import { describe, it, expect } from 'vitest';
import { InMemorySceneStore } from '../src/store.js';
import {
  createDocumentNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  ArtboardNode,
} from '../src/nodes.js';

describe('Vitra Artboard Spatial Model - TDD Suite', () => {
  it('should create an artboard node with preset, dimensions, and spatial canvas coordinates', () => {
    const artboard = createArtboardNode({
      id: 'artboard-desktop',
      name: 'Desktop Preview',
      preset: 'desktop',
      width: 1440,
      height: 900,
      x: 0,
      y: 0,
      stateLabel: 'Default Production State',
      fill: '#0F111A',
    });

    expect(artboard.id).toBe('artboard-desktop');
    expect(artboard.type).toBe('artboard');
    expect(artboard.preset).toBe('desktop');
    expect(artboard.width).toBe(1440);
    expect(artboard.height).toBe(900);
    expect(artboard.x).toBe(0);
    expect(artboard.y).toBe(0);
    expect(artboard.stateLabel).toBe('Default Production State');
    expect(artboard.childIds).toEqual([]);
  });

  it('should support side-by-side multi-artboards on the root document', () => {
    const root = createDocumentNode({ id: 'root', name: 'Spatial Workspace' });
    const store = new InMemorySceneStore(root);

     const desktop = createArtboardNode({
      id: 'board-desktop',
      name: 'Test Desktop',
      preset: 'desktop',
      width: 1260,
      height: 840,
      x: 0,
      y: 0,
      stateLabel: 'Desktop (1260px)',
    });
    store.insertNode(desktop, 'root');

     const mobile = createArtboardNode({
      id: 'board-mobile',
      name: 'Test Mobile',
      preset: 'mobile',
      width: 375,
      height: 812,
      x: 1340,
      y: 0,
      stateLabel: 'Mobile (375px)',
    });
    store.insertNode(mobile, 'root');

    expect(store.getRoot().childIds).toEqual(['board-desktop', 'board-mobile']);

    const desktopNode = store.getNode('board-desktop') as ArtboardNode;
    const mobileNode = store.getNode('board-mobile') as ArtboardNode;

    expect(desktopNode?.type).toBe('artboard');
    expect(mobileNode?.type).toBe('artboard');
    expect(mobileNode.x).toBe(1340);
  });

  it('should allow nesting frames and components inside an artboard', () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const artboard = createArtboardNode({
      id: 'board-state-loading',
      preset: 'mobile',
      width: 375,
      height: 812,
      stateLabel: 'Loading Skeleton',
    });
    store.insertNode(artboard, 'root');

    const card = createFrameNode({
      id: 'skeleton-card',
      width: 335,
      height: 120,
      fill: '#1E2030',
    });
    store.insertNode(card, 'board-state-loading');

    const label = createTextNode({
      id: 'loading-text',
      text: 'Loading members...',
    });
    store.insertNode(label, 'skeleton-card');

    expect(store.getNode('board-state-loading')?.type).toBe('artboard');
    const boardChildren = store.getChildren('board-state-loading');
    expect(boardChildren.map((c) => c.id)).toContain('skeleton-card');
  });
});

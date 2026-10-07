import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
  createArtboardNode,
  InMemorySceneStore,
} from '@vitra/core';
import { computeLayout } from '../src/engine.js';

describe('Layout Engine (Auto-Layout)', () => {
  it('should compute absolute coordinates for a vertical auto-layout frame with children', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const card = createFrameNode({
      id: 'card',
      name: 'Card',
      layout: {
        direction: 'vertical',
        gap: 10,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        alignItems: 'start',
      },
    });

    const title = createTextNode({
      id: 'title',
      text: 'Title Text',
      fontSize: 16,
    });

    const body = createTextNode({
      id: 'body',
      text: 'Body description text goes here',
      fontSize: 14,
    });

    store.insertNode(card, 'root');
    store.insertNode(title, 'card');
    store.insertNode(body, 'card');

    const result = await computeLayout(store, 'card', {
      textMeasurer: (textNode) => {
        if (textNode.id === 'title') return { width: 200, height: 30 };
        if (textNode.id === 'body') return { width: 200, height: 50 };
        return { width: 100, height: 20 };
      },
    });

    expect(result.nodeId).toBe('card');
    expect(result.bounds).toEqual({
      x: 0,
      y: 0,
      width: 240,  
      height: 130,  
    });

    const titleLayout = result.children.find(c => c.nodeId === 'title');
    const bodyLayout = result.children.find(c => c.nodeId === 'body');

    expect(titleLayout?.bounds).toEqual({
      x: 20,
      y: 20,
      width: 200,
      height: 30,
    });

    expect(bodyLayout?.bounds).toEqual({
      x: 20,
      y: 60,
      width: 200,
      height: 50,
    });
  });

  it('should compute bounds for shape nodes inside a horizontal layout', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const userRow = createFrameNode({
      id: 'user-row',
      layout: {
        direction: 'horizontal',
        gap: 12,
        padding: { top: 8, right: 16, bottom: 8, left: 16 },
        alignItems: 'center',
      },
    });

    const avatar = createShapeNode({
      id: 'avatar',
      shapeType: 'ellipse',
      width: 40,
      height: 40,
    });

    const name = createTextNode({
      id: 'username',
      text: 'Alex Rivera',
      fontSize: 16,
    });

    store.insertNode(userRow, 'root');
    store.insertNode(avatar, 'user-row');
    store.insertNode(name, 'user-row');

    const result = await computeLayout(store, 'user-row', {
      textMeasurer: () => ({ width: 100, height: 20 }),
    });

    expect(result.bounds).toEqual({
      x: 0,
      y: 0,
      width: 184,  
      height: 56, 
    });

    const avatarLayout = result.children.find(c => c.nodeId === 'avatar');
    expect(avatarLayout?.bounds).toEqual({
      x: 16,
      y: 8,
      width: 40,
      height: 40,
    });
  });

  it('should compute bounds for an artboard node with auto-layout', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const artboard = createArtboardNode({
      id: 'artboard-desktop',
      name: 'Desktop Preview',
      preset: 'desktop',
      x: 100,
      y: 50,
      width: 1440,
      height: 900,
      layout: {
        direction: 'vertical',
        gap: 20,
        padding: { top: 32, right: 32, bottom: 32, left: 32 },
        alignItems: 'start',
      },
    });

    const header = createFrameNode({
      id: 'header-row',
      width: 1376,
      height: 64,
    });

    store.insertNode(artboard, 'root');
    store.insertNode(header, 'artboard-desktop');

    const result = await computeLayout(store, 'artboard-desktop');

    expect(result.nodeId).toBe('artboard-desktop');
    expect(result.bounds.width).toBe(1440);
    expect(result.bounds.height).toBe(900);

    const headerLayout = result.children.find(c => c.nodeId === 'header-row');
    expect(headerLayout?.bounds).toEqual({
      x: 32,
      y: 32,
      width: 1376,
      height: 64,
    });
  });

  it('should correctly position child elements and compute hug bounds when horizontal and vertical padding differ', async () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const button = createFrameNode({
      id: 'btn-test',
      name: 'Button',
      layout: {
        direction: 'horizontal',
        gap: 8,
        padding: { top: 12, right: 24, bottom: 12, left: 24 }, // H: 24, V: 12
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    const label = createTextNode({
      id: 'btn-label',
      text: 'Click Me',
      fontSize: 14,
    });

    store.insertNode(button, 'root');
    store.insertNode(label, 'btn-test');

    const result = await computeLayout(store, 'btn-test', {
      textMeasurer: () => ({ width: 60, height: 20 }),
    });

    // Width: 24 (left) + 60 (text) + 24 (right) = 108
    // Height: 12 (top) + 20 (text) + 12 (bottom) = 44
    expect(result.bounds.width).toBe(108);
    expect(result.bounds.height).toBe(44);

    const childLayout = result.children.find(c => c.nodeId === 'btn-label');
    expect(childLayout?.bounds.x).toBe(24);
    expect(childLayout?.bounds.y).toBe(12);
  });
});
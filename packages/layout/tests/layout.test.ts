import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
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
});
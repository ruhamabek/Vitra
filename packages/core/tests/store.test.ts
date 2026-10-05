import { describe, it, expect } from 'vitest';
import { InMemorySceneStore } from '../src/store';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
} from '../src/nodes';
 
describe('InMemorySceneStore', () => {
    it('should initialize with a root document node', () => { 
         const root = createDocumentNode({id: 'root', name: 'Document'});
         const store = new InMemorySceneStore(root);

         expect(store.getRoot().id).toBe('root')
         expect(store.getRoot().type).toBe('document');
         expect(store.getNode('root')).toBeDefined();
    });

    it('should allow inserting a frame child under the root document', () => {
    const root = createDocumentNode({id: 'root', name: 'Document'});
    const store = new InMemorySceneStore(root);

    const frame = createFrameNode({
      id: 'frame-1',
      name: 'Container',
      layout: {
        direction: 'vertical',
        gap: 16,
        padding: { top: 20, right: 20, bottom: 20, left: 20 }
      }
    });
    store.insertNode(frame, 'root');

    const retrieved = store.getNode('frame-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe('frame');
    expect(retrieved?.parentId).toBe('root');
    
     const rootChildren = store.getChildren('root');
    expect(rootChildren.map(c => c.id)).toContain('frame-1');
});

it('should throw an error when inserting under a non-existent parent', () => {
    const root = createDocumentNode({id: 'root', name: 'Document'});
    const store = new InMemorySceneStore(root)

    const frame = createFrameNode({ id: 'frame-orphan', name: 'Orphan' })
    
    expect(() => {
      store.insertNode(frame, 'non-existent-parent');
    }).toThrowError(/Parent node "non-existent-parent" not found/);
})

it('should allow inserting a text node inside a frame and maintain order', () => {
    const root = createDocumentNode({id: 'root', name: 'Document'})
    const store = new InMemorySceneStore(root);

    const frame = createFrameNode({id: 'card', name: 'Document'});
    store.insertNode(frame, 'root');

    const title = createTextNode({id: 'title', text: 'Hello World', fontSize: 24})
    const subtitle = createTextNode({ id: 'subtitle', text: 'Visual Agent Runtime', fontSize: 14 });

    store.insertNode(title, 'card');
    store.insertNode(subtitle, 'card');

    const children = store.getChildren('card');
    
    expect(children.length).toBe(2);
    expect(children[0]?.id).toBe('title');
    expect(children[1]?.id).toBe('subtitle');
})

it('should update node properties cleanly', () => {
    const root = createDocumentNode({id: 'root'});
    const store = new InMemorySceneStore(root)

    const frame = createFrameNode({ id: 'f1', name: 'Original', fill: '#000000' })
    store.insertNode(frame, 'root');

    store.updateNode('f1', { fill: '#FFFFFF', name: 'Updated' });

    const updated = store.getNode('f1')
    expect(updated?.name).toBe('Updated');
    if (updated?.type === 'frame') {
      expect(updated.fill).toBe('#FFFFFF');
    }
})

 it('should recursively delete child nodes when parent is deleted', () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);
    const card = createFrameNode({ id: 'card' });
    const title = createTextNode({ id: 'title', text: 'Hello' });

    store.insertNode(card, 'root');
    store.insertNode(title, 'card');

    expect(store.getNode('card')).toBeDefined();
    expect(store.getNode('title')).toBeDefined();

    store.deleteNode('card');

    expect(store.getNode('card')).toBeUndefined();
    expect(store.getNode('title')).toBeUndefined();
    expect(store.getChildren('root').length).toBe(0);
  });

  it('should support moving a node to a different parent and index', () => {

    const root = createDocumentNode({ id: 'root' });

    const store = new InMemorySceneStore(root);

    const col1 = createFrameNode({ id: 'col1' });
    const col2 = createFrameNode({ id: 'col2' });
    const item = createTextNode({ id: 'item', text: 'Task 1' });

    store.insertNode(col1, 'root');
    store.insertNode(col2, 'root');
    store.insertNode(item, 'col1');

    expect(store.getChildren('col1').map(c => c.id)).toEqual(['item']);
    expect(store.getChildren('col2').map(c => c.id)).toEqual([]);

    store.moveNode('item', 'col2', 0);

    expect(store.getChildren('col1').map(c => c.id)).toEqual([]);
    expect(store.getChildren('col2').map(c => c.id)).toEqual(['item']);

    expect(store.getNode('item')?.parentId).toBe('col2');
  });

    it('should emit events when nodes are inserted, updated, moved, or deleted', () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

    const events: Array<{ type: string; nodeId: string }> = [];
    const unsubscribe = store.subscribe(event => {
      events.push({ type: event.type, nodeId: event.nodeId });
    });

    const frame = createFrameNode({ id: 'f1' });
    store.insertNode(frame, 'root');
    store.updateNode('f1', { name: 'New Name' });
    store.deleteNode('f1');

    unsubscribe();

     const frame2 = createFrameNode({ id: 'f2' });
    store.insertNode(frame2, 'root');

    expect(events).toEqual([
      { type: 'insert', nodeId: 'f1' },
      { type: 'update', nodeId: 'f1' },
      { type: 'delete', nodeId: 'f1' },
    ]);
  });

  it('should support shape nodes (rectangles, ellipses) and visual effects (strokes, shadows)', () => {
    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);

     const card = createFrameNode({
      id: 'styled-card',
      name: 'Styled Card',
      fill: '#181825',
      stroke: '#313244',
      strokeWidth: 1,
      effects: [
        {
          type: 'drop-shadow',
          color: 'rgba(0, 0, 0, 0.4)',
          offsetX: 0,
          offsetY: 8,
          blur: 16,
        },
      ],
    });

     const avatar = createShapeNode({
      id: 'avatar',
      name: 'User Avatar',
      shapeType: 'ellipse',
      width: 48,
      height: 48,
      fill: '#89B4FA',
    });

    store.insertNode(card, 'root');
    store.insertNode(avatar, 'styled-card');

    const retrievedCard = store.getNode('styled-card');
    expect(retrievedCard?.type).toBe('frame');
    if (retrievedCard?.type === 'frame') {
      expect(retrievedCard.stroke).toBe('#313244');
      expect(retrievedCard.strokeWidth).toBe(1);
      expect(retrievedCard.effects?.[0]?.type).toBe('drop-shadow');
    }

    const retrievedAvatar = store.getNode('avatar');
    expect(retrievedAvatar?.type).toBe('shape');
    if (retrievedAvatar?.type === 'shape') {
      expect(retrievedAvatar.shapeType).toBe('ellipse');
      expect(retrievedAvatar.width).toBe(48);
      expect(retrievedAvatar.height).toBe(48);
    }
  });
});
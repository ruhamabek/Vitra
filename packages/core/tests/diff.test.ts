import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createIconNode,
  createShapeNode,
  InMemorySceneStore,
} from '../src/index.js';
import { computeSceneDiff, formatSceneDiff } from '../src/diff.js';

describe('Scene Diff Engine (Visual Git AST Diffs)', () => {
  it('should detect added nodes between two scene stores', () => {
    const root1 = createDocumentNode({ id: 'root' });
    const storeA = new InMemorySceneStore(root1);

    const root2 = createDocumentNode({ id: 'root' });
    const storeB = new InMemorySceneStore(root2);
    const card = createFrameNode({ id: 'card-1', name: 'Card One' });
    storeB.insertNode(card, 'root');

    const diff = computeSceneDiff(storeA, storeB);
    expect(diff.summary.addedCount).toBe(1);
    expect(diff.summary.deletedCount).toBe(0);
    expect(diff.summary.modifiedCount).toBe(0);
    expect(diff.addedNodes[0].nodeId).toBe('card-1');

    const formatted = formatSceneDiff(diff);
    expect(formatted).toContain('[+]');
    expect(formatted).toContain('card-1');
  });

  it('should detect deleted nodes between two scene stores', () => {
    const root1 = createDocumentNode({ id: 'root' });
    const storeA = new InMemorySceneStore(root1);
    const card = createFrameNode({ id: 'card-old', name: 'Old Card' });
    storeA.insertNode(card, 'root');

    const root2 = createDocumentNode({ id: 'root' });
    const storeB = new InMemorySceneStore(root2);

    const diff = computeSceneDiff(storeA, storeB);
    expect(diff.summary.deletedCount).toBe(1);
    expect(diff.deletedNodes[0].nodeId).toBe('card-old');

    const formatted = formatSceneDiff(diff);
    expect(formatted).toContain('[-]');
    expect(formatted).toContain('card-old');
  });

  it('should detect property modifications like layout padding, gap, and fill', () => {
    const root1 = createDocumentNode({ id: 'root' });
    const storeA = new InMemorySceneStore(root1);
    const frameA = createFrameNode({
      id: 'dock',
      name: 'User Dock',
      fill: '#15171D',
      layout: {
        direction: 'horizontal',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: { top: 8, right: 10, bottom: 8, left: 10 },
      },
    });
    storeA.insertNode(frameA, 'root');

    const root2 = createDocumentNode({ id: 'root' });
    const storeB = new InMemorySceneStore(root2);
    const frameB = createFrameNode({
      id: 'dock',
      name: 'User Dock',
      fill: '#1E2030',  
      layout: {
        direction: 'horizontal',
        gap: 12,  
        alignItems: 'center',
        justifyContent: 'start', 
        padding: { top: 8, right: 10, bottom: 8, left: 10 },
      },
    });
    storeB.insertNode(frameB, 'root');

    const diff = computeSceneDiff(storeA, storeB);
    expect(diff.summary.modifiedCount).toBe(1);
    const mod = diff.modifiedNodes[0];
    expect(mod.nodeId).toBe('dock');

    const fillDiff = mod.propertyDiffs?.find((p) => p.property === 'fill');
    expect(fillDiff?.oldValue).toBe('#15171D');
    expect(fillDiff?.newValue).toBe('#1E2030');

    const gapDiff = mod.propertyDiffs?.find((p) => p.property === 'layout.gap');
    expect(gapDiff?.oldValue).toBe(8);
    expect(gapDiff?.newValue).toBe(12);

    const justifyDiff = mod.propertyDiffs?.find((p) => p.property === 'layout.justifyContent');
    expect(justifyDiff?.oldValue).toBe('space-between');
    expect(justifyDiff?.newValue).toBe('start');

    const formatted = formatSceneDiff(diff);
    expect(formatted).toContain('[~]');
    expect(formatted).toContain('layout.gap: 8 -> 12');
  });

  it('should detect text content and typography changes', () => {
    const root1 = createDocumentNode({ id: 'root' });
    const storeA = new InMemorySceneStore(root1);
    storeA.insertNode(
      createTextNode({ id: 't1', text: 'Old Title', fontSize: 14, fontWeight: 400 }),
      'root'
    );

    const root2 = createDocumentNode({ id: 'root' });
    const storeB = new InMemorySceneStore(root2);
    storeB.insertNode(
      createTextNode({ id: 't1', text: 'New Title', fontSize: 18, fontWeight: 700 }),
      'root'
    );

    const diff = computeSceneDiff(storeA, storeB);
    expect(diff.summary.modifiedCount).toBe(1);
    const mod = diff.modifiedNodes[0];
    expect(mod.propertyDiffs?.find((p) => p.property === 'text')?.newValue).toBe('New Title');
    expect(mod.propertyDiffs?.find((p) => p.property === 'fontSize')?.newValue).toBe(18);
    expect(mod.propertyDiffs?.find((p) => p.property === 'fontWeight')?.newValue).toBe(700);
  });

  it('should diff commits within a project using diffProjectCommits', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-diff-test-'));

    const { saveVitraProject, saveCommitSnapshot } = await import('../src/project.js');
    const { diffProjectCommits } = await import('../src/diff.js');

    const root = createDocumentNode({ id: 'root', name: 'Test Proj' });
    const store = new InMemorySceneStore(root);
    const card = createFrameNode({ id: 'card-1', name: 'Original Card', fill: '#111111' });
    store.insertNode(card, 'root');

    const c1Snapshot = store.exportSnapshot();

    store.updateNode('card-1', { fill: '#333333' });
    const c2Snapshot = store.exportSnapshot();

    await saveVitraProject(tempDir, {
      manifest: { name: 'Test Proj' },
      store,
      history: [
        {
          id: 'c-1',
          parentId: null,
          timestamp: new Date().toISOString(),
          author: { type: 'human', name: 'Alice' },
          intent: 'Initial commit',
          changes: { nodesAdded: ['root', 'card-1'], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'c-2',
          parentId: 'c-1',
          timestamp: new Date().toISOString(),
          author: { type: 'human', name: 'Alice' },
          intent: 'Update card fill',
          changes: { nodesAdded: [], nodesModified: ['card-1'], nodesDeleted: [], tokensModified: [] },
        },
      ],
    });

    await saveCommitSnapshot(tempDir, 'c-1', c1Snapshot);
    await saveCommitSnapshot(tempDir, 'c-2', c2Snapshot);

     const res = await diffProjectCommits(tempDir, { between: 'c-1..c-2' });
    expect(res.diff.summary.modifiedCount).toBe(1);
    expect(res.diff.modifiedNodes[0].nodeId).toBe('card-1');
    expect(res.diff.modifiedNodes[0].propertyDiffs?.find((p) => p.property === 'fill')?.newValue).toBe('#333333');

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should dynamically detect icon, shapeType, sizing, and effects diffs without hardcoded lists', () => {
    const root1 = createDocumentNode({ id: 'root' });
    const storeA = new InMemorySceneStore(root1);
    storeA.insertNode(
      createIconNode({ id: 'icon-1', icon: 'lucide:search', size: 16, color: '#888888' }),
      'root'
    );
    storeA.insertNode(
      createShapeNode({ id: 'shape-1', shapeType: 'rectangle', width: 100, height: 100 }),
      'root'
    );
    storeA.insertNode(
      createFrameNode({
        id: 'box-1',
        effects: [{ type: 'drop-shadow', blur: 4, offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.2)' }],
      }),
      'root'
    );

    const root2 = createDocumentNode({ id: 'root' });
    const storeB = new InMemorySceneStore(root2);
    storeB.insertNode(
      createIconNode({ id: 'icon-1', icon: 'lucide:x', size: 24, color: '#FFFFFF' }),
      'root'
    );
    storeB.insertNode(
      createShapeNode({ id: 'shape-1', shapeType: 'ellipse', width: 120, height: 100 }),
      'root'
    );
    storeB.insertNode(
      createFrameNode({
        id: 'box-1',
        effects: [{ type: 'drop-shadow', blur: 12, offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.5)' }],
      }),
      'root'
    );

    const diff = computeSceneDiff(storeA, storeB);
    expect(diff.summary.modifiedCount).toBe(3);

    const iconMod = diff.modifiedNodes.find((m) => m.nodeId === 'icon-1');
    expect(iconMod?.propertyDiffs?.find((p) => p.property === 'icon')?.newValue).toBe('lucide:x');
    expect(iconMod?.propertyDiffs?.find((p) => p.property === 'size')?.newValue).toBe(24);
    expect(iconMod?.propertyDiffs?.find((p) => p.property === 'color')?.newValue).toBe('#FFFFFF');

    const shapeMod = diff.modifiedNodes.find((m) => m.nodeId === 'shape-1');
    expect(shapeMod?.propertyDiffs?.find((p) => p.property === 'shapeType')?.newValue).toBe('ellipse');
    expect(shapeMod?.propertyDiffs?.find((p) => p.property === 'width')?.newValue).toBe(120);

    const boxMod = diff.modifiedNodes.find((m) => m.nodeId === 'box-1');
    expect(boxMod?.propertyDiffs?.find((p) => p.property === 'effects')).toBeDefined();
  });
});

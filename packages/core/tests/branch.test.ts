import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createDocumentNode,
  createFrameNode,
  InMemorySceneStore,
  saveVitraProject,
  saveCommitSnapshot,
} from '../src/index.js';
import {
  initRefs,
  resolveHead,
  createBranch,
  listBranches,
  deleteBranch,
  checkoutRef,
} from '../src/refs.js';

describe('Vitra Branch & Refs System (Git-Style Versioning)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-test-'));

     const root = createDocumentNode({ id: 'root', name: 'Test Proj' });
    const store = new InMemorySceneStore(root);
    const v1Card = createFrameNode({ id: 'card-1', fill: '#FFFFFF' });
    store.insertNode(v1Card, 'root');
    const snap1 = store.exportSnapshot();

    store.updateNode('card-1', { fill: '#3B82F6' });
    const snap2 = store.exportSnapshot();

    await saveVitraProject(tempDir, {
      manifest: { name: 'Test Proj' },
      store,
      history: [
        {
          id: 'c-1',
          parentId: null,
          timestamp: new Date().toISOString(),
          author: { type: 'human', name: 'Alice' },
          intent: 'Initial commit (white card)',
          changes: { nodesAdded: ['root', 'card-1'], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'c-2',
          parentId: 'c-1',
          timestamp: new Date().toISOString(),
          author: { type: 'human', name: 'Alice' },
          intent: 'Blue card',
          changes: { nodesAdded: [], nodesModified: ['card-1'], nodesDeleted: [], tokensModified: [] },
        },
      ],
    });

    await saveCommitSnapshot(tempDir, 'c-1', snap1);
    await saveCommitSnapshot(tempDir, 'c-2', snap2);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should initialize HEAD and main branch pointer', async () => {
    await initRefs(tempDir, 'c-2');

    const head = await resolveHead(tempDir);
    expect(head.type).toBe('branch');
    expect(head.branch).toBe('main');
    expect(head.commitId).toBe('c-2');

    const branches = await listBranches(tempDir);
    expect(branches.length).toBe(1);
    expect(branches[0]).toEqual({
      name: 'main',
      isCurrent: true,
      commitId: 'c-2',
    });
  });

  it('should create and list multiple branches', async () => {
    await initRefs(tempDir, 'c-2');

     await createBranch(tempDir, 'ai/experiment');

    await createBranch(tempDir, 'v1-legacy', 'c-1');

    const branches = await listBranches(tempDir);
    expect(branches.length).toBe(3);

    const names = branches.map((b) => b.name).sort();
    expect(names).toEqual(['ai/experiment', 'main', 'v1-legacy']);

    const currentBranch = branches.find((b) => b.isCurrent);
    expect(currentBranch?.name).toBe('main');

    const v1Branch = branches.find((b) => b.name === 'v1-legacy');
    expect(v1Branch?.commitId).toBe('c-1');
  });

  it('should prevent creating duplicate branches unless forced', async () => {
    await initRefs(tempDir, 'c-2');
    await createBranch(tempDir, 'feature');

    await expect(createBranch(tempDir, 'feature')).rejects.toThrow(/already exists/);
  });

  it('should checkout another branch and restore its working scene', async () => {
    await initRefs(tempDir, 'c-2');
    await createBranch(tempDir, 'v1-legacy', 'c-1');

     let head = await resolveHead(tempDir);
    expect(head.branch).toBe('main');

     const result = await checkoutRef(tempDir, 'v1-legacy');
    expect(result.branch).toBe('v1-legacy');
    expect(result.commitId).toBe('c-1');

    head = await resolveHead(tempDir);
    expect(head.branch).toBe('v1-legacy');
    expect(head.commitId).toBe('c-1');

     const rawScene = await fs.readFile(path.join(tempDir, 'scene', 'scene.json'), 'utf-8');
    const restoredScene = JSON.parse(rawScene);
    expect(restoredScene.nodes['card-1'].fill).toBe('#FFFFFF');
  });

  it('should checkout a detached commit (time-travel) and restore scene', async () => {
    await initRefs(tempDir, 'c-2');

     const result = await checkoutRef(tempDir, 'c-1');
    expect(result.type).toBe('detached');
    expect(result.commitId).toBe('c-1');

    const head = await resolveHead(tempDir);
    expect(head.type).toBe('detached');
    expect(head.branch).toBeNull();
    expect(head.commitId).toBe('c-1');

     const rawScene = await fs.readFile(path.join(tempDir, 'scene', 'scene.json'), 'utf-8');
    const restoredScene = JSON.parse(rawScene);
    expect(restoredScene.nodes['card-1'].fill).toBe('#FFFFFF');
  });

  it('should delete a branch but prevent deleting the active branch', async () => {
    await initRefs(tempDir, 'c-2');
    await createBranch(tempDir, 'feature');

    await expect(deleteBranch(tempDir, 'main')).rejects.toThrow(/Cannot delete the currently checked out branch/);

    await deleteBranch(tempDir, 'feature');
    const branches = await listBranches(tempDir);
    expect(branches.map((b) => b.name)).toEqual(['main']);
  });
});

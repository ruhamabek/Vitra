import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initRefs,
  saveVitraProject,
  loadVitraProject,
  saveCommitSnapshot,
  InMemorySceneStore,
  DocumentNode,
  FrameNode,
  TextNode,
  getStatus,
  addToIndex,
  removeFromIndex,
  restoreWorkingCanvas,
} from '../src/index.js';

describe('Vitra Staging Area & Status Engine (Git-Style Index)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  async function setupProject(): Promise<string> {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-status-test-'));
    const projectDir = path.join(tempDir, 'demo.vitra');

    const root: DocumentNode = {
      id: 'doc-root',
      type: 'document',
      name: 'Root',
      parentId: null,
      childIds: ['artboard-1'],
      visible: true,
      locked: false,
    };
    const artboard: FrameNode = {
      id: 'artboard-1',
      type: 'frame',
      name: 'Desktop',
      parentId: 'doc-root',
      childIds: ['header-text'],
      fill: '#FFFFFF',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
      visible: true,
      locked: false,
    };
    const headerText: TextNode = {
      id: 'header-text',
      type: 'text',
      name: 'Title',
      parentId: 'artboard-1',
      text: 'Original Title',
      fontSize: 20,
      fontWeight: 400,
      fill: '#000000',
      wrap: false,
      sizingHorizontal: 'hug',
      sizingVertical: 'hug',
      visible: true,
      locked: false,
    };

    const store = new InMemorySceneStore(root);
    store.insertNode(artboard, 'doc-root');
    store.insertNode(headerText, 'artboard-1');

    const tokens = {
      color: {
        primary: { $value: '#000000', $type: 'color' },
      },
    };

    const commitId = 'c-init';
    const history = [
      {
        id: commitId,
        parentId: null,
        timestamp: new Date().toISOString(),
        author: { type: 'human' as const, name: 'Tester' },
        intent: 'Initial commit',
        changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
      },
    ];

    await saveVitraProject(projectDir, {
      manifest: {
        name: 'StatusDemo',
        schemaVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        artboardIds: ['artboard-1'],
      },
      store,
      tokens,
      history,
    });

    await saveCommitSnapshot(projectDir, commitId, store.exportSnapshot());
    await initRefs(projectDir, commitId);

    return projectDir;
  }

  it('should report clean status when working canvas matches HEAD and index is empty', async () => {
    const projectDir = await setupProject();
    const status = await getStatus(projectDir);

    expect(status.branch).toBe('main');
    expect(status.staged).toHaveLength(0);
    expect(status.unstaged).toHaveLength(0);
    expect(status.untracked).toHaveLength(0);
    expect(status.isClean).toBe(true);
  });

  it('should detect unstaged changes when working canvas is modified', async () => {
    const projectDir = await setupProject();

    const project = await loadVitraProject(projectDir);
    project.store.updateNode('header-text', { text: 'Edited Working Title' });
    await saveVitraProject(projectDir, {
      manifest: project.manifest,
      store: project.store,
      tokens: project.tokens,
      history: project.history,
    });

    const status = await getStatus(projectDir);
    expect(status.isClean).toBe(false);
    expect(status.staged).toHaveLength(0);
    expect(status.unstaged).toHaveLength(1);
    expect(status.unstaged[0].nodeId).toBe('header-text');
    expect(status.unstaged[0].changeType).toBe('modified');
  });

  it('should stage specific node changes with addToIndex and update status', async () => {
    const projectDir = await setupProject();

    const project = await loadVitraProject(projectDir);
    project.store.updateNode('header-text', { text: 'Staged Title' });
    project.store.updateNode('artboard-1', { fill: '#1E1E2E' });
    await saveVitraProject(projectDir, {
      manifest: project.manifest,
      store: project.store,
      tokens: project.tokens,
      history: project.history,
    });

    await addToIndex(projectDir, ['header-text']);

    const status = await getStatus(projectDir);
    expect(status.isClean).toBe(false);

    expect(status.staged).toHaveLength(1);
    expect(status.staged[0].nodeId).toBe('header-text');

    expect(status.unstaged).toHaveLength(1);
    expect(status.unstaged[0].nodeId).toBe('artboard-1');
  });

  it('should stage all changes with addToIndex(".") including untracked nodes', async () => {
    const projectDir = await setupProject();

    const project = await loadVitraProject(projectDir);
    project.store.insertNode(
      {
        id: 'new-badge',
        type: 'text',
        name: 'Badge',
        parentId: 'artboard-1',
        text: 'NEW',
        fontSize: 12,
        fontWeight: 400,
        fill: '#000000',
        wrap: false,
        sizingHorizontal: 'hug',
        sizingVertical: 'hug',
        visible: true,
        locked: false,
      },
      'artboard-1'
    );
    await saveVitraProject(projectDir, {
      manifest: project.manifest,
      store: project.store,
      tokens: project.tokens,
      history: project.history,
    });

    let status = await getStatus(projectDir);
    expect(status.untracked).toContain('new-badge');

    await addToIndex(projectDir, ['.']);

    status = await getStatus(projectDir);
    expect(status.untracked).toHaveLength(0);
    expect(status.unstaged).toHaveLength(0);
    expect(status.staged.map((s) => s.nodeId)).toContain('new-badge');
  });

  it('should unstage nodes with removeFromIndex without losing working canvas edits', async () => {
    const projectDir = await setupProject();

    const project = await loadVitraProject(projectDir);
    project.store.updateNode('header-text', { text: 'To be unstaged' });
    await saveVitraProject(projectDir, {
      manifest: project.manifest,
      store: project.store,
      tokens: project.tokens,
      history: project.history,
    });

    await addToIndex(projectDir, ['.']);
    let status = await getStatus(projectDir);
    expect(status.staged).toHaveLength(1);

    await removeFromIndex(projectDir, ['header-text']);

    status = await getStatus(projectDir);
    expect(status.staged).toHaveLength(0);
    expect(status.unstaged).toHaveLength(1);
    expect(status.unstaged[0].nodeId).toBe('header-text');

    // Working canvas still has the edits intact!
    const projCheck = await loadVitraProject(projectDir);
    expect((projCheck.store.getNode('header-text') as TextNode)?.text).toBe('To be unstaged');
  });

  it('should restore working canvas back to HEAD or index with restoreWorkingCanvas', async () => {
    const projectDir = await setupProject();

    const project = await loadVitraProject(projectDir);
    project.store.updateNode('header-text', { text: 'Discard Me' });
    await saveVitraProject(projectDir, {
      manifest: project.manifest,
      store: project.store,
      tokens: project.tokens,
      history: project.history,
    });

    let status = await getStatus(projectDir);
    expect(status.unstaged).toHaveLength(1);

    await restoreWorkingCanvas(projectDir, ['header-text']);

    const restoredProj = await loadVitraProject(projectDir);
    expect((restoredProj.store.getNode('header-text') as TextNode)?.text).toBe('Original Title');

    status = await getStatus(projectDir);
    expect(status.isClean).toBe(true);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  writeGitObject,
  readGitObject,
  writeTreeFromStore,
  restoreStoreFromTree,
  InMemorySceneStore,
  DocumentNode,
  FrameNode,
  TextNode,
} from '../src/index.js';

describe('Vitra Content-Addressed Git Object Store (zlib deflate/inflate & SHA-1)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  async function getTempDir(): Promise<string> {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-objects-test-'));
    return tempDir;
  }

  it('should write and read a zlib-compressed blob object with SHA-1 addressing', async () => {
    const dir = await getTempDir();
    const payload = Buffer.from('Hello Vitra Visual Runtime', 'utf-8');

    const sha = await writeGitObject(dir, 'blob', payload);
    expect(sha).toHaveLength(40);

     const objectPath = path.join(dir, '.history', 'objects', sha.slice(0, 2), sha.slice(2));
    const stat = await fs.stat(objectPath);
    expect(stat.isFile()).toBe(true);

     const obj = await readGitObject(dir, sha);
    expect(obj.type).toBe('blob');
    expect(obj.content.toString('utf-8')).toBe('Hello Vitra Visual Runtime');
  });

  it('should pack, unpack, and sort binary tree objects with 20-byte raw hashes', async () => {
    const dir = await getTempDir();

     const blob1Sha = await writeGitObject(dir, 'blob', Buffer.from('title-data', 'utf-8'));
    const blob2Sha = await writeGitObject(dir, 'blob', Buffer.from('button-data', 'utf-8'));

  
    const entry1 = Buffer.concat([
      Buffer.from('100644 button\0'),
      Buffer.from(blob2Sha, 'hex'),
    ]);
    const entry2 = Buffer.concat([
      Buffer.from('100644 title\0'),
      Buffer.from(blob1Sha, 'hex'),
    ]);
    const treePayload = Buffer.concat([entry1, entry2]);

    const treeSha = await writeGitObject(dir, 'tree', treePayload);
    expect(treeSha).toHaveLength(40);

    const readTree = await readGitObject(dir, treeSha);
    expect(readTree.type).toBe('tree');
    expect(readTree.content.length).toBe(treePayload.length);
  });

  it('should serialize an entire InMemorySceneStore into content-addressed trees & blobs and restore it identically', async () => {
    const dir = await getTempDir();

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
      name: 'Desktop Preview',
      parentId: 'doc-root',
      childIds: ['nav-frame'],
      fill: '#0F172A',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
      visible: true,
      locked: false,
    };
    const navFrame: FrameNode = {
      id: 'nav-frame',
      type: 'frame',
      name: 'Navbar',
      parentId: 'artboard-1',
      childIds: ['nav-title'],
      fill: '#1E293B',
      cornerRadius: 8,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
      visible: true,
      locked: false,
    };
    const navTitle: TextNode = {
      id: 'nav-title',
      type: 'text',
      name: 'Logo',
      parentId: 'nav-frame',
      text: 'ScholarXIV',
      fontSize: 18,
      fontWeight: 400,
      fill: '#FFFFFF',
      wrap: false,
      sizingHorizontal: 'hug',
      sizingVertical: 'hug',
      visible: true,
      locked: false,
    };

    const originalStore = new InMemorySceneStore(root);
    originalStore.insertNode(artboard, 'doc-root');
    originalStore.insertNode(navFrame, 'artboard-1');
    originalStore.insertNode(navTitle, 'nav-frame');

     const rootTreeSha = await writeTreeFromStore(dir, originalStore);
    expect(rootTreeSha).toHaveLength(40);

     const restoredStore = await restoreStoreFromTree(dir, rootTreeSha);

     expect(restoredStore.getRoot().id).toBe('doc-root');
    expect(restoredStore.getNode('artboard-1')).toBeDefined();
    expect((restoredStore.getNode('artboard-1') as FrameNode).fill).toBe('#0F172A');
    expect(restoredStore.getNode('nav-frame')).toBeDefined();
    expect((restoredStore.getNode('nav-frame') as FrameNode).cornerRadius).toBe(8);
    expect(restoredStore.getNode('nav-title')).toBeDefined();
    expect((restoredStore.getNode('nav-title') as TextNode).text).toBe('ScholarXIV');
    expect((restoredStore.getNode('nav-title') as TextNode).fill).toBe('#FFFFFF');
  });

  it('should deduplicate unchanged nodes so identical nodes share the exact same SHA-1 blob', async () => {
    const dir = await getTempDir();

    const nodeA = { id: 'btn-1', type: 'frame', fill: '#10B981', cornerRadius: 8 };
    const payload = Buffer.from(JSON.stringify(nodeA), 'utf-8');

    const sha1 = await writeGitObject(dir, 'blob', payload);
    const sha2 = await writeGitObject(dir, 'blob', payload);

    expect(sha1).toBe(sha2);

     const objectPath = path.join(dir, '.history', 'objects', sha1.slice(0, 2), sha1.slice(2));
    const stat = await fs.stat(objectPath);
    expect(stat.isFile()).toBe(true);
  });
});

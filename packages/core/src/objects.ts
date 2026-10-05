import { createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { InMemorySceneStore } from './store.js';
import { SceneNode } from './nodes.js';
import { deterministicStringify, getHistoryDirSync } from './project.js';

export interface GitObject {
  type: string;
  content: Buffer;
}

export interface TreeEntry {
  mode: string;
  name: string;
  sha: string;
}

function getObjectPath(dirPath: string, sha: string): string {
  const historyDir = getHistoryDirSync(dirPath);
  return path.join(historyDir, 'objects', sha.slice(0, 2), sha.slice(2));
}

/**
 * Writes a content-addressed Git object (blob, tree, commit) compressed with zlib deflate.
 */
export async function writeGitObject(
  dirPath: string,
  type: 'blob' | 'tree' | 'commit',
  payload: Buffer
): Promise<string> {
  const header = `${type} ${payload.length}\0`;
  const store = Buffer.concat([Buffer.from(header, 'ascii'), payload]);
  const sha = createHash('sha1').update(store).digest('hex');

  const objPath = getObjectPath(dirPath, sha);

   try {
    await fs.access(objPath);
    return sha;
  } catch {
    // Object doesn't exist yet, proceed to write
  }

  const compressed = deflateSync(store);
  await fs.mkdir(path.dirname(objPath), { recursive: true });
  await fs.writeFile(objPath, compressed);

  return sha;
}

/**
 * Reads a content-addressed Git object, decompressing with zlib inflate.
 */
export async function readGitObject(dirPath: string, sha: string): Promise<GitObject> {
  const objPath = getObjectPath(dirPath, sha);
  const compressed = await fs.readFile(objPath);
  const original = inflateSync(compressed);

  const nullIndex = original.indexOf(0);
  if (nullIndex === -1) {
    throw new Error(`Corrupt git object: missing header terminator in ${sha}`);
  }

  const header = original.slice(0, nullIndex).toString('ascii');
  const type = header.split(' ')[0] ?? 'unknown';
  const content = original.slice(nullIndex + 1);

  return { type, content };
}

/**
 * Parses a binary tree object payload into structured entries.
 */
export function parseTreeEntries(content: Buffer): TreeEntry[] {
  const entries: TreeEntry[] = [];
  let i = 0;

  while (i < content.length) {
    const spaceIndex = content.indexOf(32, i);
    if (spaceIndex === -1) break;
    const mode = content.slice(i, spaceIndex).toString('ascii');
    i = spaceIndex + 1;

    const nullIndex = content.indexOf(0, i);
    if (nullIndex === -1) break;
    const name = content.slice(i, nullIndex).toString('utf-8');
    i = nullIndex + 1;

    const sha = content.slice(i, i + 20).toString('hex');
    i += 20;

    entries.push({ mode, name, sha });
  }

  return entries;
}

/**
 * Encodes structured tree entries into Git binary tree format.
 */
export function encodeTreeEntries(entries: TreeEntry[]): Buffer {
   const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const buffers: Buffer[] = [];

  for (const entry of sorted) {
    buffers.push(
      Buffer.concat([
        Buffer.from(`${entry.mode} ${entry.name}\0`, 'utf-8'),
        Buffer.from(entry.sha, 'hex'),
      ])
    );
  }

  return Buffer.concat(buffers);
}

/**
 * Serializes an entire InMemorySceneStore into content-addressed Git trees & blobs.
 * Returns the root tree SHA.
 */
export async function writeTreeFromStore(dirPath: string, store: InMemorySceneStore): Promise<string> {
  const root = store.getRoot();

  async function serializeNode(nodeId: string): Promise<string> {
    const node = store.getNode(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found in store.`);
    }

    const children = store.getChildren(nodeId);

     const propsWithoutChildren: Record<string, unknown> = { ...(node as Record<string, unknown>) };
    delete propsWithoutChildren['childIds'];
    const selfPropsBuffer = Buffer.from(deterministicStringify(propsWithoutChildren), 'utf-8');
    const selfBlobSha = await writeGitObject(dirPath, 'blob', selfPropsBuffer);

    if (children.length === 0 && node.type !== 'document') {
       return selfBlobSha;
    }

     const entries: TreeEntry[] = [
      { mode: '100644', name: '.self', sha: selfBlobSha },
    ];

    for (const child of children) {
      const childSha = await serializeNode(child.id);
      const isContainer = child.type === 'frame' || child.type === 'artboard';
      entries.push({
        mode: isContainer ? '040000' : '100644',
        name: child.id,
        sha: childSha,
      });
    }

    const treePayload = encodeTreeEntries(entries);
    return writeGitObject(dirPath, 'tree', treePayload);
  }

  return serializeNode(root.id);
}

/**
 * Reconstructs an InMemorySceneStore from content-addressed Git trees & blobs.
 */
export async function restoreStoreFromTree(dirPath: string, rootTreeSha: string): Promise<InMemorySceneStore> {
  const nodesMap: Record<string, SceneNode> = {};
  let rootId = '';

  async function restoreNode(sha: string, parentId?: string): Promise<SceneNode> {
    const obj = await readGitObject(dirPath, sha);

    if (obj.type === 'blob') {
      const parsed = JSON.parse(obj.content.toString('utf-8'));
      const isContainer = parsed.type === 'document' || parsed.type === 'frame' || parsed.type === 'artboard';
      const node: SceneNode = {
        ...parsed,
        parentId,
        ...(isContainer ? { childIds: parsed.childIds ?? [] } : {}),
      };
      nodesMap[node.id] = node;
      return node;
    }

    if (obj.type === 'tree') {
      const entries = parseTreeEntries(obj.content);
      const selfEntry = entries.find((e) => e.name === '.self');
      if (!selfEntry) {
        throw new Error(`Corrupt tree object ${sha}: missing .self properties entry.`);
      }

      const selfObj = await readGitObject(dirPath, selfEntry.sha);
      const selfProps = JSON.parse(selfObj.content.toString('utf-8'));

      const childEntries = entries.filter((e) => e.name !== '.self');
      const childIds: string[] = [];

      for (const childEntry of childEntries) {
        const childNode = await restoreNode(childEntry.sha, selfProps.id);
        childIds.push(childNode.id);
      }

      const node: SceneNode = {
        ...selfProps,
        parentId,
        childIds,
      };

      nodesMap[node.id] = node;
      return node;
    }

    throw new Error(`Unexpected object type "${obj.type}" for tree restoration.`);
  }

  const rootNode = await restoreNode(rootTreeSha);
  rootId = rootNode.id;

  if (rootNode.type !== 'document') {
    throw new Error(`Root node must be of type 'document', received '${rootNode.type}'.`);
  }

  return InMemorySceneStore.fromSnapshot({
    rootId,
    nodes: nodesMap,
  });
}

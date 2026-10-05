import { InMemorySceneStore } from './store.js';
import { SceneNode } from './nodes.js';
import { AgentCommit, findMergeBase } from './history.js';
import {
  loadVitraProject,
  saveVitraProject,
  loadCommitSnapshot,
  saveCommitSnapshot,
  deterministicStringify,
  getHistoryDirSync,
  deepEqual,
} from './project.js';
import { resolveHead, updateHeadRef } from './refs.js';

export interface PropertyConflict {
  type: 'property';
  nodeId: string;
  property: string;
  baseValue: unknown;
  ourValue: unknown;
  theirValue: unknown;
}

export interface StructuralConflict {
  type: 'structural';
  nodeId: string;
  reason: 'deleted_in_ours_modified_in_theirs' | 'deleted_in_theirs_modified_in_ours' | 'parent_conflict';
}

export interface TokenConflict {
  type: 'token';
  path: string;
  baseValue: unknown;
  ourValue: unknown;
  theirValue: unknown;
}

export type MergeConflict = PropertyConflict | StructuralConflict | TokenConflict;

export interface MergeSceneResult {
  store: InMemorySceneStore;
  conflicts: MergeConflict[];
}

export type ContainerNode = SceneNode & { childIds: string[] };

export function isContainerNode(node: SceneNode): node is ContainerNode {
  return 'childIds' in node && Array.isArray((node as { childIds?: unknown }).childIds);
}

export type TokenTree = Record<string, unknown>;

export interface MergeTokensResult {
  tokens: TokenTree;
  conflicts: TokenConflict[];
}

export interface MergeOptions {
  strategy?: 'ours' | 'theirs';
  commitMessage?: string;
  authorName?: string;
}

export interface MergeProjectResult {
  status: 'fast-forward' | 'clean' | 'conflicts' | 'already-up-to-date';
  baseCommitId: string | null;
  ourCommitId: string;
  theirCommitId: string;
  targetBranch: string;
  currentBranch: string;
  mergeCommitId?: string;
  conflicts: MergeConflict[];
  message: string;
}

function cloneNode(node: SceneNode): SceneNode {
  return JSON.parse(JSON.stringify(node));
}

function getChildIds(node: SceneNode): string[] {
  return isContainerNode(node) ? node.childIds : [];
}

function isTokenObject(val: unknown): val is { $value: unknown; [key: string]: unknown } {
  return typeof val === 'object' && val !== null && '$value' in val;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !('$value' in val);
}

/**
 * Performs a 3-way AST merge across base, ours, and theirs scene stores.
 */
export function mergeSceneStores(
  baseStore: InMemorySceneStore,
  ourStore: InMemorySceneStore,
  theirStore: InMemorySceneStore,
  options: { strategy?: 'ours' | 'theirs' } = {}
): MergeSceneResult {
  const baseNodes = baseStore.exportSnapshot().nodes;
  const ourNodes = ourStore.exportSnapshot().nodes;
  const theirNodes = theirStore.exportSnapshot().nodes;

  const conflicts: MergeConflict[] = [];
  const mergedNodes: Record<string, SceneNode> = {};

  const allIds = new Set<string>([
    ...Object.keys(baseNodes),
    ...Object.keys(ourNodes),
    ...Object.keys(theirNodes),
  ]);

  for (const id of allIds) {
    const bNode = baseNodes[id];
    const oNode = ourNodes[id];
    const tNode = theirNodes[id];

     if (bNode && oNode && tNode) {
      const merged = cloneNode(oNode);
      const allProps = new Set<string>([
        ...Object.keys(bNode),
        ...Object.keys(oNode),
        ...Object.keys(tNode),
      ]);

      for (const prop of allProps) {
        if (prop === 'id' || prop === 'type') continue;

        if (prop === 'childIds') {

          const bChildren = getChildIds(bNode);
          const oChildren = getChildIds(oNode);
          const tChildren = getChildIds(tNode);

          const mergedChildren: string[] = [...oChildren];


          for (const childId of tChildren) {
            if (!bChildren.includes(childId) && !mergedChildren.includes(childId)) {
              mergedChildren.push(childId);
            }
          }


          const filteredChildren = mergedChildren.filter((childId) => {
            if (bChildren.includes(childId) && !tChildren.includes(childId) && !theirNodes[childId]) {
              return false; // Deleted in theirs
            }
            if (bChildren.includes(childId) && !oChildren.includes(childId) && !ourNodes[childId]) {
              return false; // Deleted in ours
            }
            return true;
          });

          if (isContainerNode(merged)) {
            merged.childIds = filteredChildren;
          }
          continue;
        }

        const bRecord = bNode as Record<string, unknown>;
        const oRecord = oNode as Record<string, unknown>;
        const tRecord = tNode as Record<string, unknown>;
        const mergedRecord = merged as Record<string, unknown>;

        const bVal = bRecord[prop];
        const oVal = oRecord[prop];
        const tVal = tRecord[prop];

        if (deepEqual(oVal, bVal) && !deepEqual(tVal, bVal)) {
           mergedRecord[prop] = tVal;
        } else if (!deepEqual(oVal, bVal) && deepEqual(tVal, bVal)) {
           mergedRecord[prop] = oVal;
        } else if (deepEqual(oVal, tVal)) {
           mergedRecord[prop] = oVal;
        } else {
           conflicts.push({
            type: 'property',
            nodeId: id,
            property: prop,
            baseValue: bVal,
            ourValue: oVal,
            theirValue: tVal,
          });

          if (options.strategy === 'theirs') {
            mergedRecord[prop] = tVal;
          } else {
            mergedRecord[prop] = oVal;
          }
        }
      }

      mergedNodes[id] = merged;
      continue;
    }


    if (!bNode && oNode && !tNode) {
      mergedNodes[id] = cloneNode(oNode);
      continue;
    }

    if (!bNode && !oNode && tNode) {
      mergedNodes[id] = cloneNode(tNode);
      continue;
    }

    if (!bNode && oNode && tNode) {
      if (deepEqual(oNode, tNode)) {
        mergedNodes[id] = cloneNode(oNode);
      } else {
         conflicts.push({
          type: 'property',
          nodeId: id,
          property: '*',
          baseValue: undefined,
          ourValue: oNode,
          theirValue: tNode,
        });
        mergedNodes[id] = options.strategy === 'theirs' ? cloneNode(tNode) : cloneNode(oNode);
      }
      continue;
    }

     if (bNode && !oNode && tNode) {
      if (deepEqual(bNode, tNode)) {
         continue;
      } else {
         conflicts.push({
          type: 'structural',
          nodeId: id,
          reason: 'deleted_in_ours_modified_in_theirs',
        });
        if (options.strategy === 'theirs') {
          mergedNodes[id] = cloneNode(tNode);
        }
        continue;
      }
    }

     if (bNode && oNode && !tNode) {
      if (deepEqual(bNode, oNode)) {
         continue;
      } else {
         conflicts.push({
          type: 'structural',
          nodeId: id,
          reason: 'deleted_in_theirs_modified_in_ours',
        });
        if (options.strategy !== 'theirs') {
          mergedNodes[id] = cloneNode(oNode);
        }
        continue;
      }
    }

   }

   for (const node of Object.values(mergedNodes)) {
    if (isContainerNode(node)) {
      node.childIds = node.childIds.filter((cid: string) => Boolean(mergedNodes[cid]));
    }
  }

  const rootId = ourStore.getRoot().id;
  const store = InMemorySceneStore.fromSnapshot({
    rootId,
    nodes: mergedNodes,
  });

  return { store, conflicts };
}

/**
 * Performs a 3-way merge on design tokens dictionary.
 */
export function mergeTokens(
  baseTokens: Record<string, unknown> = {},
  ourTokens: Record<string, unknown> = {},
  theirTokens: Record<string, unknown> = {},
  options: { strategy?: 'ours' | 'theirs' } = {}
): MergeTokensResult {
  const conflicts: TokenConflict[] = [];

  function mergeRecursive(
    b: Record<string, unknown> = {},
    o: Record<string, unknown> = {},
    t: Record<string, unknown> = {},
    pathPrefix = ''
  ): Record<string, unknown> {
    const keys = new Set<string>([
      ...Object.keys(b || {}),
      ...Object.keys(o || {}),
      ...Object.keys(t || {}),
    ]);

    const result: Record<string, unknown> = {};

    for (const key of keys) {
      const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      const bVal = b[key];
      const oVal = o[key];
      const tVal = t[key];

      if (isRecord(oVal) || isRecord(tVal) || isRecord(bVal)) {
        result[key] = mergeRecursive(
          (isRecord(bVal) ? bVal : {}) as Record<string, unknown>,
          (isRecord(oVal) ? oVal : {}) as Record<string, unknown>,
          (isRecord(tVal) ? tVal : {}) as Record<string, unknown>,
          currentPath
        );
        continue;
      }

      if (deepEqual(oVal, bVal) && !deepEqual(tVal, bVal)) {
        result[key] = tVal;
      } else if (!deepEqual(oVal, bVal) && deepEqual(tVal, bVal)) {
        result[key] = oVal;
      } else if (deepEqual(oVal, tVal)) {
        result[key] = oVal;
      } else {
        const valPath = `${currentPath}.$value`;
        const isLeafToken = isTokenObject(oVal);
        conflicts.push({
          type: 'token',
          path: isLeafToken ? valPath : currentPath,
          baseValue: isTokenObject(bVal) ? bVal.$value : bVal,
          ourValue: isTokenObject(oVal) ? oVal.$value : oVal,
          theirValue: isTokenObject(tVal) ? tVal.$value : tVal,
        });

        result[key] = options.strategy === 'theirs' ? tVal : oVal;
      }
    }

    return result;
  }

  const merged = mergeRecursive(baseTokens, ourTokens, theirTokens);
  return { tokens: merged as TokenTree, conflicts };
}

/**
 * End-to-end branch merge orchestrator.
 */
export async function mergeProjectBranches(
  dirPath: string,
  targetBranch: string,
  options: MergeOptions = {}
): Promise<MergeProjectResult> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const project = await loadVitraProject(dirPath);
  const head = await resolveHead(dirPath);

  if (head.type !== 'branch' || !head.branch) {
    throw new Error('Cannot merge: Working project is in detached HEAD state. Please checkout a branch first.');
  }

  const currentBranch = head.branch;
  if (currentBranch === targetBranch) {
    return {
      status: 'already-up-to-date',
      baseCommitId: head.commitId,
      ourCommitId: head.commitId || '',
      theirCommitId: head.commitId || '',
      targetBranch,
      currentBranch,
      conflicts: [],
      message: 'Already up to date.',
    };
  }

  const historyDir = getHistoryDirSync(dirPath);

   const targetBranchPath = path.join(historyDir, 'refs', 'heads', targetBranch);
  let theirCommitId = '';
  try {
    theirCommitId = (await fs.readFile(targetBranchPath, 'utf-8')).trim();
  } catch {
    throw new Error(`error: branch "${targetBranch}" not found.`);
  }

  const ourCommitId = head.commitId;
  if (!ourCommitId) {
    throw new Error(`Cannot merge: Active branch "${currentBranch}" has no commits.`);
  }

   const baseCommitId = findMergeBase(project.history, ourCommitId, theirCommitId);

   if (baseCommitId === theirCommitId) {
    return {
      status: 'already-up-to-date',
      baseCommitId,
      ourCommitId,
      theirCommitId,
      targetBranch,
      currentBranch,
      conflicts: [],
      message: 'Already up to date.',
    };
  }

  if (baseCommitId === ourCommitId) {
     const targetRefPath = path.join(historyDir, 'refs', 'heads', currentBranch);
    await fs.writeFile(targetRefPath, `${theirCommitId}\n`, 'utf-8');

     const targetSnapshot = await loadCommitSnapshot(dirPath, theirCommitId);
    if (targetSnapshot) {
      const scenePath = path.join(dirPath, 'scene', 'scene.json');
      await fs.writeFile(scenePath, deterministicStringify(targetSnapshot), 'utf-8');
    }

    return {
      status: 'fast-forward',
      baseCommitId,
      ourCommitId,
      theirCommitId,
      targetBranch,
      currentBranch,
      conflicts: [],
      message: `Fast-forward: ${ourCommitId.slice(0, 7)} -> ${theirCommitId.slice(0, 7)}`,
    };
  }

   if (!baseCommitId) {
    throw new Error(`Cannot merge unrelated histories: no common ancestor found between "${currentBranch}" and "${targetBranch}".`);
  }

  const baseSnapshot = await loadCommitSnapshot(dirPath, baseCommitId);
  const ourSnapshot = await loadCommitSnapshot(dirPath, ourCommitId);
  const theirSnapshot = await loadCommitSnapshot(dirPath, theirCommitId);

  if (!baseSnapshot || !ourSnapshot || !theirSnapshot) {
    throw new Error('Failed to load snapshots for 3-way merge.');
  }

  const baseStore = InMemorySceneStore.fromSnapshot(baseSnapshot);
  const ourStore = InMemorySceneStore.fromSnapshot(ourSnapshot);
  const theirStore = InMemorySceneStore.fromSnapshot(theirSnapshot);

  const sceneMerge = mergeSceneStores(baseStore, ourStore, theirStore, { strategy: options.strategy });
  const tokenMerge = mergeTokens(project.tokens, project.tokens, project.tokens, { strategy: options.strategy });
  const allConflicts = [...sceneMerge.conflicts, ...tokenMerge.conflicts];

  if (allConflicts.length > 0 && !options.strategy) {
    return {
      status: 'conflicts',
      baseCommitId,
      ourCommitId,
      theirCommitId,
      targetBranch,
      currentBranch,
      conflicts: allConflicts,
      message: `Automatic merge failed: ${allConflicts.length} conflict(s) detected. Fix conflicts or specify --strategy.`,
    };
  }

   const mergeCommitId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const mergeCommit: AgentCommit = {
    id: mergeCommitId,
    parentId: ourCommitId,
    parentIds: [ourCommitId, theirCommitId],
    timestamp: new Date().toISOString(),
    author: {
      type: 'human',
      name: options.authorName ?? 'Vitra Merge Engine',
      client: 'vitra-cli',
    },
    intent: options.commitMessage ?? `Merge branch '${targetBranch}' into ${currentBranch}`,
    changes: {
      nodesAdded: [],
      nodesModified: [],
      nodesDeleted: [],
      tokensModified: [],
    },
  };

   const treeSha = await saveCommitSnapshot(dirPath, mergeCommitId, sceneMerge.store.exportSnapshot());
  mergeCommit.treeSha = treeSha || undefined;

  const updatedHistory = [...project.history, mergeCommit];

   await saveVitraProject(dirPath, {
    manifest: {
      ...project.manifest,
      name: project.manifest.name,
      updatedAt: new Date().toISOString(),
    },
    store: sceneMerge.store,
    tokens: tokenMerge.tokens,
    history: updatedHistory,
  });

   await updateHeadRef(dirPath, mergeCommitId);

  return {
    status: 'clean',
    baseCommitId,
    ourCommitId,
    theirCommitId,
    targetBranch,
    currentBranch,
    mergeCommitId,
    conflicts: allConflicts,
    message: `Merge made by 3-way visual AST strategy (${mergeCommitId}).`,
  };
}

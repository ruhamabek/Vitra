import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { InMemorySceneStore } from './store.js';
import { SceneNode } from './nodes.js';
import {
  loadVitraProject,
  saveVitraProject,
  loadCommitSnapshot,
  deterministicStringify,
  getHistoryDirSync,
  deepEqual,
} from './project.js';
import { resolveHead } from './refs.js';
import { computeSceneDiff } from './diff.js';

export interface StagingIndex {
  updatedAt: string;
  snapshot: {
    rootId: string;
    nodes: Record<string, SceneNode>;
  };
  tokens?: Record<string, unknown>;
}

export interface StatusItem {
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  changeType: 'added' | 'modified' | 'deleted';
  summary?: string;
}

export interface ProjectStatus {
  branch: string;
  commitId: string | null;
  isClean: boolean;
  staged: StatusItem[];
  unstaged: StatusItem[];
  untracked: string[];
  tokensStaged: boolean;
  tokensUnstaged: boolean;
}

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

function isContainerNode(node: SceneNode): node is SceneNode & { childIds: string[] } {
  return 'childIds' in node && Array.isArray((node as { childIds?: unknown }).childIds);
}

function getIndexFilePath(dirPath: string): string {
  const historyDir = getHistoryDirSync(dirPath);
  return path.join(historyDir, 'index.json');
}

/**
 * Loads the current staging index, or falls back to the HEAD snapshot.
 */
export async function loadStagingIndex(dirPath: string): Promise<{ index: StagingIndex; isExplicit: boolean }> {
  const indexPath = getIndexFilePath(dirPath);
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    return { index: JSON.parse(raw), isExplicit: true };
  } catch {
    const head = await resolveHead(dirPath);
    let snapshot: { rootId: string; nodes: Record<string, SceneNode> } | null = null;
    let tokens: Record<string, unknown> | undefined;

    if (head.commitId) {
      snapshot = await loadCommitSnapshot(dirPath, head.commitId);
    }

    if (!snapshot) {
      const project = await loadVitraProject(dirPath);
      snapshot = project.store.exportSnapshot();
      tokens = project.tokens;
    } else {
      const project = await loadVitraProject(dirPath);
      tokens = project.tokens;
    }

    return {
      index: {
        updatedAt: new Date().toISOString(),
        snapshot,
        tokens,
      },
      isExplicit: false,
    };
  }
}

/**
 * Persists the staging index to history/index.json.
 */
export async function saveStagingIndex(dirPath: string, index: StagingIndex): Promise<void> {
  const indexPath = getIndexFilePath(dirPath);
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, deterministicStringify(index), 'utf-8');
}

/**
 * Clears the staging index file (e.g. after a commit).
 */
export async function clearStagingIndex(dirPath: string): Promise<void> {
  const indexPath = getIndexFilePath(dirPath);
  try {
    await fs.rm(indexPath, { force: true });
  } catch {
    // Ignore
  }
}

/**
 * Collects a node and all of its descendants recursively.
 */
function collectSubtree(store: InMemorySceneStore, nodeId: string): SceneNode[] {
  const result: SceneNode[] = [];
  const node = store.getNode(nodeId);
  if (!node) return result;

  function walk(current: SceneNode) {
    result.push(current);
    const children = store.getChildren(current.id);
    for (const child of children) {
      walk(child);
    }
  }

  walk(node);
  return result;
}

/**
 * Stages working canvas nodes and/or tokens into the staging index.
 */
export async function addToIndex(dirPath: string, targets: string[]): Promise<void> {
  const project = await loadVitraProject(dirPath);
  const { index } = await loadStagingIndex(dirPath);

  if (targets.includes('.') || targets.includes('-A') || targets.includes('--all')) {
    index.snapshot = project.store.exportSnapshot();
    index.tokens = clone(project.tokens);
    index.updatedAt = new Date().toISOString();
    await saveStagingIndex(dirPath, index);
    return;
  }

  const workingStore = project.store;
  for (const targetId of targets) {
    const workingNode = workingStore.getNode(targetId);
    if (workingNode) {
      const subtree = collectSubtree(workingStore, targetId);
      for (const node of subtree) {
        index.snapshot.nodes[node.id] = clone(node);
      }

      if (workingNode.parentId) {
        const parentNode = index.snapshot.nodes[workingNode.parentId];
        if (parentNode && isContainerNode(parentNode) && !parentNode.childIds.includes(targetId)) {
          parentNode.childIds.push(targetId);
        }
      }
    } else {
      if (index.snapshot.nodes[targetId]) {
        const oldParentId = index.snapshot.nodes[targetId]?.parentId;
        delete index.snapshot.nodes[targetId];

        if (oldParentId) {
          const parentNode = index.snapshot.nodes[oldParentId];
          if (parentNode && isContainerNode(parentNode)) {
            parentNode.childIds = parentNode.childIds.filter((cid: string) => cid !== targetId);
          }
        }
      }
    }
  }

  index.updatedAt = new Date().toISOString();
  await saveStagingIndex(dirPath, index);
}

/**
 * Unstages nodes from the staging index (reverts index entries back to HEAD state).
 */
export async function removeFromIndex(dirPath: string, targets: string[]): Promise<void> {
  const head = await resolveHead(dirPath);
  let headSnapshot: { rootId: string; nodes: Record<string, SceneNode> } | null = null;
  if (head.commitId) {
    headSnapshot = await loadCommitSnapshot(dirPath, head.commitId);
  }

  if (!headSnapshot) {
    const project = await loadVitraProject(dirPath);
    headSnapshot = project.store.exportSnapshot();
  }

  const { index, isExplicit } = await loadStagingIndex(dirPath);
  if (!isExplicit) return; 

  if (targets.includes('.')) {
    await clearStagingIndex(dirPath);
    return;
  }

  for (const targetId of targets) {
    const headNode = headSnapshot.nodes[targetId];
    if (headNode) {
      index.snapshot.nodes[targetId] = clone(headNode);
    } else {
      delete index.snapshot.nodes[targetId];
    }
  }

  index.updatedAt = new Date().toISOString();
  await saveStagingIndex(dirPath, index);
}

/**
 * Reverts working canvas node(s) back to Index state (or HEAD state).
 */
export async function restoreWorkingCanvas(
  dirPath: string,
  targets: string[],
  options: { staged?: boolean } = {}
): Promise<void> {
  if (options.staged) {
    await removeFromIndex(dirPath, targets);
    return;
  }

  const { index } = await loadStagingIndex(dirPath);
  const project = await loadVitraProject(dirPath);

  if (targets.includes('.')) {
    const store = InMemorySceneStore.fromSnapshot(index.snapshot);
    await saveVitraProject(dirPath, {
      manifest: {
        ...project.manifest,
        name: project.manifest.name,
      },
      store,
      tokens: index.tokens ?? project.tokens,
      history: project.history,
    });
    return;
  }

  const restoreSubtree = (nodeId: string) => {
    const idxNode = index.snapshot.nodes[nodeId];
    if (!idxNode) {
      try {
        project.store.deleteNode(nodeId);
      } catch {
        // Ignore
      }
      return;
    }

    const clonedNode = clone(idxNode);

    if (project.store.getNode(nodeId)) {
      project.store.updateNode(nodeId, clonedNode);
    } else {
      const parentId = idxNode.parentId ?? project.store.getRoot().id;
      try {
        project.store.insertNode(clonedNode, parentId);
      } catch {
        project.store.insertNode(clonedNode, project.store.getRoot().id);
      }
    }

    if (isContainerNode(idxNode)) {
      for (const cid of idxNode.childIds) {
        restoreSubtree(cid);
      }
    }
  };

  for (const targetId of targets) {
    restoreSubtree(targetId);
  }

  await saveVitraProject(dirPath, {
    manifest: {
      ...project.manifest,
      name: project.manifest.name,
    },
    store: project.store,
    tokens: project.tokens,
    history: project.history,
  });
}

/**
 * Computes 3-way status: Staged vs Unstaged vs Untracked.
 */
export async function getStatus(dirPath: string): Promise<ProjectStatus> {
  const head = await resolveHead(dirPath);
  const headCommitId = head.commitId;

  let headSnapshot: { rootId: string; nodes: Record<string, SceneNode> } | null = null;
  if (headCommitId) {
    headSnapshot = await loadCommitSnapshot(dirPath, headCommitId);
  }

  const project = await loadVitraProject(dirPath);
  if (!headSnapshot) {
    headSnapshot = project.store.exportSnapshot();
  }

  const headStore = InMemorySceneStore.fromSnapshot(headSnapshot);
  const { index, isExplicit } = await loadStagingIndex(dirPath);
  const indexStore = InMemorySceneStore.fromSnapshot(index.snapshot);
  const workingStore = project.store;

   const staged: StatusItem[] = [];
  if (isExplicit) {
    const headVsIndex = computeSceneDiff(headStore, indexStore);
    for (const n of headVsIndex.addedNodes) {
      staged.push({ nodeId: n.nodeId, nodeType: n.nodeType, nodeName: n.nodeName, changeType: 'added' });
    }
    for (const n of headVsIndex.modifiedNodes) {
      staged.push({ nodeId: n.nodeId, nodeType: n.nodeType, nodeName: n.nodeName, changeType: 'modified' });
    }
    for (const n of headVsIndex.deletedNodes) {
      staged.push({ nodeId: n.nodeId, nodeType: n.nodeType, nodeName: n.nodeName, changeType: 'deleted' });
    }
  }

  const unstaged: StatusItem[] = [];
  const untracked: string[] = [];

  const indexVsWorking = computeSceneDiff(indexStore, workingStore);

  for (const n of indexVsWorking.addedNodes) {
    if (!headSnapshot.nodes[n.nodeId] && !index.snapshot.nodes[n.nodeId]) {
      untracked.push(n.nodeId);
    } else {
      unstaged.push({ nodeId: n.nodeId, nodeType: n.nodeType, nodeName: n.nodeName, changeType: 'added' });
    }
  }

  for (const n of indexVsWorking.modifiedNodes) {
    unstaged.push({ nodeId: n.nodeId, nodeType: n.nodeType, nodeName: n.nodeName, changeType: 'modified' });
  }

  for (const n of indexVsWorking.deletedNodes) {
    unstaged.push({ nodeId: n.nodeId, nodeType: n.nodeType, nodeName: n.nodeName, changeType: 'deleted' });
  }

  const tokensStaged = isExplicit && !deepEqual(project.tokens, index.tokens);
  const tokensUnstaged = !deepEqual(index.tokens, project.tokens);

  const isClean = staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && !tokensStaged && !tokensUnstaged;

  return {
    branch: head.branch ?? 'HEAD',
    commitId: headCommitId,
    isClean,
    staged,
    unstaged,
    untracked,
    tokensStaged,
    tokensUnstaged,
  };
}

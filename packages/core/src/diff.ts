import { InMemorySceneStore, SceneSnapshot } from './store.js';
import { SceneNode } from './nodes.js';
import { AgentCommit } from './history.js';
import { loadVitraProject, loadCommitSnapshot } from './project.js';

const EXCLUDED_ROOT_PROPERTIES = new Set(['id', 'type', 'parentId', 'childIds']);

export interface PropertyDiff {
  property: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface NodeDiff {
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  changeType: 'added' | 'deleted' | 'modified';
  propertyDiffs?: PropertyDiff[];
}

export interface SceneDiff {
  addedNodes: NodeDiff[];
  deletedNodes: NodeDiff[];
  modifiedNodes: NodeDiff[];
  summary: {
    addedCount: number;
    deletedCount: number;
    modifiedCount: number;
  };
}

function getAllNodes(store: InMemorySceneStore): Map<string, SceneNode> {
  const map = new Map<string, SceneNode>();
  const root = store.getRoot();
  
  function walk(node: SceneNode) {
    map.set(node.id, node);
    const children = store.getChildren(node.id);
    for (const child of children) {
      walk(child);
    }
  }

  walk(root);
  return map;
}


function compareObjects(
  objA: Record<string, unknown> | undefined,
  objB: Record<string, unknown> | undefined,
  prefix = ''
): PropertyDiff[] {
  if (!objA && !objB) return [];
  if (!objA && objB) {
    return [{ property: prefix, oldValue: undefined, newValue: objB }];
  }
  if (objA && !objB) {
    return [{ property: prefix, oldValue: objA, newValue: undefined }];
  }

  const diffs: PropertyDiff[] = [];
  const keysA = Object.keys(objA || {});
  const keysB = Object.keys(objB || {});
  const allKeys = Array.from(new Set([...keysA, ...keysB])).sort();

  for (const key of allKeys) {
    if (!prefix && EXCLUDED_ROOT_PROPERTIES.has(key)) {
      continue;
    }

    const propPath = prefix ? `${prefix}.${key}` : key;
    const valA = objA?.[key];
    const valB = objB?.[key];

    if (valA === valB) {
      continue;
    }

    const isObjA = typeof valA === 'object' && valA !== null;
    const isObjB = typeof valB === 'object' && valB !== null;

    if (Array.isArray(valA) || Array.isArray(valB)) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        diffs.push({ property: propPath, oldValue: valA, newValue: valB });
      }
    } else if (isObjA && isObjB) {
      diffs.push(...compareObjects(valA as Record<string, unknown>, valB as Record<string, unknown>, propPath));
    } else {
      diffs.push({ property: propPath, oldValue: valA, newValue: valB });
    }
  }

  return diffs;
}

function compareNodes(nodeA: SceneNode, nodeB: SceneNode): PropertyDiff[] {
  return compareObjects(
    nodeA as Record<string, unknown>,
    nodeB as Record<string, unknown>
  );
}

export function computeSceneDiff(storeA: InMemorySceneStore, storeB: InMemorySceneStore): SceneDiff {
  const mapA = getAllNodes(storeA);
  const mapB = getAllNodes(storeB);

  const addedNodes: NodeDiff[] = [];
  const deletedNodes: NodeDiff[] = [];
  const modifiedNodes: NodeDiff[] = [];

  // Detect added and modified
  for (const [id, nodeB] of mapB.entries()) {
    if (!mapA.has(id)) {
      addedNodes.push({
        nodeId: id,
        nodeType: nodeB.type,
        nodeName: nodeB.name,
        changeType: 'added',
      });
    } else {
      const nodeA = mapA.get(id)!;
      const propertyDiffs = compareNodes(nodeA, nodeB);
      if (propertyDiffs.length > 0) {
        modifiedNodes.push({
          nodeId: id,
          nodeType: nodeB.type,
          nodeName: nodeB.name,
          changeType: 'modified',
          propertyDiffs,
        });
      }
    }
  }

  // Detect deleted
  for (const [id, nodeA] of mapA.entries()) {
    if (!mapB.has(id)) {
      deletedNodes.push({
        nodeId: id,
        nodeType: nodeA.type,
        nodeName: nodeA.name,
        changeType: 'deleted',
      });
    }
  }

  return {
    addedNodes,
    deletedNodes,
    modifiedNodes,
    summary: {
      addedCount: addedNodes.length,
      deletedCount: deletedNodes.length,
      modifiedCount: modifiedNodes.length,
    },
  };
}

export function formatSceneDiff(diff: SceneDiff): string {
  const lines: string[] = [];
  lines.push(
    `Scene Diff Summary: +${diff.summary.addedCount} added, ~${diff.summary.modifiedCount} modified, -${diff.summary.deletedCount} deleted`
  );

  for (const node of diff.addedNodes) {
    lines.push(`  [+] ${node.nodeType}: ${node.nodeName ?? node.nodeId} (id: "${node.nodeId}")`);
  }

  for (const node of diff.modifiedNodes) {
    lines.push(`  [~] ${node.nodeType}: ${node.nodeName ?? node.nodeId} (id: "${node.nodeId}")`);
    if (node.propertyDiffs) {
      for (const p of node.propertyDiffs) {
        lines.push(`      ~ ${p.property}: ${JSON.stringify(p.oldValue)} -> ${JSON.stringify(p.newValue)}`);
      }
    }
  }

  for (const node of diff.deletedNodes) {
    lines.push(`  [-] ${node.nodeType}: ${node.nodeName ?? node.nodeId} (id: "${node.nodeId}")`);
  }

  return lines.join('\n');
}

export interface IntraDiffOptions {
  commit?: string;
  between?: string;
}

export interface DiffResult {
  diff: SceneDiff;
  title: string;
}

function resolveCommit(history: AgentCommit[], ref: string): AgentCommit | null {
  const trimmed = ref.trim();
  if (trimmed.toUpperCase() === 'HEAD') {
    return history.length > 0 ? (history[history.length - 1] ?? null) : null;
  }
  const headMatch = trimmed.match(/^HEAD~(\d+)$/i);
  if (headMatch && headMatch[1]) {
    const offset = parseInt(headMatch[1], 10);
    const idx = history.length - 1 - offset;
    return idx >= 0 ? (history[idx] ?? null) : null;
  }
  return history.find((c) => c.id === trimmed || c.id.startsWith(trimmed)) ?? null;
}

export async function diffProjectCommits(
  dirPath: string,
  options: IntraDiffOptions = {}
): Promise<DiffResult> {
  const project = await loadVitraProject(dirPath);
  const history = project.history;

  if (history.length === 0) {
    throw new Error(`Project at "${dirPath}" has no recorded commit history.`);
  }

  let refA = '';
  let refB = '';

  const range = options.between || options.commit;
  if (range && range.includes('..')) {
    const parts = range.split('..');
    refA = parts[0] ?? '';
    refB = parts[1] ?? '';
  } else if (options.commit) {
    refA = options.commit;
    refB = 'working';
  } else {
   
    const headCommit = history[history.length - 1];
    if (!headCommit) {
      throw new Error('No HEAD commit found in history.');
    }
    const headSnapshot = await loadCommitSnapshot(dirPath, headCommit.id);

    if (headSnapshot) {
      const headStore = InMemorySceneStore.fromSnapshot(headSnapshot);
      const workingDiff = computeSceneDiff(headStore, project.store);
      const totalChanges = workingDiff.summary.addedCount + workingDiff.summary.modifiedCount + workingDiff.summary.deletedCount;

      if (totalChanges > 0) {
        return {
          diff: workingDiff,
          title: `Diff: Working Canvas vs HEAD (${headCommit.id}: "${headCommit.intent}")`,
        };
      }
    }

     if (history.length > 1) {
      const parentCommit = history[history.length - 2];
      refA = parentCommit ? parentCommit.id : headCommit.id;
      refB = headCommit.id;
    } else {
      refA = headCommit.id;
      refB = 'working';
    }
  }

  const commitA = resolveCommit(history, refA);
  if (!commitA) {
    throw new Error(`Could not resolve commit reference: "${refA}"`);
  }

  let snapshotB: SceneSnapshot | null = null;
  let titleB = '';

  if (refB === 'working' || !refB) {
    snapshotB = project.store.exportSnapshot();
    titleB = 'Working Canvas';
  } else {
    const commitB = resolveCommit(history, refB);
    if (!commitB) {
      throw new Error(`Could not resolve commit reference: "${refB}"`);
    }
    snapshotB = await loadCommitSnapshot(dirPath, commitB.id);
    if (!snapshotB) {
      throw new Error(`Snapshot for commit "${commitB.id}" is not available on disk.`);
    }
    titleB = `${commitB.id} ("${commitB.intent}")`;
  }

  let snapshotA = await loadCommitSnapshot(dirPath, commitA.id);
  if (!snapshotA) {
    if (commitA.id === 'c-init') {
      snapshotA = snapshotB;
    } else {
      throw new Error(`Snapshot for commit "${commitA.id}" is not available on disk.`);
    }
  }

  const storeA = InMemorySceneStore.fromSnapshot(snapshotA);
  const storeB = InMemorySceneStore.fromSnapshot(snapshotB);
  const diff = computeSceneDiff(storeA, storeB);

  return {
    diff,
    title: `Diff: [${commitA.id}: "${commitA.intent}"] -> [${titleB}]`,
  };
}


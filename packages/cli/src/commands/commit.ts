import * as path from 'node:path';
import {
  loadVitraProject,
  saveVitraProject,
  saveCommitSnapshot,
  loadCommitSnapshot,
  computeSceneDiff,
  InMemorySceneStore,
  AgentCommit,
  resolveHead,
  updateHeadRef,
  loadStagingIndex,
  clearStagingIndex,
} from '@vitra/core';

export interface CommitOptions {
  message: string;
  authorName?: string;
  model?: string;
  client?: string;
  type?: 'agent' | 'human';
  rationale?: string;
}

export async function commitProject(targetDir: string, options: CommitOptions): Promise<AgentCommit> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const project = await loadVitraProject(dirPath);

  const headRef = await resolveHead(dirPath);
  const parentId = headRef.commitId;
  const commitId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const { index, isExplicit } = await loadStagingIndex(dirPath);
  const commitStore = isExplicit ? InMemorySceneStore.fromSnapshot(index.snapshot) : project.store;
  const commitTokens = isExplicit && index.tokens ? index.tokens : project.tokens;

  let changes = {
    nodesAdded: [] as string[],
    nodesModified: [] as string[],
    nodesDeleted: [] as string[],
    tokensModified: [] as string[],
  };

  if (parentId) {
    const parentSnapshot = await loadCommitSnapshot(dirPath, parentId);
    if (parentSnapshot) {
      const parentStore = InMemorySceneStore.fromSnapshot(parentSnapshot);
      const diff = computeSceneDiff(parentStore, commitStore);
      changes = {
        nodesAdded: diff.addedNodes.map((n) => n.nodeId),
        nodesModified: diff.modifiedNodes.map((m) => m.nodeId),
        nodesDeleted: diff.deletedNodes.map((d) => d.nodeId),
        tokensModified: [],
      };
    }
  }

  const newCommit: AgentCommit = {
    id: commitId,
    parentId,
    timestamp: new Date().toISOString(),
    author: {
      type: options.type ?? (options.model ? 'agent' : 'human'),
      name: options.authorName ?? (options.model ? options.model : 'Human Developer'),
      model: options.model,
      client: options.client ?? 'vitra-cli',
    },
    intent: options.message,
    rationale: options.rationale,
    changes,
  };

   const treeSha = await saveCommitSnapshot(dirPath, commitId, commitStore.exportSnapshot());
  newCommit.treeSha = treeSha || undefined;

  const updatedHistory = [...project.history, newCommit];

   await saveVitraProject(dirPath, {
    manifest: {
      ...project.manifest,
      updatedAt: new Date().toISOString(),
    },
    store: project.store,
    tokens: commitTokens,
    history: updatedHistory,
  });

   await updateHeadRef(dirPath, commitId);

   if (isExplicit) {
    await clearStagingIndex(dirPath);
  }

  return newCommit;
}


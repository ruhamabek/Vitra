import {
  listBranches,
  resolveHead,
  loadVitraProject,
  checkoutRef,
  loadCommitSnapshot,
  diffProjectCommits,
  computeSceneDiff,
  InMemorySceneStore,
  type ISceneStore,
} from '@vitra/core';
import type { GitCommitSummary, SyncMessage } from './types.js';

export interface SyncServerContext {
  getStore(): ISceneStore;
  setStore(newStore: ISceneStore): void;
}

export async function getGitStatusMessage(projectPath?: string): Promise<SyncMessage> {
  if (!projectPath) {
    return { type: 'git_status', branches: [], currentBranch: 'main', commits: [], headIndex: -1 };
  }

  const [branchInfos, headInfo, project] = await Promise.all([
    listBranches(projectPath),
    resolveHead(projectPath),
    loadVitraProject(projectPath),
  ]);

  const commits: GitCommitSummary[] = project.history.map((c) => ({
    hash: c.id,
    message: c.intent,
    author: c.author?.name || 'agent',
    timestamp: c.timestamp,
  }));

  const headCommitId = headInfo.commitId || '';
  const headIndex = commits.findIndex((c) => c.hash === headCommitId);
  const currentBranch = headInfo.branch || 'main';
  const branches = branchInfos.map((b) => b.name);

  return {
    type: 'git_status',
    branches,
    currentBranch,
    commits,
    headIndex: headIndex === -1 ? commits.length - 1 : headIndex,
  };
}

export async function handleGitMessage(
  msg: SyncMessage,
  projectPath: string | undefined,
  context: SyncServerContext,
  sendMessage: (response: SyncMessage) => void
): Promise<void> {
  if (msg.type === 'git_status_request') {
    try {
      const statusMsg = await getGitStatusMessage(projectPath);
      sendMessage(statusMsg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncServer] git_status_request error:', message);
    }
    return;
  }

  if (!projectPath) return;

  if (msg.type === 'checkout_branch') {
    try {
      await checkoutRef(projectPath, msg.branch);
      const reloaded = await loadVitraProject(projectPath);
      context.setStore(reloaded.store);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncServer] checkout_branch error:', message);
    }
    return;
  }

  if (msg.type === 'checkout_commit') {
    try {
      const snapshot = await loadCommitSnapshot(projectPath, msg.commitId);
      if (snapshot) {
        const newStore = InMemorySceneStore.fromSnapshot(snapshot);
        context.setStore(newStore);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncServer] checkout_commit error:', message);
    }
    return;
  }

  if (msg.type === 'restore_head') {
    try {
      const project = await loadVitraProject(projectPath);
      context.setStore(project.store);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncServer] restore_head error:', message);
    }
    return;
  }

  if (msg.type === 'git_diff_request') {
    try {
      if (msg.commitA && msg.commitB) {
        const result = await diffProjectCommits(projectPath, {
          between: `${msg.commitA}..${msg.commitB}`,
        });
        const diff = result.diff;
        sendMessage({
          type: 'git_diff_response',
          added: diff.addedNodes.map((n) => n.nodeId),
          modified: diff.modifiedNodes.map((n) => n.nodeId),
          deleted: diff.deletedNodes.map((n) => n.nodeId),
          title: result.title,
        });
        return;
      }

       const headInfo = await resolveHead(projectPath);
      const headCommitId = headInfo.commitId;
      if (!headCommitId) {
        sendMessage({ type: 'git_diff_response', added: [], modified: [], deleted: [] });
        return;
      }

      const headSnapshot = await loadCommitSnapshot(projectPath, headCommitId);
      if (!headSnapshot) {
        sendMessage({ type: 'git_diff_response', added: [], modified: [], deleted: [] });
        return;
      }

      const headStore = InMemorySceneStore.fromSnapshot(headSnapshot);
      const liveStore = (context.getStore() as InMemorySceneStore) || (await loadVitraProject(projectPath)).store;
      const diff = computeSceneDiff(headStore, liveStore);

      sendMessage({
        type: 'git_diff_response',
        added: diff.addedNodes.map((n) => n.nodeId),
        modified: diff.modifiedNodes.map((n) => n.nodeId),
        deleted: diff.deletedNodes.map((n) => n.nodeId),
        title: `Visual Diff: Canvas vs HEAD (${headCommitId})`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncServer] git_diff_request error:', message);
    }
    return;
  }
}

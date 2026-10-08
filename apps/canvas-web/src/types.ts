import { DocumentNode, SceneNode, SceneEvent } from '@vitra/core';

export interface GitCommitSummary {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  text: string;
  time: string;
}

export interface GitDiffResult {
  added: string[];
  modified: string[];
  deleted: string[];
}

export type SyncMessage =
  | { type: 'snapshot'; root: DocumentNode; nodes: Record<string, SceneNode> }
  | { type: 'event'; event: SceneEvent }
  | { type: 'mutation'; event: SceneEvent }
  | { type: 'git_status_request' }
  | {
      type: 'git_status';
      branches: string[];
      currentBranch: string;
      commits: GitCommitSummary[];
      headIndex: number;
    }
  | { type: 'checkout_branch'; branch: string }
  | { type: 'checkout_commit'; commitId: string }
  | { type: 'restore_head' }
  | { type: 'git_diff_request'; commitA?: string; commitB?: string }
  | { type: 'git_diff_response'; added: string[]; modified: string[]; deleted: string[] }
  | { type: 'import_figma'; json: string }
  | { type: 'import_penpot'; json: string };

import type {
  SceneNode,
  DocumentNode,
  SceneEvent,
} from '@vitra/core';

export interface UserEditRecord {
  id: string;
  timestamp: number;
  nodeId: string;
  eventType: SceneEvent['type'];
  details: string;
  event: SceneEvent;
}

export interface GitCommitSummary {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface SyncServerOptions {
  port: number;
  projectPath?: string;
  staticDir?: string;
  onError?: (err: Error) => void;
  onUserEdit?: (record: UserEditRecord) => void;
}

export type SyncMessage =
  | { type: 'snapshot'; root: DocumentNode; nodes: Record<string, SceneNode> }
  | { type: 'event'; event: SceneEvent }
  | { type: 'mutation'; event: SceneEvent }
  | { type: 'git_status_request' }
  | { type: 'git_status'; branches: string[]; currentBranch: string; commits: GitCommitSummary[]; headIndex: number }
  | { type: 'checkout_branch'; branch: string }
  | { type: 'checkout_commit'; commitId: string }
  | { type: 'restore_head' }
  | { type: 'git_diff_request'; commitA?: string; commitB?: string }
  | { type: 'git_diff_response'; added: string[]; modified: string[]; deleted: string[] }
  | { type: 'import_figma'; json: string }
  | { type: 'import_penpot'; json: string };

export interface ISyncHubConnection {
  isServer: boolean;
  close(): void;
}

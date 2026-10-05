import { z } from 'zod';

export const AgentCommitAuthorSchema = z.object({
  type: z.enum(['agent', 'human']),
  model: z.string().optional(),
  client: z.string().optional(),
  name: z.string().optional(),
});
export type AgentCommitAuthor = z.infer<typeof AgentCommitAuthorSchema>;

export const CommitChangesSummarySchema = z.object({
  nodesAdded: z.array(z.string()).default([]),
  nodesModified: z.array(z.string()).default([]),
  nodesDeleted: z.array(z.string()).default([]),
  tokensModified: z.array(z.string()).default([]),
});
export type CommitChangesSummary = z.infer<typeof CommitChangesSummarySchema>;

export const AgentCommitSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable().default(null),
  parentIds: z.array(z.string()).optional(),
  timestamp: z.string(),
  author: AgentCommitAuthorSchema,
  intent: z.string(),
  rationale: z.string().optional(),
  changes: CommitChangesSummarySchema.default({
    nodesAdded: [],
    nodesModified: [],
    nodesDeleted: [],
    tokensModified: [],
  }),
  snapshotHash: z.string().optional(),
  treeSha: z.string().optional(),
});
export type AgentCommit = z.infer<typeof AgentCommitSchema>;

/**
 * Finds the Lowest Common Ancestor (LCA) between two commits in the DAG history using BFS.
 */
export function findMergeBase(history: AgentCommit[], commitA: string, commitB: string): string | null {
  if (commitA === commitB) return commitA;

  const parentMap = new Map<string, string[]>();
  for (const c of history) {
    const parents: string[] = [];
    if (c.parentIds && c.parentIds.length > 0) {
      parents.push(...c.parentIds);
    } else if (c.parentId) {
      parents.push(c.parentId);
    }
    parentMap.set(c.id, parents);
  }

  const visitedA = new Set<string>();
  const queueA = [commitA];
  while (queueA.length > 0) {
    const cur = queueA.shift()!;
    if (visitedA.has(cur)) continue;
    visitedA.add(cur);
    const parents = parentMap.get(cur) ?? [];
    for (const p of parents) {
      queueA.push(p);
    }
  }

  const queueB = [commitB];
  const visitedB = new Set<string>();
  while (queueB.length > 0) {
    const cur = queueB.shift()!;
    if (visitedA.has(cur)) {
      return cur;
    }
    if (visitedB.has(cur)) continue;
    visitedB.add(cur);
    const parents = parentMap.get(cur) ?? [];
    for (const p of parents) {
      queueB.push(p);
    }
  }

  return null;
}

export class HistoryManager {
  private commits: AgentCommit[] = [];

  constructor(initialCommits: AgentCommit[] = []) {
    this.commits = [...initialCommits];
  }

  public addCommit(commit: AgentCommit): void {
    const validated = AgentCommitSchema.parse(commit);
    this.commits.push(validated);
  }

  public getCommit(id: string): AgentCommit | undefined {
    return this.commits.find((c) => c.id === id);
  }

  public getLog(): AgentCommit[] {
    return [...this.commits];
  }

  public getHead(): AgentCommit | undefined {
    if (this.commits.length === 0) return undefined;
    return this.commits[this.commits.length - 1];
  }

  public toJSON(): AgentCommit[] {
    return this.commits;
  }

  public static fromJSON(data: unknown): HistoryManager {
    const schema = z.array(AgentCommitSchema);
    const parsed = schema.parse(data);
    return new HistoryManager(parsed);
  }
}

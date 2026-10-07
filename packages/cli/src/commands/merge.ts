import * as path from 'node:path';
import {
  mergeProjectBranches,
  MergeOptions,
  MergeProjectResult,
} from '@vitra/core';

export async function mergeProject(
  targetDir: string,
  targetBranch: string,
  options: MergeOptions = {}
): Promise<MergeProjectResult> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  return mergeProjectBranches(dirPath, targetBranch, options);
}

export function formatMergeSummary(result: MergeProjectResult): string {
  if (result.status === 'already-up-to-date') {
    return 'Already up to date.';
  }

  if (result.status === 'fast-forward') {
    return `Updating ${result.ourCommitId.slice(0, 7)}..${result.theirCommitId.slice(0, 7)}\nFast-forward merge successful.`;
  }

  if (result.status === 'clean') {
    return `Merge made by 3-way visual AST strategy.\nCommit: [${result.mergeCommitId}] Merge branch '${result.targetBranch}' into ${result.currentBranch}`;
  }

  // Conflicts
  const lines: string[] = [
    `Auto-merging branch '${result.targetBranch}' into '${result.currentBranch}'`,
    `CONFLICT: Automatic visual merge failed with ${result.conflicts.length} conflict(s):`,
  ];

  for (const c of result.conflicts) {
    if (c.type === 'property') {
      lines.push(
        `  [!] Property conflict on node "${c.nodeId}" -> ${c.property}:`
      );
      lines.push(`      ours:   ${JSON.stringify(c.ourValue)}`);
      lines.push(`      theirs: ${JSON.stringify(c.theirValue)}`);
      lines.push(`      base:   ${JSON.stringify(c.baseValue)}`);
    } else if (c.type === 'structural') {
      lines.push(`  [!] Structural conflict on node "${c.nodeId}": ${c.reason}`);
    } else if (c.type === 'token') {
      lines.push(
        `  [!] Token conflict at "${c.path}": ours=${JSON.stringify(c.ourValue)} vs theirs=${JSON.stringify(c.theirValue)}`
      );
    }
  }

  lines.push('\nAutomatic merge failed; fix conflicts or specify --strategy <ours|theirs>.');
  return lines.join('\n');
}

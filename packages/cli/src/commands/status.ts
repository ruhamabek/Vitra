import * as path from 'node:path';
import { getStatus, ProjectStatus } from '@vitra/core';

export async function statusProject(targetDir: string): Promise<ProjectStatus> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  return getStatus(dirPath);
}

export function formatStatus(status: ProjectStatus): string {
  const lines: string[] = [`On branch ${status.branch}`];

  if (status.isClean) {
    lines.push('nothing to commit, working canvas clean');
    return lines.join('\n');
  }

  if (status.staged.length > 0 || status.tokensStaged) {
    lines.push('\nChanges to be committed:');
    lines.push('  (use "vitra restore --staged <nodeId>..." to unstage)');
    for (const item of status.staged) {
      const namePart = item.nodeName ? ` "${item.nodeName}"` : '';
      lines.push(`\t${item.changeType}:   ${item.nodeType}${namePart} (id: "${item.nodeId}")`);
    }
    if (status.tokensStaged) {
      lines.push('\tmodified:   tokens (design tokens)');
    }
  }

  if (status.unstaged.length > 0 || status.tokensUnstaged) {
    lines.push('\nChanges not staged for commit:');
    lines.push('  (use "vitra add <nodeId>..." to update what will be committed)');
    lines.push('  (use "vitra restore <nodeId>..." to discard changes in working canvas)');
    for (const item of status.unstaged) {
      const namePart = item.nodeName ? ` "${item.nodeName}"` : '';
      lines.push(`\t${item.changeType}:   ${item.nodeType}${namePart} (id: "${item.nodeId}")`);
    }
    if (status.tokensUnstaged) {
      lines.push('\tmodified:   tokens (design tokens)');
    }
  }

  if (status.untracked.length > 0) {
    lines.push('\nUntracked nodes:');
    lines.push('  (use "vitra add <nodeId>..." to include in what will be committed)');
    for (const id of status.untracked) {
      lines.push(`\t${id}`);
    }
  }

  return lines.join('\n');
}

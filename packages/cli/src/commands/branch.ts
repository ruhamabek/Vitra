import * as path from 'node:path';
import {
  listBranches,
  createBranch,
  deleteBranch,
  BranchInfo,
} from '@vitra/core';

export interface BranchOptions {
  list?: boolean;
  create?: string;
  delete?: string;
  force?: boolean;
  targetCommitId?: string;
}

export async function branchProject(
  targetDir: string,
  options: BranchOptions = {}
): Promise<BranchInfo[]> {
  const dirPath = path.resolve(process.cwd(), targetDir);

  if (options.delete) {
    await deleteBranch(dirPath, options.delete);
    return listBranches(dirPath);
  }

  if (options.create) {
    await createBranch(dirPath, options.create, options.targetCommitId, options.force);
    return listBranches(dirPath);
  }

   return listBranches(dirPath);
}

export function formatBranchList(branches: BranchInfo[]): string {
  if (branches.length === 0) {
    return 'No branches found.';
  }
  return branches
    .map((b) => {
      const prefix = b.isCurrent ? '* ' : '  ';
      const commitPart = b.commitId ? ` (${b.commitId})` : '';
      return `${prefix}${b.name}${commitPart}`;
    })
    .join('\n');
}

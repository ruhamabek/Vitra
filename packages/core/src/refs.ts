import { loadVitraProject, loadCommitSnapshot, deterministicStringify, getHistoryDirSync } from './project.js';

async function getFs() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  return { fs, path };
}

export interface HeadInfo {
  type: 'branch' | 'detached' | 'empty';
  branch: string | null;
  commitId: string | null;
  ref?: string;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  commitId: string;
}

export interface CheckoutResult {
  type: 'branch' | 'detached';
  branch: string | null;
  commitId: string;
}

/**
 * Initializes the .history/HEAD pointer and .history/refs/heads/main branch pointer.
 */
export async function initRefs(dirPath: string, initialCommitId?: string): Promise<void> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  const headsDir = path.join(historyDir, 'refs', 'heads');
  await fs.mkdir(headsDir, { recursive: true });

  const headPath = path.join(historyDir, 'HEAD');
  await fs.writeFile(headPath, 'ref: refs/heads/main\n', 'utf-8');

  if (initialCommitId) {
    const mainRefPath = path.join(headsDir, 'main');
    await fs.writeFile(mainRefPath, `${initialCommitId.trim()}\n`, 'utf-8');
  }
}

/**
 * Resolves current HEAD (symbolic branch ref or detached commit ID).
 */
export async function resolveHead(dirPath: string): Promise<HeadInfo> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  const headPath = path.join(historyDir, 'HEAD');

  try {
    const raw = await fs.readFile(headPath, 'utf-8');
    const trimmed = raw.trim();

    if (trimmed.startsWith('ref: ')) {
      const ref = trimmed.slice(5).trim();
      const branchName = ref.replace(/^refs\/heads\//, '');
      const refFilePath = path.join(historyDir, ref);
      try {
        const commitId = (await fs.readFile(refFilePath, 'utf-8')).trim();
        return {
          type: 'branch',
          branch: branchName,
          commitId: commitId.length > 0 ? commitId : null,
          ref,
        };
      } catch {
        return {
          type: 'branch',
          branch: branchName,
          commitId: null,
          ref,
        };
      }
    } else if (trimmed.length > 0) {
      return {
        type: 'detached',
        branch: null,
        commitId: trimmed,
      };
    }
  } catch {
     try {
      const project = await loadVitraProject(dirPath);
      const lastCommit = project.history[project.history.length - 1];
      if (lastCommit) {
        await initRefs(dirPath, lastCommit.id);
        return {
          type: 'branch',
          branch: 'main',
          commitId: lastCommit.id,
          ref: 'refs/heads/main',
        };
      }
    } catch {
      // Empty project
    }
  }

  return {
    type: 'empty',
    branch: null,
    commitId: null,
  };
}

/**
 * Updates the current branch ref (or detached HEAD) with a new commit ID.
 */
export async function updateHeadRef(dirPath: string, newCommitId: string): Promise<void> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  const head = await resolveHead(dirPath);

  if (head.type === 'branch' && head.ref) {
    const refPath = path.join(historyDir, head.ref);
    await fs.mkdir(path.dirname(refPath), { recursive: true });
    await fs.writeFile(refPath, `${newCommitId.trim()}\n`, 'utf-8');
  } else {
    const headPath = path.join(historyDir, 'HEAD');
    await fs.writeFile(headPath, `${newCommitId.trim()}\n`, 'utf-8');
  }
}

/**
 * Creates a new branch pointing to commitId (or current HEAD commit).
 */
export async function createBranch(
  dirPath: string,
  branchName: string,
  commitId?: string,
  force = false
): Promise<string> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  let targetCommitId = commitId;

  if (!targetCommitId) {
    const head = await resolveHead(dirPath);
    if (!head.commitId) {
      throw new Error(`Cannot branch: No commits exist in project "${dirPath}".`);
    }
    targetCommitId = head.commitId;
  }

  const branchPath = path.join(historyDir, 'refs', 'heads', branchName);
  try {
    await fs.access(branchPath);
    if (!force) {
      throw new Error(`Branch "${branchName}" already exists.`);
    }
  } catch (err: any) {
    if (err.message?.includes('already exists')) throw err;
  }

  await fs.mkdir(path.dirname(branchPath), { recursive: true });
  await fs.writeFile(branchPath, `${targetCommitId.trim()}\n`, 'utf-8');

  return targetCommitId;
}

/**
 * Lists all branches in the project.
 */
export async function listBranches(dirPath: string): Promise<BranchInfo[]> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  const headsDir = path.join(historyDir, 'refs', 'heads');
  const head = await resolveHead(dirPath);

  const branches: BranchInfo[] = [];

  async function walk(currentDir: string, prefix = ''): Promise<void> {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(fullPath, relativeName);
        } else if (entry.isFile()) {
          const commitId = (await fs.readFile(fullPath, 'utf-8')).trim();
          branches.push({
            name: relativeName,
            isCurrent: head.type === 'branch' && head.branch === relativeName,
            commitId,
          });
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  await walk(headsDir);
  return branches.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Deletes a branch pointer.
 */
export async function deleteBranch(dirPath: string, branchName: string): Promise<void> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  const head = await resolveHead(dirPath);

  if (head.type === 'branch' && head.branch === branchName) {
    throw new Error(`Cannot delete the currently checked out branch "${branchName}". Switch to another branch first.`);
  }

  const branchPath = path.join(historyDir, 'refs', 'heads', branchName);
  await fs.rm(branchPath, { force: true });

  const parentDir = path.dirname(branchPath);
  const headsDir = path.join(historyDir, 'refs', 'heads');
  if (parentDir !== headsDir) {
    try {
      const remaining = await fs.readdir(parentDir);
      if (remaining.length === 0) {
        await fs.rmdir(parentDir);
      }
    } catch {
      // Ignore if cannot remove
    }
  }
}

/**
 * Checks out a branch or commit, restoring the working scene/scene.json to that commit's snapshot.
 */
export async function checkoutRef(
  dirPath: string,
  targetRef: string
): Promise<CheckoutResult> {
  const { fs, path } = await getFs();
  const historyDir = getHistoryDirSync(dirPath);
  const project = await loadVitraProject(dirPath);
  const cleanTarget = targetRef.trim();


  const branchPath = path.join(historyDir, 'refs', 'heads', cleanTarget);
  let isBranch = false;
  let commitId = '';

  try {
    commitId = (await fs.readFile(branchPath, 'utf-8')).trim();
    isBranch = true;
  } catch {

    const commit = project.history.find(
      (c) => c.id === cleanTarget || c.id.startsWith(cleanTarget)
    );
    if (commit) {
      commitId = commit.id;
    } else {
      throw new Error(`error: pathspec '${cleanTarget}' did not match any branch or commit in Vitra history.`);
    }
  }


  let snapshot = await loadCommitSnapshot(dirPath, commitId);
  if (!snapshot) {
    if (commitId === 'c-init') {
      snapshot = project.store.exportSnapshot();
    } else {
      throw new Error(`Could not restore snapshot for commit "${commitId}". Git tree object or snapshot is missing.`);
    }
  }


  const scenePath = path.join(dirPath, 'scene', 'scene.json');
  await fs.writeFile(scenePath, deterministicStringify(snapshot), 'utf-8');

  const headPath = path.join(historyDir, 'HEAD');
  if (isBranch) {
    await fs.writeFile(headPath, `ref: refs/heads/${cleanTarget}\n`, 'utf-8');
    return {
      type: 'branch',
      branch: cleanTarget,
      commitId,
    };
  } else {
    await fs.writeFile(headPath, `${commitId}\n`, 'utf-8');
    return {
      type: 'detached',
      branch: null,
      commitId,
    };
  }
}

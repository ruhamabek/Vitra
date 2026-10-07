import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  commitProject,
  branchProject,
  checkoutProject,
  formatBranchList,
} from '../src/index.js';
import {
  loadVitraProject,
  resolveHead,
  FrameNode,
} from '@vitra/core';

describe('Vitra CLI Branch & Checkout Test Suite (Git-Style Refs)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should initialize project with main branch and advance main on commit', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const initialHead = await resolveHead(projectDir);
    expect(initialHead.type).toBe('branch');
    expect(initialHead.branch).toBe('main');
    expect(initialHead.commitId).toBe('c-init');

    const commit1 = await commitProject(projectDir, {
      message: 'First commit on main',
      authorName: 'Developer',
    });

    const headAfterCommit = await resolveHead(projectDir);
    expect(headAfterCommit.type).toBe('branch');
    expect(headAfterCommit.branch).toBe('main');
    expect(headAfterCommit.commitId).toBe(commit1.id);
  });

  it('should list branches with formatBranchList showing active branch', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const branches = await branchProject(projectDir, { list: true });
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe('main');
    expect(branches[0].isCurrent).toBe(true);

    const formatted = formatBranchList(branches);
    expect(formatted).toContain('* main');
  });

  it('should create new branch pointing to current HEAD and allow switching', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    await branchProject(projectDir, { create: 'design/dark-mode' });

    const branches = await branchProject(projectDir, { list: true });
    expect(branches).toHaveLength(2);
    const branchNames = branches.map((b) => b.name);
    expect(branchNames).toContain('main');
    expect(branchNames).toContain('design/dark-mode');

    const checkoutResult = await checkoutProject(projectDir, {
      target: 'design/dark-mode',
    });
    expect(checkoutResult.type).toBe('branch');
    expect(checkoutResult.branch).toBe('design/dark-mode');

    const activeHead = await resolveHead(projectDir);
    expect(activeHead.branch).toBe('design/dark-mode');
  });

  it('should support checkout -b to create and switch in one operation', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const result = await checkoutProject(projectDir, {
      target: 'experiment/hero',
      createBranch: true,
    });

    expect(result.type).toBe('branch');
    expect(result.branch).toBe('experiment/hero');

    const activeHead = await resolveHead(projectDir);
    expect(activeHead.branch).toBe('experiment/hero');
    expect(activeHead.commitId).toBe('c-init');
  });

  it('should restore working scene when checking out between divergent branches', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    await checkoutProject(projectDir, { target: 'design/pink', createBranch: true });

    const proj1 = await loadVitraProject(projectDir);
    proj1.store.updateNode('desktop-nav', { fill: '#FF007F' });
    const { saveVitraProject } = await import('@vitra/core');
    await saveVitraProject(projectDir, {
      manifest: proj1.manifest,
      store: proj1.store,
      tokens: proj1.tokens,
      history: proj1.history,
    });

 
    const checkPink = await loadVitraProject(projectDir);
    expect((checkPink.store.getNode('desktop-nav') as FrameNode)?.fill).toBe('#FF007F');

    await checkoutProject(projectDir, { target: 'main' });

     const checkMain = await loadVitraProject(projectDir);
    expect((checkMain.store.getNode('desktop-nav') as FrameNode)?.fill).not.toBe('#FF007F');

     await checkoutProject(projectDir, { target: 'design/pink' });

     const checkPinkAgain = await loadVitraProject(projectDir);
    expect((checkPinkAgain.store.getNode('desktop-nav') as FrameNode)?.fill).toBe('#FF007F');
  });

  it('should support checking out past commit ID in detached HEAD mode', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const c1 = await commitProject(projectDir, {
      message: 'Commit 1 on main',
    });

     const result = await checkoutProject(projectDir, { target: 'c-init' });
    expect(result.type).toBe('detached');
    expect(result.commitId).toBe('c-init');

    const head = await resolveHead(projectDir);
    expect(head.type).toBe('detached');
    expect(head.commitId).toBe('c-init');
  });

  it('should delete branch and prevent deleting active branch', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-branch-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    await branchProject(projectDir, { create: 'temp-branch' });
    let branches = await branchProject(projectDir, { list: true });
    expect(branches.map((b) => b.name)).toContain('temp-branch');

     await expect(
      branchProject(projectDir, { delete: 'main' })
    ).rejects.toThrow(/Cannot delete the currently checked out branch/);

     await branchProject(projectDir, { delete: 'temp-branch' });
    branches = await branchProject(projectDir, { list: true });
    expect(branches.map((b) => b.name)).not.toContain('temp-branch');
  });
});

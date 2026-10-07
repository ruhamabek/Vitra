import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  commitProject,
  branchProject,
  checkoutProject,
  mergeProject,
  formatMergeSummary,
} from '../src/index.js';
import {
  loadVitraProject,
  resolveHead,
  FrameNode,
  ArtboardNode,
} from '@vitra/core';

describe('Vitra CLI Merge Test Suite (3-Way AST Merge)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should detect when branch is already up to date', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-merge-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    await branchProject(projectDir, { create: 'feature/v1' });

    const result = await mergeProject(projectDir, 'feature/v1');
    expect(result.status).toBe('already-up-to-date');
    expect(result.message).toContain('Already up to date');
  });

  it('should perform fast-forward merge when active branch is direct ancestor', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-merge-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

     await checkoutProject(projectDir, { target: 'feature/fast-forward', createBranch: true });

     const featureCommit = await commitProject(projectDir, {
      message: 'New feature commit',
      authorName: 'Developer',
    });

     await checkoutProject(projectDir, { target: 'main' });

    // Merge feature/fast-forward into main
    const mergeRes = await mergeProject(projectDir, 'feature/fast-forward');
    expect(mergeRes.status).toBe('fast-forward');

     const head = await resolveHead(projectDir);
    expect(head.branch).toBe('main');
    expect(head.commitId).toBe(featureCommit.id);
  });

  it('should perform clean 3-way AST merge between diverged branches', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-merge-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

     await checkoutProject(projectDir, { target: 'design/dark-nav', createBranch: true });

     const projDark = await loadVitraProject(projectDir);
    projDark.store.updateNode('desktop-nav', { fill: '#11111B' });
    const { saveVitraProject } = await import('@vitra/core');
    await saveVitraProject(projectDir, {
      manifest: projDark.manifest,
      store: projDark.store,
      tokens: projDark.tokens,
      history: projDark.history,
    });
    const darkCommit = await commitProject(projectDir, {
      message: 'Dark nav background',
      authorName: 'Designer A',
    });

     await checkoutProject(projectDir, { target: 'main' });

     const projMain = await loadVitraProject(projectDir);
    projMain.store.updateNode('artboard-mobile', { fill: '#F5F5F5' });
    await saveVitraProject(projectDir, {
      manifest: projMain.manifest,
      store: projMain.store,
      tokens: projMain.tokens,
      history: projMain.history,
    });
    const mainCommit = await commitProject(projectDir, {
      message: 'Light mobile background',
      authorName: 'Developer B',
    });

     const mergeRes = await mergeProject(projectDir, 'design/dark-nav');
    expect(mergeRes.status).toBe('clean');
    expect(mergeRes.conflicts).toHaveLength(0);
    expect(mergeRes.mergeCommitId).toBeDefined();

     const mergedProject = await loadVitraProject(projectDir);
    const lastCommit = mergedProject.history[mergedProject.history.length - 1];
    expect(lastCommit.id).toBe(mergeRes.mergeCommitId);
    expect(lastCommit.parentIds).toContain(mainCommit.id);
    expect(lastCommit.parentIds).toContain(darkCommit.id);

     expect((mergedProject.store.getNode('desktop-nav') as FrameNode)?.fill).toBe('#11111B');
    expect((mergedProject.store.getNode('artboard-mobile') as ArtboardNode)?.fill).toBe('#F5F5F5');

     const formatted = formatMergeSummary(mergeRes);
    expect(formatted).toContain('Merge made by 3-way visual AST strategy');
  });

  it('should detect conflicting property changes during merge', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-merge-cli-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

     await checkoutProject(projectDir, { target: 'red-nav', createBranch: true });
    const projRed = await loadVitraProject(projectDir);
    projRed.store.updateNode('desktop-nav', { fill: '#FF0000' });
    const { saveVitraProject } = await import('@vitra/core');
    await saveVitraProject(projectDir, {
      manifest: projRed.manifest,
      store: projRed.store,
      tokens: projRed.tokens,
      history: projRed.history,
    });
    await commitProject(projectDir, { message: 'Red nav' });

     await checkoutProject(projectDir, { target: 'main' });
    const projGreen = await loadVitraProject(projectDir);
    projGreen.store.updateNode('desktop-nav', { fill: '#00FF00' });
    await saveVitraProject(projectDir, {
      manifest: projGreen.manifest,
      store: projGreen.store,
      tokens: projGreen.tokens,
      history: projGreen.history,
    });
    await commitProject(projectDir, { message: 'Green nav' });

     const mergeRes = await mergeProject(projectDir, 'red-nav');
    expect(mergeRes.status).toBe('conflicts');
    expect(mergeRes.conflicts.length).toBeGreaterThanOrEqual(1);

    const formatted = formatMergeSummary(mergeRes);
    expect(formatted).toContain('CONFLICT');
  });
});

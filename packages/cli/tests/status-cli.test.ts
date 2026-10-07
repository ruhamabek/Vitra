import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  commitProject,
  statusProject,
  formatStatus,
  addProject,
  restoreProject,
} from '../src/index.js';
import {
  loadVitraProject,
  saveVitraProject,
  loadCommitSnapshot,
  FrameNode,
  ArtboardNode,
} from '@vitra/core';

describe('Vitra CLI Status, Add & Restore Test Suite', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should format clean status correctly', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-status-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const status = await statusProject(projectDir);
    expect(status.isClean).toBe(true);

    const formatted = formatStatus(status);
    expect(formatted).toContain('On branch main');
    expect(formatted).toContain('nothing to commit, working canvas clean');
  });

  it('should display unstaged changes and stage them with add', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-status-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    // Modify desktop-nav
    const proj = await loadVitraProject(projectDir);
    proj.store.updateNode('desktop-nav', { fill: '#333333' });
    await saveVitraProject(projectDir, {
      manifest: proj.manifest,
      store: proj.store,
      tokens: proj.tokens,
      history: proj.history,
    });

    let status = await statusProject(projectDir);
    expect(status.unstaged).toHaveLength(1);
    expect(status.unstaged[0].nodeId).toBe('desktop-nav');

    let formatted = formatStatus(status);
    expect(formatted).toContain('Changes not staged for commit');
    expect(formatted).toContain('desktop-nav');

     await addProject(projectDir, ['desktop-nav']);

    status = await statusProject(projectDir);
    expect(status.staged).toHaveLength(1);
    expect(status.staged[0].nodeId).toBe('desktop-nav');
    expect(status.unstaged).toHaveLength(0);

    formatted = formatStatus(status);
    expect(formatted).toContain('Changes to be committed');
  });

  it('should commit ONLY staged changes when partial staging is used', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-status-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

     const proj = await loadVitraProject(projectDir);
    proj.store.updateNode('desktop-nav', { fill: '#123456' });
    proj.store.updateNode('artboard-mobile', { fill: '#654321' });
    await saveVitraProject(projectDir, {
      manifest: proj.manifest,
      store: proj.store,
      tokens: proj.tokens,
      history: proj.history,
    });

     await addProject(projectDir, ['desktop-nav']);

     const commit = await commitProject(projectDir, {
      message: 'Update desktop nav only',
    });

     const commitSnapshot = await loadCommitSnapshot(projectDir, commit.id);
    expect(commitSnapshot?.nodes['desktop-nav']?.fill).toBe('#123456');
    expect(commitSnapshot?.nodes['artboard-mobile']?.fill).not.toBe('#654321');

     const workingProj = await loadVitraProject(projectDir);
    expect((workingProj.store.getNode('artboard-mobile') as ArtboardNode)?.fill).toBe('#654321');

     const status = await statusProject(projectDir);
    expect(status.staged).toHaveLength(0);
    expect(status.unstaged).toHaveLength(1);
    expect(status.unstaged[0].nodeId).toBe('artboard-mobile');
  });

  it('should discard working changes using restore', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-status-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const proj = await loadVitraProject(projectDir);
    proj.store.updateNode('desktop-nav', { fill: '#BADA55' });
    await saveVitraProject(projectDir, {
      manifest: proj.manifest,
      store: proj.store,
      tokens: proj.tokens,
      history: proj.history,
    });

    let status = await statusProject(projectDir);
    expect(status.unstaged).toHaveLength(1);

     await restoreProject(projectDir, ['desktop-nav']);

    status = await statusProject(projectDir);
    expect(status.isClean).toBe(true);

    const restoredProj = await loadVitraProject(projectDir);
    expect((restoredProj.store.getNode('desktop-nav') as FrameNode)?.fill).not.toBe('#BADA55');
  });
});

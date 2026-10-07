import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  inspectProject,
  commitProject,
  getProjectLog,
  formatLog,
  exportProject,
  diffProjects,
  serveProject,
} from '../src/index.js';
import { loadVitraProject } from '@vitra/core';

describe('Vitra CLI Test Suite', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should initialize a new Vitra project with desktop and mobile artboards', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-test-'));
    const projectDir = path.join(tempDir, 'demo.vitra');

    const createdPath = await initProject(projectDir, { name: 'DemoApp' });
    expect(createdPath).toBe(projectDir);

    const project = await loadVitraProject(projectDir);
    expect(project.manifest.name).toBe('DemoApp');
    expect(project.manifest.artboardIds).toHaveLength(2);
    expect(project.store.getNode('artboard-desktop')).toBeDefined();
    expect(project.store.getNode('artboard-mobile')).toBeDefined();
    expect(project.tokens?.color?.accent?.$value).toBe('#10B981');
    expect(project.history).toHaveLength(1);
    expect(project.history[0].id).toBe('c-init');
  });

  it('should inspect project and return structured summary', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-test-'));
    const projectDir = path.join(tempDir, 'inspect-demo.vitra');
    await initProject(projectDir, { name: 'InspectDemo' });

    const summary = await inspectProject(projectDir);
    expect(summary.name).toBe('InspectDemo');
    expect(summary.artboards).toHaveLength(2);
    expect(summary.totalNodeCount).toBeGreaterThanOrEqual(8);
    expect(summary.tokenCategories).toContain('color');
    expect(summary.totalCommits).toBe(1);
    expect(summary.latestCommit?.id).toBe('c-init');
  });

  it('should commit an agent iteration with rationale and append to history', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-test-'));
    const projectDir = path.join(tempDir, 'commit-demo.vitra');
    await initProject(projectDir, { name: 'CommitDemo' });

    const commit = await commitProject(projectDir, {
      message: 'Revamp hero headline',
      authorName: 'Claude 3.7 Sonnet',
      model: 'claude-3-7-sonnet',
      rationale: 'Increased headline contrast and size for better visual hierarchy on mobile.',
    });

    expect(commit.id).toMatch(/^c-/);
    expect(commit.parentId).toBe('c-init');
    expect(commit.intent).toBe('Revamp hero headline');
    expect(commit.rationale).toContain('visual hierarchy');

    const history = await getProjectLog(projectDir);
    expect(history).toHaveLength(2);
    expect(history[1].id).toBe(commit.id);

    const formatted = formatLog(history);
    expect(formatted).toContain('Revamp hero headline');
    expect(formatted).toContain('Claude 3.7 Sonnet');
  });

  it('should export React components from project artboards headlessly', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-test-'));
    const projectDir = path.join(tempDir, 'export-demo.vitra');
    const outDir = path.join(tempDir, 'react-dist');
    await initProject(projectDir, { name: 'ExportDemo' });

    const files = await exportProject(projectDir, {
      target: 'react',
      outDir,
    });

    expect(files.length).toBeGreaterThanOrEqual(1);
    for (const f of files) {
      const content = await fs.readFile(f, 'utf-8');
      expect(content).toContain('export function');
      expect(content).toContain('className=');
    }
  });

  it('should compute diff between two project directories', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-test-'));
    const projA = path.join(tempDir, 'proj-a.vitra');
    const projB = path.join(tempDir, 'proj-b.vitra');

    await initProject(projA, { name: 'SharedApp' });
    await initProject(projB, { name: 'SharedApp' });

     const loadedB = await loadVitraProject(projB);
    loadedB.store.updateNode('desktop-nav', { fill: '#000000' });
    const { saveVitraProject } = await import('@vitra/core');
    await saveVitraProject(projB, {
      manifest: loadedB.manifest,
      store: loadedB.store,
      tokens: loadedB.tokens,
      history: loadedB.history,
    });

    const diff = await diffProjects(projA, projB);
    expect(diff.summary.modifiedCount).toBe(1);
    expect(diff.modifiedNodes[0].nodeId).toBe('desktop-nav');
    const fillDiff = diff.modifiedNodes[0].propertyDiffs?.find((p) => p.property === 'fill');
    expect(fillDiff?.newValue).toBe('#000000');
  });

  it('should serve project over WebSocket sync and terminate cleanly', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-test-'));
    const projectDir = path.join(tempDir, 'serve-demo.vitra');
    await initProject(projectDir, { name: 'ServeDemo' });

    const testPort = 19876;
    const { server, port, close } = await serveProject(projectDir, { port: testPort });

    expect(port).toBe(testPort);
    expect(server).toBeDefined();

    await close();
  });
});

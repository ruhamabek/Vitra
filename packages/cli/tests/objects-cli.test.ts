import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  commitProject,
  hashObjectCommand,
  catFileCommand,
} from '../src/index.js';
import {
  loadCommitSnapshot,
} from '@vitra/core';

describe('Vitra CLI Git Plumbing (hash-object & cat-file)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should hash a file with hashObjectCommand matching standard git blob SHA', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-plumbing-'));
    const testFile = path.join(tempDir, 'hello.txt');
    await fs.writeFile(testFile, 'hello world\n', 'utf-8');

    const sha = await hashObjectCommand(testFile);
     expect(sha).toBe('3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
  });

  it('should write git object into .history/objects when -w is specified', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-plumbing-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const sampleFile = path.join(tempDir, 'sample.json');
    await fs.writeFile(sampleFile, '{"color":"#FF0000"}', 'utf-8');

    const sha = await hashObjectCommand(sampleFile, { write: true, dir: projectDir });
    expect(sha).toHaveLength(40);

     const objectFile = path.join(projectDir, '.history', 'objects', sha.slice(0, 2), sha.slice(2));
    const stat = await fs.stat(objectFile);
    expect(stat.isFile()).toBe(true);

     const content = await catFileCommand(projectDir, sha);
    expect(content).toBe('{"color":"#FF0000"}');
  });

  it('should inspect commit tree objects using catFileCommand (-p)', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-cli-plumbing-'));
    const projectDir = path.join(tempDir, 'demo.vitra');
    await initProject(projectDir, { name: 'DemoApp' });

    const commit = await commitProject(projectDir, {
      message: 'Initial tree creation',
    });

    const snapshot = await loadCommitSnapshot(projectDir, commit.id);
    expect(snapshot).toBeDefined();

    expect(commit.treeSha).toBeDefined();

    const treeListing = await catFileCommand(projectDir, commit.treeSha!);
    expect(treeListing).toContain('.self');
    expect(treeListing).toContain('artboard-desktop');
    expect(treeListing).toContain('artboard-mobile');
  });
});

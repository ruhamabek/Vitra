import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProject,
  runAuditCommand,
} from '../src/index.js';
import {
  loadVitraProject,
  saveVitraProject,
  createFrameNode,
  createTextNode,
} from '@vitra/core';

describe('Vitra CLI: audit command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitra-audit-test-'));
    await initProject(tmpDir, { name: 'Audit Test Project' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should audit default project artboard and report a valid score', async () => {
    const summary = await runAuditCommand(tmpDir);

    expect(summary.projectName).toBe('Audit Test Project');
    expect(summary.totalChecks).toBeGreaterThan(0);
    expect(summary.score).toBeGreaterThanOrEqual(70);
    expect(summary.auditedNodes.length).toBeGreaterThan(0);
  });

  it('should detect failing contrast when dark text is placed on dark surface', async () => {
    const project = await loadVitraProject(tmpDir);
    const artboardId = project.store.getRoot().childIds[0];

     const badBtn = createFrameNode({
      id: 'bad-btn',
      fill: '#10141E',
    });
    const badText = createTextNode({
      id: 'bad-text',
      text: 'Invisible Text',
      fill: '#151A24', 
    });

    project.store.insertNode(badBtn, artboardId);
    project.store.insertNode(badText, 'bad-btn');
    await saveVitraProject(tmpDir, { store: project.store, manifest: project.manifest });

    const summary = await runAuditCommand(tmpDir, { nodeId: artboardId });

    expect(summary.valid).toBe(false);
    expect(summary.score).toBeLessThan(100);

    const issues = summary.auditedNodes[0].result.issues;
    const contrastIssue = issues.find(i => i.type === 'contrast' && i.nodeId === 'bad-text');
    expect(contrastIssue).toBeDefined();
    expect(contrastIssue?.severity).toBe('error');
  });
});

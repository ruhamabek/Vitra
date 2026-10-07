import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { initProject, runSpecCommand, applyComponentToProject } from '../src/index.js';

describe('Vitra CLI: spec command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitra-spec-test-'));
    await initProject(tmpDir, { name: 'Spec Test Project' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export project artboard to design.md format', async () => {
     const componentMd = path.join(tmpDir, 'button.md');
    fs.writeFileSync(
      componentMd,
      '- Frame: action-btn [fill: #3B82F6, r: 8]\n  - Text: btn-label [text: "Click Me", size: 14, fill: #FFFFFF]'
    );
    await applyComponentToProject(tmpDir, componentMd);

    const result = await runSpecCommand(tmpDir, { node: 'action-btn' });
    expect(result.markdown).toContain('- Frame: action-btn');
    expect(result.markdown).toContain('- Text: btn-label');
    expect(result.markdown).toContain('text: "Click Me"');
  });

  it('should write design.md to file when --out is specified', async () => {
    const outFile = path.join(tmpDir, 'exported.md');
    const result = await runSpecCommand(tmpDir, { out: outFile });
    expect(result.outFile).toBe(outFile);
    expect(fs.existsSync(outFile)).toBe(true);

    const content = fs.readFileSync(outFile, 'utf-8');
    expect(content).toContain('- Artboard:');
  });
});

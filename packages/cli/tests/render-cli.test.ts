import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { initProject, runRenderCommand } from '../src/index.js';

describe('Vitra CLI: render command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitra-render-test-'));
    await initProject(tmpDir, { name: 'Render Test Project' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should render artboard to SVG format', async () => {
    const outFile = path.join(tmpDir, 'canvas.svg');
    const result = await runRenderCommand(tmpDir, { out: outFile, format: 'svg' });

    expect(result.format).toBe('svg');
    expect(fs.existsSync(outFile)).toBe(true);
    expect(result.byteSize).toBeGreaterThan(0);

    const svgContent = fs.readFileSync(outFile, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
  });

  it('should render artboard to PNG format', async () => {
    const outFile = path.join(tmpDir, 'canvas.png');
    const result = await runRenderCommand(tmpDir, { out: outFile, format: 'png', scale: 1 });

    expect(result.format).toBe('png');
    expect(fs.existsSync(outFile)).toBe(true);
    expect(result.byteSize).toBeGreaterThan(0);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});

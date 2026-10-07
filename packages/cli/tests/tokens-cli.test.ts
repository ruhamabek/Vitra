import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { importTokensFromCss } from '../src/commands/tokens.js';

describe('Vitra CLI: tokens import', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitra-tokens-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should parse globals.css and write tokens.json', async () => {
    const cssPath = path.join(tmpDir, 'globals.css');
    const outTokensPath = path.join(tmpDir, 'tokens.json');

    const sampleCss = `
      :root {
        --color-primary: #2563eb;
        --color-background: #090d16;
        --spacing-4: 16px;
        --radius-modal: 16px;
      }
      .dark {
        --color-background: #000000;
        --color-primary: #3b82f6;
      }
    `;

    fs.writeFileSync(cssPath, sampleCss, 'utf-8');

    const result = await importTokensFromCss(cssPath, { outFile: outTokensPath });

    expect(result.totalParsed).toBe(6);
    expect(result.themes).toContain('dark');
    expect(fs.existsSync(outTokensPath)).toBe(true);

    const savedJson = JSON.parse(fs.readFileSync(outTokensPath, 'utf-8'));
    expect(savedJson.$schema).toBeDefined();
    expect(savedJson.tokens.colors.primary.$value).toBe('#2563eb');
    expect(savedJson.tokens.spacing['4'].$value).toBe(16);
    expect(savedJson.tokens.radii.modal.$value).toBe(16);
    expect(savedJson.themes.dark.colors.background.$value).toBe('#000000');
  });

  it('should throw an error if the CSS file does not exist', async () => {
    const invalidPath = path.join(tmpDir, 'non-existent.css');
    await expect(importTokensFromCss(invalidPath)).rejects.toThrow('CSS file not found');
  });
});

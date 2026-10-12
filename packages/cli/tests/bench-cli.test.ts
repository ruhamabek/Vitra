import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBenchAgent, formatBenchTaskList, runBenchCommand } from '../src/index.js';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/bin.js');

/** Runs the built CLI with NO_COLOR set and returns its exit status and output. */
function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

describe('Vitra CLI: bench command', () => {
  let tmpDir: string | undefined;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('runs the oracle on selected tasks and writes a JSON report', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitra-bench-test-'));
    const out = path.join(tmpDir, 'reports', 'bench.json');
    const { result, outFile } = await runBenchCommand({ tasks: ['pricing-card'], out });

    expect(outFile).toBe(out);
    expect(result.agent).toBe('oracle');
    expect(result.tasks.map((t) => t.taskId)).toEqual(['pricing-card']);
    expect(result.score).toBe(100);

    const written = JSON.parse(fs.readFileSync(out, 'utf-8'));
    expect(written.tasks[0].efficiency.totalCalls).toBe(2);
  });

  it('lists the built-in tasks', () => {
    const list = formatBenchTaskList();
    expect(list).toContain('pricing-card');
    expect(list).toContain('responsive-mobile');
    expect(list).toContain('tokenize-colors');
  });

  it('rejects unknown agents and tasks', async () => {
    expect(() => createBenchAgent('gpt')).toThrow(/Unknown bench agent "gpt"/);
    await expect(runBenchCommand({ tasks: ['missing'] })).rejects.toThrow(/Unknown bench task "missing"/);
  });

  it('repeats tasks with runs and reports deviation', async () => {
    const { result } = await runBenchCommand({ tasks: ['tokenize-colors'], runs: 2 });
    expect(result.runs).toBe(2);
    expect(result.tasks).toHaveLength(2);
    expect(result.summaries[0]!.std).toBe(0);
  });

  it('rejects zero or invalid values for --max-turns and --runs before running', () => {
    for (const args of [
      ['bench', '--max-turns', '0'],
      ['bench', '--runs', '0'],
      ['bench', '--runs', '1.5'],
    ]) {
      const res = runCli(args);
      expect(res.status, args.join(' ')).toBe(1);
      expect(res.stdout + res.stderr).toMatch(/expects an integer of at least 1/);
      expect(res.stdout).not.toContain('VitraBench report');
    }
  });

  it('runs end to end from the binary and enforces --min-score', () => {
    const ok = runCli(['bench', '--task', 'pricing-card', '--runs', '2', '--min-score', '100']);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('2 runs per task');
    expect(ok.stdout).toMatch(/Suite score:\s+100\/100 ± 0\.0/);
  });
});

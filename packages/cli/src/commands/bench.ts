import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AnthropicAgent,
  BUILTIN_TASKS,
  createOracleAgent,
  runSuite,
  selectTasks,
  type BenchAgent,
  type SuiteResult,
} from '@vitra/bench';

export type BenchAgentKind = 'oracle' | 'anthropic';

export interface BenchCliOptions {
  /** Agent to evaluate (default: oracle). */
  agent?: BenchAgentKind;
  /** Task ids to run (default: all built-in tasks). */
  tasks?: string[];
  /** Model identifier for the anthropic agent. */
  model?: string;
  /** Maximum model turns per task for the anthropic agent. */
  maxTurns?: number;
  /** Per-task time limit in milliseconds. */
  timeoutMs?: number;
  /** Repetitions per task, for mean and standard deviation (default 1). */
  runs?: number;
  /** Write the JSON suite result to this path. */
  out?: string;
}

export interface BenchCommandResult {
  result: SuiteResult;
  outFile?: string;
}

/**
 * Creates the requested benchmark agent.
 *
 * @throws Error for an unknown agent kind.
 */
export function createBenchAgent(kind: string, options: BenchCliOptions = {}): BenchAgent {
  switch (kind) {
    case 'oracle':
      return createOracleAgent();
    case 'anthropic':
      return new AnthropicAgent({ model: options.model, maxTurns: options.maxTurns });
    default:
      throw new Error(`Unknown bench agent "${kind}". Expected one of: oracle, anthropic.`);
  }
}

/**
 * Runs the VitraBench suite and optionally writes the JSON result to disk.
 */
export async function runBenchCommand(options: BenchCliOptions = {}): Promise<BenchCommandResult> {
  const tasks = selectTasks(options.tasks);
  const agent = createBenchAgent(options.agent ?? 'oracle', options);
  const result = await runSuite(tasks, agent, { timeoutMs: options.timeoutMs, runs: options.runs });

  let outFile: string | undefined;
  if (options.out) {
    outFile = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  }
  return outFile ? { result, outFile } : { result };
}

/**
 * Formats the built-in task list for `vitra bench --list`.
 */
export function formatBenchTaskList(): string {
  const lines = ['', ' VitraBench tasks', ''];
  for (const task of BUILTIN_TASKS) {
    lines.push(`   ${task.id.padEnd(20)} ${task.category.padEnd(11)} ${task.title}`);
  }
  lines.push('');
  return lines.join('\n');
}

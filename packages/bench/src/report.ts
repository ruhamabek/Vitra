import type { SuiteResult, TaskResult } from './types.js';

/**
 * Options for terminal report formatting.
 */
export interface ReportFormatOptions {
  /** Emit ANSI colors (default: true unless `NO_COLOR` is set). */
  color?: boolean;
  /** Include the per-call log for each task (default false). */
  verbose?: boolean;
}

/**
 * Formats a suite result as a deterministic, human-readable terminal report.
 * The table shows per-task means across runs; with more than one run the
 * standard deviation column is populated. Per-run detail is printed for
 * single runs, and for every run when `verbose` is set.
 */
export function formatBenchReport(result: SuiteResult, options: ReportFormatOptions = {}): string {
  const useColor = options.color ?? !process.env.NO_COLOR;
  const verbose = options.verbose ?? false;
  const paint = (code: string, text: string): string => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
  const dim = (t: string): string => paint('2', t);
  const cyan = (t: string): string => paint('36', t);
  const scoreColor = (score: number): string =>
    paint(score >= 90 ? '32' : score >= 70 ? '33' : '31', String(Math.round(score)).padStart(3));
  const std = (value: number): string => (result.runs > 1 ? value.toFixed(1) : '-');
  const bar = (l: string, m: string, r: string): string =>
    dim(l + [22, 7, 7, 7, 7, 8, 8, 7, 8].map((w) => '─'.repeat(w)).join(m) + r);

  const lines: string[] = [];
  lines.push('');
  lines.push(
    ` VitraBench report  agent ${cyan(result.agent)}` +
      (result.runs > 1 ? dim(`  ${result.runs} runs per task, mean shown`) : '')
  );
  lines.push(bar('┌', '┬', '┐'));
  lines.push(
    [
      dim('│'),
      'task'.padEnd(20),
      dim('│'),
      'score',
      dim('│'),
      ' ±std',
      dim('│'),
      'func.',
      dim('│'),
      'audit',
      dim('│'),
      '  ssim',
      dim('│'),
      'effic.',
      dim('│'),
      'calls',
      dim('│'),
      'wasted',
      dim('│'),
    ].join(' ')
  );
  lines.push(bar('├', '┼', '┤'));
  for (const summary of result.summaries) {
    lines.push(
      [
        dim('│'),
        summary.taskId.padEnd(20).slice(0, 20),
        dim('│'),
        `  ${scoreColor(summary.mean)}`,
        dim('│'),
        std(summary.std).padStart(5),
        dim('│'),
        String(Math.round(summary.functional)).padStart(5),
        dim('│'),
        String(Math.round(summary.audit)).padStart(5),
        dim('│'),
        summary.ssim.toFixed(3).padStart(6),
        dim('│'),
        String(Math.round(summary.efficiency)).padStart(6),
        dim('│'),
        formatCount(summary.calls).padStart(5),
        dim('│'),
        formatCount(summary.wastedCalls).padStart(6),
        dim('│'),
      ].join(' ')
    );
  }
  lines.push(bar('└', '┴', '┘'));
  lines.push(
    ` Suite score: ${scoreColor(result.score)}/100` + (result.runs > 1 ? ` ± ${result.scoreStd.toFixed(1)}` : '')
  );

  if (result.runs === 1 || verbose) {
    for (const task of result.tasks) {
      lines.push('');
      lines.push(formatTaskDetail(task, paint, verbose, result.runs > 1));
    }
  } else {
    lines.push(dim(' Per-run detail: pass --verbose, or --out <file> for the full JSON result.'));
  }
  lines.push('');
  return lines.join('\n');
}

/** Formats a mean count with at most one decimal place. */
function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Formats the check results, sub-scores, and optional call log of one run.
 */
function formatTaskDetail(
  task: TaskResult,
  paint: (code: string, text: string) => string,
  verbose: boolean,
  showRun: boolean
): string {
  const lines: string[] = [];
  const ok = paint('32', '✔');
  const bad = paint('31', '✕');
  const runLabel = showRun ? ` run ${task.run + 1}` : '';
  lines.push(` ${task.taskId}${runLabel} ${paint('2', `(${task.category}) ${task.title}`)}`);
  for (const check of task.checks) {
    lines.push(`   ${check.passed ? ok : bad} ${check.description}${paint('2', `  ${check.detail}`)}`);
  }
  const issues = task.audit?.issues ?? [];
  const errors = issues.filter((i) => i.severity === 'error').length;
  lines.push(
    paint(
      '2',
      `   audit ${task.auditScore}/100 (${errors} error(s), ${issues.length - errors} other)` +
        `  visual ssim ${task.visual.ssim.toFixed(4)} size ratio ${task.visual.sizeRatio.toFixed(3)}` +
        (task.visual.error ? ` [${task.visual.error}]` : '')
    )
  );
  const e = task.efficiency;
  lines.push(
    paint(
      '2',
      `   calls ${e.totalCalls}/${e.callBudget} budget, ${e.mutatingCalls} mutating, ` +
        `${e.failedCalls} failed, ${e.noOpCalls} no-op, ${e.supersededCalls} superseded`
    )
  );
  if (task.usage) {
    lines.push(paint('2', `   tokens ${task.usage.inputTokens} in / ${task.usage.outputTokens} out`));
  }
  if (task.agentError) {
    lines.push(`   ${paint('33', '!')} agent error: ${task.agentError}`);
  }
  if (verbose) {
    for (const call of task.calls) {
      const flag = call.wasted ? paint('33', ` [${call.wasted}]`) : '';
      lines.push(paint('2', `   ${String(call.index + 1).padStart(3)}. ${call.name}`) + flag);
    }
  }
  return lines.join('\n');
}

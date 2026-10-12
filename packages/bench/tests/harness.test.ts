import { describe, it, expect } from 'vitest';
import {
  BUILTIN_TASKS,
  createOracleAgent,
  describeScene,
  buildScene,
  computeSizeRatio,
  formatBenchReport,
  getReferenceImage,
  resolveWeights,
  DEFAULT_WEIGHTS,
  pricingCardTask,
  responsiveMobileTask,
  runSuite,
  runTask,
  ScriptedAgent,
  REFERENCE_SOLUTIONS,
  selectTasks,
  tokenizeColorsTask,
  type BenchAgent,
} from '../src/index.js';

const idleAgent: BenchAgent = { name: 'idle', run: async () => undefined };

describe('VitraBench harness', () => {
  it('scores the oracle at 100 on every built-in task', async () => {
    const suite = await runSuite([...BUILTIN_TASKS], createOracleAgent());
    expect(suite.tasks).toHaveLength(BUILTIN_TASKS.length);
    for (const task of suite.tasks) {
      expect(task.checks.every((c) => c.passed), `${task.taskId}: ${JSON.stringify(task.checks)}`).toBe(true);
      expect(task.goalCompletion).toBe(1);
      expect(task.auditScore).toBe(100);
      expect(task.visual.ssim).toBeCloseTo(1, 6);
      expect(task.efficiency.wastedCalls).toBe(0);
      expect(task.score).toBe(100);
    }
    expect(suite.score).toBe(100);
  });

  it('gives an agent that does nothing zero on every task', async () => {
    const suite = await runSuite([...BUILTIN_TASKS], idleAgent);
    for (const task of suite.tasks) {
      expect(task.goalCompletion).toBe(0);
      expect(task.score).toBe(0);
    }
  });

  it('ranks a partially correct, wasteful agent between idle and oracle', async () => {
    const sloppy = new ScriptedAgent('sloppy', {
      'pricing-card': [
        { tool: 'create_frame', args: { id: 'pricing-card', parentId: 'board', width: 320, fill: '#1E1E2E', layout: { direction: 'vertical' } } },
        { tool: 'create_text', args: { id: 'p', parentId: 'pricing-card', text: 'Pro', fill: '#2A2A3A' } },
        { tool: 'update_node', args: { nodeId: 'p', patch: { fill: '#303040' } } },
        { tool: 'update_node', args: { nodeId: 'p', patch: { fill: '#383848' } } },
        { tool: 'create_text', args: { id: 'price', parentId: 'pricing-card', text: '$29/mo', fill: '#FFFFFF' } },
      ],
    });
    const result = await runTask(pricingCardTask, sloppy);
    expect(result.goalCompletion).toBeGreaterThan(0);
    expect(result.goalCompletion).toBeLessThan(1);
    expect(result.audit?.valid).toBe(false);
    expect(result.visual.ssim).toBeLessThan(0.95);
    expect(result.efficiency.supersededCalls).toBe(1);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(60);
  });

  it('awards partial credit for an incomplete token migration and penalises guard violations', async () => {
    const partial = new ScriptedAgent('partial', {
      'tokenize-colors': [
        { tool: 'update_node', args: { nodeId: 'promo-card', patch: { fill: '$colors.surface', stroke: '$colors.brand.primary' } } },
        { tool: 'update_node', args: { nodeId: 'promo-divider', patch: { fill: '$colors.surface' } } },
      ],
    });
    const result = await runTask(tokenizeColorsTask, partial);
    const applied = result.checks.find((c) => c.id === 'tokens-applied')!;
    expect(applied.passed).toBe(false);
    expect(applied.credit).toBeCloseTo(2 / 8, 6);
    expect(result.goalCompletion).toBeCloseTo(0.25, 4);
    expect(result.checks.find((c) => c.id === 'untokenized-literal')!.passed).toBe(false);
    expect(result.checks.find((c) => c.id === 'colors-preserved')!.passed).toBe(false);
    expect(result.functionalScore).toBeLessThan(25);
  });

  it('flags a mobile layout that keeps a horizontal row', async () => {
    const naive = new ScriptedAgent('naive', {
      'responsive-mobile': [
        { tool: 'spawn_artboard', args: { id: 'board-mobile', preset: 'mobile' } },
        {
          tool: 'insert_component',
          args: {
            parentId: 'board-mobile',
            component: {
              id: 'row',
              type: 'frame',
              width: 1000,
              layout: { direction: 'horizontal', gap: 24 },
              children: [
                { id: 'a', type: 'text', text: 'Versioned', fill: '#FFFFFF' },
                { id: 'b', type: 'text', text: 'Auditable', fill: '#FFFFFF' },
                { id: 'c', type: 'text', text: 'Agent-ready', fill: '#FFFFFF' },
              ],
            },
          },
        },
      ],
    });
    const result = await runTask(responsiveMobileTask, naive);
    const byId = Object.fromEntries(result.checks.map((c) => [c.id, c.passed]));
    expect(byId['mobile-artboard']).toBe(true);
    expect(byId['single-column']).toBe(false);
    expect(byId['no-overflow']).toBe(false);
    expect(byId['desktop-untouched']).toBe(true);
    expect(result.score).toBeLessThan(50);
  });

  it('captures agent errors and still scores the final scene', async () => {
    const crashing: BenchAgent = {
      name: 'crashing',
      run: async (session) => {
        await session.callTool('insert_component', {
          parentId: 'board',
          component: { id: 'pricing-card', type: 'frame', width: 320, layout: { direction: 'vertical' } },
        });
        throw new Error('model connection lost');
      },
    };
    const result = await runTask(pricingCardTask, crashing);
    expect(result.agentError).toBe('model connection lost');
    expect(result.checks.find((c) => c.id === 'card-exists')!.passed).toBe(true);
  });

  it('enforces the per-task time limit', async () => {
    const slow: BenchAgent = { name: 'slow', run: () => new Promise((resolve) => setTimeout(resolve, 5000)) };
    const result = await runTask(pricingCardTask, slow, { timeoutMs: 20 });
    expect(result.agentError).toMatch(/20ms time limit/);
  });

  it('applies custom score weights', async () => {
    const agent = new ScriptedAgent('extra-calls', {
      'pricing-card': [
        ...[0, 1, 2, 3].map(() => ({ tool: 'audit_design', args: { nodeId: 'board' } })),
        { tool: 'insert_component', args: { parentId: 'board', component: { id: 'pricing-card', type: 'frame', width: 320, layout: { direction: 'vertical' } } } },
      ],
    });
    const efficiencyOnly = await runTask(pricingCardTask, agent, {
      weights: { functional: 0, audit: 0, visual: 0, efficiency: 1 },
    });
    expect(efficiencyOnly.score).toBe(Math.round(efficiencyOnly.goalCompletion * efficiencyOnly.efficiency.score));
    await expect(
      runTask(pricingCardTask, agent, { weights: { functional: 0, audit: 0, visual: 0, efficiency: 0 } })
    ).rejects.toThrow(/positive/);
  });

  it('exposes the starting scene and tokens to agents', async () => {
    let context = '';
    let toolNames: string[] = [];
    await runTask(tokenizeColorsTask, {
      name: 'probe',
      run: async (session) => {
        context = session.sceneContext;
        toolNames = session.tools.map((t) => t.name);
      },
    });
    const parsed = JSON.parse(context) as { rootId: string; nodes: Array<{ id: string }>; tokens: Record<string, unknown> };
    expect(parsed.rootId).toBe('root');
    expect(parsed.nodes.map((n) => n.id)).toContain('promo-button-label');
    expect(parsed.tokens).toHaveProperty('colors');
    expect(toolNames).toEqual(expect.arrayContaining(['insert_component', 'update_node', 'audit_design', 'render_viewport']));
    expect(context).toBe(describeScene(buildScene(tokenizeColorsTask.fixture).store, tokenizeColorsTask.fixture));
  });

  it('selects tasks by id and rejects unknown ids', () => {
    expect(selectTasks().map((t) => t.id)).toEqual(BUILTIN_TASKS.map((t) => t.id));
    expect(selectTasks(['tokenize-colors']).map((t) => t.id)).toEqual(['tokenize-colors']);
    expect(() => selectTasks(['nope'])).toThrow(/Unknown bench task "nope"/);
  });

  it('formats a colorless report without emojis', async () => {
    const suite = await runSuite([pricingCardTask], createOracleAgent());
    const report = formatBenchReport(suite, { color: false, verbose: true });
    expect(report).toContain('Suite score: 100/100');
    expect(report).toContain('insert_component');
    expect(report).not.toMatch(/\x1b\[/);
    expect(report).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/u);
  });
});

describe('VitraBench session lifecycle', () => {
  it('ignores tool calls made after the run has ended', async () => {
    let lateResult: { isError: boolean } | undefined;
    let release: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      release = resolve;
    });
    const lingering: BenchAgent = {
      name: 'lingering',
      run: (session) => {
        setTimeout(async () => {
          lateResult = await session.callTool('insert_component', {
            parentId: 'board',
            component: { id: 'pricing-card', type: 'frame', width: 320 },
          });
          release();
        }, 50);
        return new Promise(() => undefined);
      },
    };
    const result = await runTask(pricingCardTask, lingering, { timeoutMs: 10 });
    await finished;
    expect(result.checks.find((c) => c.id === 'card-exists')!.passed).toBe(false);
    expect(result.calls).toHaveLength(0);
    expect(lateResult?.isError).toBe(true);
  });
});

describe('VitraBench scoring rules', () => {
  it('gates quality sub-scores on guard credit as well as goal completion', async () => {
    // Completes the mobile layout but also wrecks the desktop artboard it was
    // told to leave alone.
    const vandal = new ScriptedAgent('vandal', {
      'responsive-mobile': [
        ...(REFERENCE_SOLUTIONS['responsive-mobile'] ?? []),
        { tool: 'update_node', args: { nodeId: 'desktop-heading', patch: { text: 'Overwritten' } } },
      ],
    });
    const result = await runTask(responsiveMobileTask, vandal);
    expect(result.goalCompletion).toBe(1);
    expect(result.guardCredit).toBeLessThan(1);
    expect(result.auditScore).toBe(100);
    expect(result.visual.ssim).toBeCloseTo(1, 6);
    const weights = resolveWeights(responsiveMobileTask);
    const gate = result.goalCompletion * result.guardCredit;
    expect(result.score).toBe(
      Math.round(
        weights.functional * result.functionalScore +
          gate * (weights.audit * result.auditScore + weights.visual * result.visual.score + weights.efficiency * result.efficiency.score)
      )
    );
    expect(result.score).toBeLessThan(50);
  });

  it('penalises aspect-ratio changes in the size ratio', () => {
    expect(computeSizeRatio({ width: 400, height: 200 }, { width: 200, height: 400 })).toBeCloseTo(0.25, 10);
    expect(computeSizeRatio({ width: 320, height: 300 }, { width: 320, height: 300 })).toBe(1);
    expect(computeSizeRatio({ width: 0, height: 10 }, { width: 10, height: 10 })).toBe(0);
  });

  it('layers task weights over defaults and run options over task weights', () => {
    const task = { weights: { visual: 0, functional: 0.8 } };
    const fromTask = resolveWeights(task);
    const total = 0.8 + DEFAULT_WEIGHTS.audit + DEFAULT_WEIGHTS.efficiency;
    expect(fromTask.visual).toBe(0);
    expect(fromTask.functional).toBeCloseTo(0.8 / total, 10);
    const fromOptions = resolveWeights(task, { weights: { visual: 0.5 } });
    expect(fromOptions.visual).toBeGreaterThan(0);
    expect(() => resolveWeights({ weights: { audit: -1 } })).toThrow(/non-negative/);
  });

  it('down-weights visual and audit on the token migration task', () => {
    const weights = resolveWeights(tokenizeColorsTask);
    expect(weights.visual).toBeLessThan(DEFAULT_WEIGHTS.visual);
    expect(weights.audit).toBeLessThan(DEFAULT_WEIGHTS.audit);
    expect(weights.functional).toBeGreaterThan(DEFAULT_WEIGHTS.functional);
  });

  it('renders each task reference once and reuses it', async () => {
    const first = getReferenceImage(pricingCardTask, 1);
    expect(getReferenceImage(pricingCardTask, 1)).toBe(first);
    expect(getReferenceImage(pricingCardTask, 2)).not.toBe(first);
    const image = await first;
    expect(image.width).toBeGreaterThan(0);
  });
});

describe('VitraBench repeated runs', () => {
  it('repeats each task and reports mean and sample standard deviation', async () => {
    let call = 0;
    // Alternates between a complete and an empty run of the pricing task.
    const flaky: BenchAgent = {
      name: 'flaky',
      run: async (session) => {
        if (call++ % 2 === 0) {
          for (const step of REFERENCE_SOLUTIONS['pricing-card'] ?? []) {
            await session.callTool(step.tool, structuredClone(step.args));
          }
        }
      },
    };
    const suite = await runSuite([pricingCardTask], flaky, { runs: 4 });
    expect(suite.runs).toBe(4);
    expect(suite.tasks.map((t) => [t.run, t.score])).toEqual([
      [0, 100],
      [1, 0],
      [2, 100],
      [3, 0],
    ]);
    const summary = suite.summaries[0]!;
    expect(summary.mean).toBe(50);
    expect(summary.std).toBeCloseTo(Math.sqrt((4 * 2500) / 3), 1);
    expect(summary.min).toBe(0);
    expect(summary.max).toBe(100);
    expect(suite.score).toBe(50);
    expect(suite.scoreStd).toBeCloseTo(summary.std, 1);

    const report = formatBenchReport(suite, { color: false });
    expect(report).toContain('4 runs per task');
    expect(report).toMatch(/Suite score:\s+50\/100 ± 57\.7/);
  });

  it('reports zero deviation for a single run and rejects invalid run counts', async () => {
    const suite = await runSuite([pricingCardTask], createOracleAgent());
    expect(suite.runs).toBe(1);
    expect(suite.scoreStd).toBe(0);
    expect(suite.summaries[0]!.std).toBe(0);
    await expect(runSuite([pricingCardTask], createOracleAgent(), { runs: 0 })).rejects.toThrow(/positive integer/);
  });
});

describe('VitraBench abort signal', () => {
  it('aborts the session signal when the run times out', async () => {
    let signal: AbortSignal | undefined;
    const waiting: BenchAgent = {
      name: 'waiting',
      run: (session) => {
        signal = session.signal;
        return new Promise(() => undefined);
      },
    };
    const result = await runTask(pricingCardTask, waiting, { timeoutMs: 10 });
    expect(result.agentError).toMatch(/time limit/);
    expect(signal?.aborted).toBe(true);
  });
});

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createDocumentNode,
  InMemorySceneStore,
  insertDeclarativeTree,
  type ISceneStore,
  type SceneNode,
} from '@vitra/core';
import { TokenRegistry } from '@vitra/tokens';
import { computeLayout } from '@vitra/layout';
import { renderToPng } from '@vitra/renderer';
import { auditDesign, type AuditResult } from '@vitra/eval';
import { createVitraServer } from '@vitra/mcp-server';
import { decodePng, type RgbaImage } from './png.js';
import { resizeRgba, ssimMetric, type ImageSimilarityMetric } from './similarity.js';
import { computeEfficiency, ToolCallRecorder } from './recorder.js';
import type {
  BenchAgent,
  BenchFixture,
  BenchSession,
  BenchTask,
  ScoreWeights,
  SuiteResult,
  TaskResult,
  TaskSummary,
  VisualMetrics,
} from './types.js';

/** Identifier of the document root created for every benchmark scene. */
export const BENCH_ROOT_ID = 'root';

/**
 * Default composite weights. Functional correctness dominates; audit quality
 * and visual fidelity follow; efficiency breaks ties between correct agents.
 */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  functional: 0.4,
  audit: 0.2,
  visual: 0.25,
  efficiency: 0.15,
};

/**
 * Options controlling a benchmark run.
 */
export interface RunOptions {
  /**
   * Overrides for the composite score weights, applied over the defaults and
   * any task-specific weights. The result is re-normalised to sum to 1.
   */
  weights?: Partial<ScoreWeights>;
  /** Image similarity metric (default: SSIM). */
  visualMetric?: ImageSimilarityMetric;
  /** Render scale for visual comparison (default 1). */
  renderScale?: number;
  /** Abort the agent after this many milliseconds (default: no limit). */
  timeoutMs?: number;
  /** Repetitions per task for `runSuite`, to measure run-to-run variance (default 1). */
  runs?: number;
}

/**
 * A freshly built scene and token registry for a fixture.
 */
export interface BenchScene {
  store: InMemorySceneStore;
  tokenRegistry: TokenRegistry;
}

/**
 * Builds an isolated scene from a fixture: a document root with each fixture
 * tree inserted in order, and the fixture tokens registered.
 */
export function buildScene(fixture: BenchFixture): BenchScene {
  const store = new InMemorySceneStore(createDocumentNode({ id: BENCH_ROOT_ID, name: 'Bench Canvas' }));
  for (const node of fixture.nodes) {
    insertDeclarativeTree(store, node, BENCH_ROOT_ID);
  }
  const tokenRegistry = new TokenRegistry();
  if (fixture.tokens) {
    tokenRegistry.registerTokens(fixture.tokens);
  }
  return { store, tokenRegistry };
}

/**
 * Serialises a scene into the compact JSON context handed to agents: nodes in
 * depth-first order with structural bookkeeping fields removed, plus tokens.
 */
export function describeScene(store: ISceneStore, fixture: BenchFixture): string {
  const nodes: Array<Record<string, unknown>> = [];
  const visit = (node: SceneNode): void => {
    if (node.type !== 'document') {
      const { childIds: _c, visible: _v, locked: _l, ...rest } = node as SceneNode & {
        childIds?: string[];
      };
      nodes.push(rest);
    }
    for (const child of store.getChildren(node.id)) {
      visit(child);
    }
  };
  visit(store.getRoot());
  return JSON.stringify({ rootId: BENCH_ROOT_ID, nodes, tokens: fixture.tokens ?? {} });
}

/**
 * Renders a node to RGBA pixels through the production layout and renderer.
 */
export async function renderNode(
  store: ISceneStore,
  nodeId: string,
  tokenRegistry: TokenRegistry,
  scale = 1
): Promise<RgbaImage> {
  const layout = await computeLayout(store, nodeId);
  const png = await renderToPng({ store, targetNodeId: nodeId, layout, tokenRegistry }, { scale });
  return decodePng(png);
}

/**
 * Runs one task against one agent in an isolated scene and scores the result.
 * Agent exceptions and timeouts are captured in `agentError`; the final scene
 * is scored regardless so partial progress is still measured.
 *
 * When the run ends (normally, by error, or by timeout) the session's abort
 * signal fires and further tool calls are refused, so a lingering agent can
 * neither alter the scene being scored nor keep spending model tokens.
 *
 * @param run Zero-based repetition index recorded on the result.
 */
export async function runTask(
  task: BenchTask,
  agent: BenchAgent,
  options: RunOptions = {},
  run = 0
): Promise<TaskResult> {
  const started = performance.now();
  const { store, tokenRegistry } = buildScene(task.fixture);
  const initialSnapshot = store.exportSnapshot();
  const sceneContext = describeScene(store, task.fixture);

  const server = createVitraServer(store, tokenRegistry);
  const client = new Client({ name: `vitra-bench:${agent.name}`, version: '0.1.0' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const recorder = new ToolCallRecorder(client, store, tokenRegistry);
  const abort = new AbortController();
  const listed = await client.listTools();
  const session: BenchSession = {
    task,
    tools: listed.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    })),
    sceneContext,
    signal: abort.signal,
    callTool: (name, args) => recorder.callTool(name, args),
  };

  let agentError: string | undefined;
  try {
    await withTimeout(agent.run(session), options.timeoutMs);
  } catch (err: unknown) {
    agentError = err instanceof Error ? err.message : String(err);
  } finally {
    recorder.close();
    abort.abort(new Error('The benchmark run has ended.'));
    await client.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }

  const checks: TaskResult['checks'] = [];
  for (const check of task.checks) {
    const base = { id: check.id, description: check.description, kind: check.kind ?? 'goal', weight: check.weight ?? 1 };
    try {
      const outcome = await check.run({ store, tokenRegistry, initialSnapshot });
      checks.push({ ...base, ...outcome });
    } catch (err: unknown) {
      checks.push({
        ...base,
        passed: false,
        detail: `Check threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  const goalCompletion = weightedCredit(checks.filter((c) => c.kind === 'goal'));
  const guardCredit = weightedCredit(checks.filter((c) => c.kind === 'guard'), 1);
  const functionalScore = Math.round(100 * goalCompletion * guardCredit);

  let audit: AuditResult | null = null;
  if (store.getNode(task.targetNodeId)) {
    audit = await auditDesign(store, task.targetNodeId, { tokenRegistry }).catch(() => null);
  }
  const auditScore = audit ? audit.score : 0;

  const visual = await compareToReference(task, store, tokenRegistry, options);
  const calls = recorder.getRecords();
  const efficiency = computeEfficiency(calls, task.callBudget);

  const weights = resolveWeights(task, options);
  const qualityGate = goalCompletion * guardCredit;
  const score = Math.round(
    weights.functional * functionalScore +
      qualityGate *
        (weights.audit * auditScore + weights.visual * visual.score + weights.efficiency * efficiency.score)
  );

  const result: TaskResult = {
    taskId: task.id,
    title: task.title,
    category: task.category,
    agent: agent.name,
    run,
    checks,
    goalCompletion: round4(goalCompletion),
    guardCredit: round4(guardCredit),
    functionalScore,
    audit,
    auditScore,
    visual,
    efficiency,
    calls,
    score,
    durationMs: Math.round(performance.now() - started),
  };
  const usage = agent.consumeUsage?.();
  if (usage) {
    result.usage = usage;
  }
  if (agentError !== undefined) {
    result.agentError = agentError;
  }
  return result;
}

/**
 * Runs every task against one agent, `options.runs` times (default 1), and
 * aggregates per-task mean and sample standard deviation. Runs execute
 * sequentially: repetition by repetition, tasks in order within each.
 *
 * @throws Error when `options.runs` is not a positive integer.
 */
export async function runSuite(
  tasks: BenchTask[],
  agent: BenchAgent,
  options: RunOptions = {}
): Promise<SuiteResult> {
  const runs = options.runs ?? 1;
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error(`runSuite: runs must be a positive integer (got ${runs}).`);
  }
  const startedAt = new Date().toISOString();
  const results: TaskResult[] = [];
  for (let run = 0; run < runs; run++) {
    for (const task of tasks) {
      results.push(await runTask(task, agent, options, run));
    }
  }

  const summaries = tasks.map((task) => summarizeTask(task, results.filter((r) => r.taskId === task.id)));
  const suiteScorePerRun = Array.from({ length: runs }, (_, run) =>
    mean(results.filter((r) => r.run === run).map((r) => r.score))
  );
  return {
    agent: agent.name,
    startedAt,
    runs,
    tasks: results,
    summaries,
    score: Math.round(mean(summaries.map((s) => s.mean))),
    scoreStd: round2(sampleStd(suiteScorePerRun)),
  };
}

/**
 * Aggregates the repeated results of one task.
 */
function summarizeTask(task: BenchTask, results: TaskResult[]): TaskSummary {
  const scores = results.map((r) => r.score);
  return {
    taskId: task.id,
    title: task.title,
    category: task.category,
    runs: results.length,
    mean: round2(mean(scores)),
    std: round2(sampleStd(scores)),
    min: scores.length ? Math.min(...scores) : 0,
    max: scores.length ? Math.max(...scores) : 0,
    functional: round2(mean(results.map((r) => r.functionalScore))),
    audit: round2(mean(results.map((r) => r.auditScore))),
    visual: round2(mean(results.map((r) => r.visual.score))),
    efficiency: round2(mean(results.map((r) => r.efficiency.score))),
    ssim: round4(mean(results.map((r) => r.visual.ssim))),
    calls: round2(mean(results.map((r) => r.efficiency.totalCalls))),
    wastedCalls: round2(mean(results.map((r) => r.efficiency.wastedCalls))),
  };
}

/**
 * Reference renders keyed by task and render scale. The reference scene is
 * deterministic, so it is rendered once per process rather than once per run.
 */
const referenceCache = new WeakMap<BenchTask, Map<number, Promise<RgbaImage>>>();

/**
 * Returns the cached reference render for a task, rendering it on first use.
 * A failed render is evicted so a later run can retry.
 */
export function getReferenceImage(task: BenchTask, scale: number): Promise<RgbaImage> {
  let byScale = referenceCache.get(task);
  if (!byScale) {
    byScale = new Map();
    referenceCache.set(task, byScale);
  }
  let image = byScale.get(scale);
  if (!image) {
    const reference = buildScene(task.reference);
    image = renderNode(reference.store, task.targetNodeId, reference.tokenRegistry, scale);
    const cache = byScale;
    image.catch(() => cache.delete(scale));
    byScale.set(scale, image);
  }
  return image;
}

/**
 * Per-dimension size agreement: `min(w)/max(w) * min(h)/max(h)`. Unlike an
 * area ratio, this penalises transposed or stretched renders.
 */
export function computeSizeRatio(
  a: { width: number; height: number },
  b: { width: number; height: number }
): number {
  const ratio = (x: number, y: number): number => (Math.max(x, y) === 0 ? 0 : Math.min(x, y) / Math.max(x, y));
  return ratio(a.width, b.width) * ratio(a.height, b.height);
}

/**
 * Renders the agent's target node and compares it to the reference render.
 */
async function compareToReference(
  task: BenchTask,
  store: ISceneStore,
  tokenRegistry: TokenRegistry,
  options: RunOptions
): Promise<VisualMetrics> {
  const metric = options.visualMetric ?? ssimMetric;
  const scale = options.renderScale ?? 1;
  const referenceImage = await getReferenceImage(task, scale);
  const referenceSize = { width: referenceImage.width, height: referenceImage.height };

  if (!store.getNode(task.targetNodeId)) {
    return {
      ssim: 0,
      sizeRatio: 0,
      candidateSize: null,
      referenceSize,
      score: 0,
      error: `Target node "${task.targetNodeId}" does not exist in the final scene.`,
    };
  }

  try {
    const candidate = await renderNode(store, task.targetNodeId, tokenRegistry, scale);
    const sizeRatio = computeSizeRatio(candidate, referenceImage);
    const resized = resizeRgba(candidate, referenceImage.width, referenceImage.height);
    const similarity = await metric.compare(resized, referenceImage);
    return {
      ssim: round4(similarity),
      sizeRatio: round4(sizeRatio),
      candidateSize: { width: candidate.width, height: candidate.height },
      referenceSize,
      score: Math.round(100 * similarity * Math.sqrt(sizeRatio)),
    };
  } catch (err: unknown) {
    return {
      ssim: 0,
      sizeRatio: 0,
      candidateSize: null,
      referenceSize,
      score: 0,
      error: `Render failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Resolves composite weights: defaults, then task-specific weights, then
 * run options, re-normalised to sum to 1.
 *
 * @throws Error when any weight is negative or not finite, or all are zero.
 */
export function resolveWeights(task: Pick<BenchTask, 'weights'>, options: Pick<RunOptions, 'weights'> = {}): ScoreWeights {
  const merged: ScoreWeights = { ...DEFAULT_WEIGHTS };
  for (const layer of [task.weights, options.weights]) {
    if (!layer) continue;
    for (const key of Object.keys(merged) as Array<keyof ScoreWeights>) {
      const value = layer[key];
      if (value !== undefined) merged[key] = value;
    }
  }
  const values = Object.values(merged);
  if (values.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error(`Score weights must be finite and non-negative (got ${JSON.stringify(merged)}).`);
  }
  const total = values.reduce((sum, v) => sum + v, 0);
  if (!(total > 0)) {
    throw new Error('Score weights must sum to a positive number.');
  }
  return {
    functional: merged.functional / total,
    audit: merged.audit / total,
    visual: merged.visual / total,
    efficiency: merged.efficiency / total,
  };
}

/**
 * Weighted mean of check credit in [0, 1]. Uses `credit` when a check reports
 * partial credit, otherwise 1 for passed and 0 for failed.
 *
 * @param empty Value returned when there are no checks of this kind.
 */
function weightedCredit(
  checks: Array<{ weight: number; passed: boolean; credit?: number }>,
  empty = 0
): number {
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  if (total === 0) return empty;
  const earned = checks.reduce(
    (sum, c) => sum + c.weight * Math.max(0, Math.min(1, c.credit ?? (c.passed ? 1 : 0))),
    0
  );
  return earned / total;
}

/** Arithmetic mean; 0 for an empty list. */
function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Sample standard deviation (n - 1); 0 for fewer than two values. */
function sampleStd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

/** Rounds to two decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rounds to four decimal places. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Races a promise against a timer, rejecting with a descriptive error when
 * the limit is reached. A missing or non-positive limit disables the timer.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Agent exceeded the ${timeoutMs}ms time limit.`)),
      timeoutMs
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

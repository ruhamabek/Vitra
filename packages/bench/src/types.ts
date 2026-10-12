import type { DeclarativeNode, ISceneStore, SceneSnapshot } from '@vitra/core';
import type { TokenRegistry, TokenTree } from '@vitra/tokens';
import type { AuditResult } from '@vitra/eval';

/**
 * Category a benchmark task exercises. Used for grouping in reports.
 */
export type BenchTaskCategory = 'compose' | 'responsive' | 'tokens';

/**
 * Initial state an agent starts from. The harness builds a fresh in-memory
 * scene from this fixture for every run so tasks never share state.
 */
export interface BenchFixture {
  /** Declarative trees inserted under the document root, in order. */
  nodes: DeclarativeNode[];
  /** W3C design tokens registered before the agent starts. */
  tokens?: TokenTree;
}

/**
 * Outcome of a single task-specific functional check.
 */
export interface CheckOutcome {
  passed: boolean;
  /** Human-readable explanation of why the check passed or failed. */
  detail: string;
  /**
   * Partial credit in [0, 1]. Defaults to 1 when passed and 0 otherwise.
   * Useful for checks that measure coverage, such as token migration.
   */
  credit?: number;
}

/**
 * Role of a check in scoring.
 * - `goal`: measures whether the requested change was made.
 * - `guard`: measures that nothing else was broken. Guards cannot earn credit
 *   on their own, so an agent that does nothing does not score on them.
 */
export type BenchCheckKind = 'goal' | 'guard';

/**
 * Read-only view of the final scene handed to task checks.
 */
export interface CheckContext {
  store: ISceneStore;
  tokenRegistry: TokenRegistry;
  /** Scene snapshot captured before the agent made any tool call. */
  initialSnapshot: SceneSnapshot;
}

/**
 * Deterministic functional assertion over the final scene.
 */
export interface BenchCheck {
  id: string;
  description: string;
  /** Scoring role (default `goal`). */
  kind?: BenchCheckKind;
  /** Relative weight inside the task's functional score (default 1). */
  weight?: number;
  run(ctx: CheckContext): CheckOutcome | Promise<CheckOutcome>;
}

/**
 * A single benchmark task: a natural-language instruction, a starting scene,
 * a reference solution used for visual comparison, and functional checks.
 */
export interface BenchTask {
  id: string;
  title: string;
  category: BenchTaskCategory;
  /** Instruction given verbatim to the agent. */
  prompt: string;
  fixture: BenchFixture;
  /**
   * Node the agent is expected to produce or modify. It is rendered and
   * audited at the end of the run and compared against the reference render.
   */
  targetNodeId: string;
  /**
   * Reference solution: the full scene (fixture plus expected result) as
   * declarative trees under the root. Rendered at `targetNodeId` to produce
   * the visual ground truth.
   */
  reference: BenchFixture;
  checks: BenchCheck[];
  /**
   * Number of tool calls a competent agent needs, including one verification
   * call. Runs at or under budget receive full call-count efficiency credit.
   */
  callBudget: number;
  /**
   * Task-specific composite weights, applied over the defaults. Use this when
   * a sub-score carries no signal for the task, for example visual similarity
   * on a refactor whose reference renders identically to the fixture.
   */
  weights?: Partial<ScoreWeights>;
}

/**
 * Minimal description of an MCP tool exposed to agents.
 */
export interface BenchToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Content block returned from an MCP tool call.
 */
export type BenchToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

/**
 * Result of a recorded tool call as seen by the agent.
 */
export interface BenchToolResult {
  isError: boolean;
  content: BenchToolContent[];
}

/**
 * Handle given to an agent for the duration of one task run. All tool calls
 * must go through `callTool` so the harness can record them.
 */
export interface BenchSession {
  task: BenchTask;
  /** Tools advertised by the Vitra MCP server. */
  tools: BenchToolDefinition[];
  /**
   * Compact JSON description of the starting scene and registered tokens.
   * The MCP surface has no scene-read tool, so agents receive this as context.
   */
  sceneContext: string;
  /**
   * Aborted when the run ends, including on timeout. Agents should stop work
   * (and cancel in-flight requests) when it fires; tool calls made afterwards
   * are refused.
   */
  signal: AbortSignal;
  /** Invokes a Vitra MCP tool. Calls are recorded and executed in order. */
  callTool(name: string, args: Record<string, unknown>): Promise<BenchToolResult>;
}

/**
 * An agent under evaluation. Implementations drive the session through
 * `callTool` and resolve once they consider the task complete.
 */
export interface BenchAgent {
  /** Stable identifier written into reports (e.g. "oracle", "anthropic:<model>"). */
  readonly name: string;
  run(session: BenchSession): Promise<void>;
  /**
   * Optional: returns model token usage accumulated since the previous call
   * and resets the counter. Called once after each task.
   */
  consumeUsage?(): TokenUsage;
}

/**
 * Model token usage for one task run.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * One tool invocation captured by the recorder.
 */
export interface ToolCallRecord {
  index: number;
  name: string;
  args: Record<string, unknown>;
  isError: boolean;
  durationMs: number;
  /** Whether the call changed the scene graph or token registry. */
  mutated: boolean;
  /** Property-level edits the call produced, as "nodeId.prop" keys. */
  edits: string[];
  /** Reason the call counted as wasted, if it did. */
  wasted?: 'error' | 'no-op' | 'superseded';
}

/**
 * Tool-call efficiency metrics for one run.
 */
export interface EfficiencyMetrics {
  totalCalls: number;
  mutatingCalls: number;
  readOnlyCalls: number;
  failedCalls: number;
  noOpCalls: number;
  /** Mutating calls whose every edit was overwritten, reverted, or deleted later. */
  supersededCalls: number;
  wastedCalls: number;
  callBudget: number;
  callsByTool: Record<string, number>;
  /** 0-100 efficiency score. */
  score: number;
}

/**
 * Visual comparison between the agent's render and the reference render.
 */
export interface VisualMetrics {
  /** Mean structural similarity in [0, 1]; 0 when rendering failed. */
  ssim: number;
  /**
   * Per-dimension size agreement in [0, 1]:
   * `min(w) / max(w) * min(h) / max(h)`. Penalises aspect-ratio changes that
   * an area ratio would miss (400x200 against 200x400 scores 0.25).
   */
  sizeRatio: number;
  candidateSize: { width: number; height: number } | null;
  referenceSize: { width: number; height: number };
  /** 0-100 visual score. */
  score: number;
  error?: string;
}

/**
 * Full scored result for one task.
 */
export interface TaskResult {
  taskId: string;
  title: string;
  category: BenchTaskCategory;
  agent: string;
  /** Zero-based repetition index when a task is run more than once. */
  run: number;
  checks: Array<{ id: string; description: string; kind: BenchCheckKind; weight: number } & CheckOutcome>;
  /** Weighted goal-check credit in [0, 1]. Scales the quality sub-scores. */
  goalCompletion: number;
  /** Weighted guard-check credit in [0, 1]; 1 when the task has no guards. */
  guardCredit: number;
  /** Goal completion multiplied by guard-check credit, as 0-100. */
  functionalScore: number;
  audit: AuditResult | null;
  /** Audit score (0-100); 0 when the target node is missing. */
  auditScore: number;
  visual: VisualMetrics;
  efficiency: EfficiencyMetrics;
  calls: ToolCallRecord[];
  /**
   * Composite score (0-100):
   * `functional * w.functional + qualityGate * (audit * w.audit + visual * w.visual + efficiency * w.efficiency)`
   * where `qualityGate = goalCompletion * guardCredit`. An untouched scene, or
   * one where the agent broke what it was told to leave alone, cannot collect
   * full audit, visual, or efficiency credit.
   */
  score: number;
  durationMs: number;
  /** Model token usage, when the agent reports it. */
  usage?: TokenUsage;
  /** Error raised by the agent itself, if any. The run is still scored. */
  agentError?: string;
}

/**
 * Summary statistics for one task across repeated runs.
 */
export interface TaskSummary {
  taskId: string;
  title: string;
  category: BenchTaskCategory;
  runs: number;
  /** Mean composite score. */
  mean: number;
  /** Sample standard deviation of the composite score (0 for a single run). */
  std: number;
  min: number;
  max: number;
  /** Mean sub-scores across runs. */
  functional: number;
  audit: number;
  visual: number;
  efficiency: number;
  /** Mean SSIM across runs. */
  ssim: number;
  /** Mean tool calls and wasted calls across runs. */
  calls: number;
  wastedCalls: number;
}

/**
 * Aggregate result for a suite run.
 */
export interface SuiteResult {
  agent: string;
  startedAt: string;
  /** Number of repetitions per task. */
  runs: number;
  /** Every individual task run, ordered by run, then by task. */
  tasks: TaskResult[];
  /** Per-task statistics across runs, in task order. */
  summaries: TaskSummary[];
  /** Mean of the per-task mean scores. */
  score: number;
  /**
   * Sample standard deviation of the suite score across runs (the mean task
   * score of each repetition); 0 for a single run.
   */
  scoreStd: number;
}

/**
 * Relative weights of the sub-scores in the composite task score.
 */
export interface ScoreWeights {
  functional: number;
  audit: number;
  visual: number;
  efficiency: number;
}

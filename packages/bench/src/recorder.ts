import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ISceneStore, SceneNode, SceneSnapshot } from '@vitra/core';
import type { TokenRegistry, TokenRegistrySnapshot } from '@vitra/tokens';
import type { BenchToolContent, BenchToolResult, EfficiencyMetrics, ToolCallRecord } from './types.js';

/**
 * Tools that are expected to change state. A successful call to one of these
 * that leaves the scene untouched is counted as a no-op.
 */
export const MUTATING_TOOLS: ReadonlySet<string> = new Set([
  'spawn_artboard',
  'create_frame',
  'create_text',
  'create_shape',
  'create_icon',
  'insert_component',
  'update_node',
  'delete_node',
  'move_node',
  'load_project',
  'register_tokens',
  'set_theme',
]);

const SESSION_CLOSED_RESULT: BenchToolResult = {
  isError: true,
  content: [{ type: 'text', text: 'The benchmark session has ended; further tool calls are ignored.' }],
};

/**
 * Records every tool call an agent makes against the Vitra MCP server along
 * with the property-level scene and token edits each call produced. The edit
 * log is what allows wasted work (failed, no-op, and later-overwritten edits)
 * to be measured after the run.
 *
 * Calls are executed one at a time in arrival order. Agents may issue calls
 * concurrently, but each call's before/after snapshots must bracket only its
 * own effects for edits to be attributed correctly.
 */
export class ToolCallRecorder {
  private readonly records: ToolCallRecord[] = [];
  private closed = false;
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * @param client Connected MCP client for the Vitra server under test.
   * @param store Scene store the server mutates; snapshotted around each call.
   * @param tokenRegistry Token registry the server mutates; snapshotted around each call.
   */
  constructor(
    private readonly client: Client,
    private readonly store: ISceneStore,
    private readonly tokenRegistry: TokenRegistry
  ) {}

  /**
   * Invokes a tool through the MCP client and records the outcome. Transport
   * or protocol errors are converted into an error result rather than thrown,
   * so that a misbehaving agent cannot abort the benchmark run. Calls made
   * after `close()` (including calls still queued at that point) are refused
   * and not recorded.
   */
  callTool(name: string, args: Record<string, unknown>): Promise<BenchToolResult> {
    const run = this.queue.then(() => this.execute(name, args));
    this.queue = run.catch(() => undefined);
    return run;
  }

  /**
   * Executes and records a single call. Must only be invoked through the
   * serialising queue in `callTool`.
   */
  private async execute(name: string, args: Record<string, unknown>): Promise<BenchToolResult> {
    if (this.closed) {
      return SESSION_CLOSED_RESULT;
    }
    const before = this.store.exportSnapshot();
    const tokensBefore = this.tokenRegistry.snapshot();
    const started = performance.now();
    let result: BenchToolResult;
    try {
      const raw = await this.client.callTool({ name, arguments: args });
      result = normalizeResult(raw);
    } catch (err: unknown) {
      result = {
        isError: true,
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      };
    }
    const durationMs = performance.now() - started;
    const after = this.store.exportSnapshot();

    const edits = [...diffSnapshotEdits(before, after), ...diffTokenEdits(tokensBefore, this.tokenRegistry.snapshot())];
    const mutated = edits.length > 0 || snapshotOrderChanged(before, after);

    this.records.push({
      index: this.records.length,
      name,
      args,
      isError: result.isError,
      durationMs: Math.round(durationMs * 100) / 100,
      mutated,
      edits,
    });
    return result;
  }

  /**
   * Stops accepting calls. Used when a run ends while the agent is still
   * executing (for example after a timeout), so late calls cannot alter the
   * scene being scored.
   */
  close(): void {
    this.closed = true;
  }

  /**
   * Returns the call log with `wasted` reasons resolved. Supersession can only
   * be determined once the run is over, so this should be called afterwards.
   */
  getRecords(): ToolCallRecord[] {
    const lastWriter = new Map<string, number>();
    for (const record of this.records) {
      for (const key of record.edits) {
        lastWriter.set(key, record.index);
      }
    }

    return this.records.map((record) => {
      let wasted: ToolCallRecord['wasted'];
      if (record.isError) {
        wasted = 'error';
      } else if (MUTATING_TOOLS.has(record.name) && !record.mutated) {
        wasted = 'no-op';
      } else if (
        record.edits.length > 0 &&
        record.edits.every((key) => (lastWriter.get(key) ?? record.index) > record.index)
      ) {
        wasted = 'superseded';
      }
      return wasted ? { ...record, wasted } : { ...record };
    });
  }
}

/**
 * Computes efficiency metrics from a resolved call log.
 *
 * The score blends two equally weighted components:
 * - call economy: `min(1, callBudget / totalCalls)`
 * - waste avoidance: `1 - wastedCalls / totalCalls`
 *
 * A run with zero calls scores 0 because no work was attempted.
 */
export function computeEfficiency(records: ToolCallRecord[], callBudget: number): EfficiencyMetrics {
  const callsByTool: Record<string, number> = {};
  let mutatingCalls = 0;
  let failedCalls = 0;
  let noOpCalls = 0;
  let supersededCalls = 0;

  for (const record of records) {
    callsByTool[record.name] = (callsByTool[record.name] ?? 0) + 1;
    if (record.mutated) mutatingCalls++;
    if (record.wasted === 'error') failedCalls++;
    if (record.wasted === 'no-op') noOpCalls++;
    if (record.wasted === 'superseded') supersededCalls++;
  }

  const totalCalls = records.length;
  const wastedCalls = failedCalls + noOpCalls + supersededCalls;
  let score = 0;
  if (totalCalls > 0) {
    const economy = Math.min(1, Math.max(1, callBudget) / totalCalls);
    const wasteAvoidance = 1 - wastedCalls / totalCalls;
    score = Math.round(100 * (0.5 * economy + 0.5 * wasteAvoidance));
  }

  return {
    totalCalls,
    mutatingCalls,
    readOnlyCalls: totalCalls - mutatingCalls,
    failedCalls,
    noOpCalls,
    supersededCalls,
    wastedCalls,
    callBudget,
    callsByTool,
    score,
  };
}

/**
 * Property-level edit keys between two snapshots:
 * - `<id>#exists` when a node is created or deleted
 * - `<id>#parent` when a node is re-parented
 * - `<id>.<prop>` when a property of a surviving node changes
 *
 * `childIds` is excluded because it changes as a side effect of inserts,
 * deletes, and moves that are already captured on the child itself.
 */
export function diffSnapshotEdits(before: SceneSnapshot, after: SceneSnapshot): string[] {
  const edits: string[] = [];
  const ids = new Set([...Object.keys(before.nodes), ...Object.keys(after.nodes)]);
  for (const id of ids) {
    const a = before.nodes[id];
    const b = after.nodes[id];
    if (!a || !b) {
      edits.push(`${id}#exists`);
      continue;
    }
    if (a.parentId !== b.parentId) {
      edits.push(`${id}#parent`);
    }
    const props = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const prop of props) {
      if (prop === 'childIds' || prop === 'parentId') continue;
      const va = (a as Record<string, unknown>)[prop];
      const vb = (b as Record<string, unknown>)[prop];
      if (JSON.stringify(va) !== JSON.stringify(vb)) {
        edits.push(`${id}.${prop}`);
      }
    }
  }
  return edits.sort();
}

/**
 * Whether any node's child order changed between snapshots. Reorders are real
 * mutations even though they produce no property-level edit keys.
 */
function snapshotOrderChanged(before: SceneSnapshot, after: SceneSnapshot): boolean {
  for (const [id, node] of Object.entries(after.nodes)) {
    const prev = before.nodes[id];
    if (prev && JSON.stringify(childIdsOf(prev)) !== JSON.stringify(childIdsOf(node))) {
      return true;
    }
  }
  return false;
}

/**
 * Child ids of a container node, or an empty list for leaf nodes.
 */
function childIdsOf(node: SceneNode): string[] {
  return 'childIds' in node && Array.isArray(node.childIds) ? node.childIds : [];
}

/**
 * Token edit keys between two registry snapshots:
 * - `tokens:base.<path>` for a changed, added, or removed base token
 * - `tokens:<theme>.<path>` for a changed theme override
 * - `tokens#theme` when the active theme changes
 *
 * Re-registering identical values yields no keys, so such calls count as no-ops.
 */
export function diffTokenEdits(before: TokenRegistrySnapshot, after: TokenRegistrySnapshot): string[] {
  const edits: string[] = [];
  const diffMap = (
    scope: string,
    a: Record<string, string | number> = {},
    b: Record<string, string | number> = {}
  ): void => {
    for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[path] !== b[path]) edits.push(`tokens:${scope}.${path}`);
    }
  };
  diffMap('base', before.base, after.base);
  for (const theme of new Set([...Object.keys(before.themes), ...Object.keys(after.themes)])) {
    diffMap(theme, before.themes[theme], after.themes[theme]);
  }
  if (before.activeTheme !== after.activeTheme) {
    edits.push('tokens#theme');
  }
  return edits.sort();
}

/**
 * Converts a raw MCP `callTool` response into the benchmark's result shape,
 * keeping only text and image content blocks.
 */
function normalizeResult(raw: unknown): BenchToolResult {
  const obj = (raw ?? {}) as { isError?: unknown; content?: unknown };
  const content: BenchToolContent[] = [];
  if (Array.isArray(obj.content)) {
    for (const block of obj.content as Array<Record<string, unknown>>) {
      if (block.type === 'text' && typeof block.text === 'string') {
        content.push({ type: 'text', text: block.text });
      } else if (
        block.type === 'image' &&
        typeof block.data === 'string' &&
        typeof block.mimeType === 'string'
      ) {
        content.push({ type: 'image', data: block.data, mimeType: block.mimeType });
      }
    }
  }
  return { isError: obj.isError === true, content };
}

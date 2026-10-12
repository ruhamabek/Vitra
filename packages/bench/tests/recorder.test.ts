import { describe, it, expect } from 'vitest';
import { createDocumentNode, createFrameNode, InMemorySceneStore } from '@vitra/core';
import { computeEfficiency, diffSnapshotEdits, diffTokenEdits } from '../src/recorder.js';
import { runTask } from '../src/harness.js';
import { ScriptedAgent } from '../src/agents/scripted.js';
import { pricingCardTask, tokenizeColorsTask } from '../src/tasks/index.js';
import type { BenchAgent } from '../src/types.js';
import type { ToolCallRecord } from '../src/types.js';

function record(partial: Partial<ToolCallRecord> & { index: number }): ToolCallRecord {
  return { name: 'update_node', args: {}, isError: false, durationMs: 0, mutated: true, edits: [], ...partial };
}

describe('diffSnapshotEdits', () => {
  it('reports created, deleted, re-parented, and changed properties', () => {
    const store = new InMemorySceneStore(createDocumentNode({ id: 'root' }));
    store.insertNode(createFrameNode({ id: 'a', fill: '#000000' }), 'root');
    store.insertNode(createFrameNode({ id: 'b' }), 'root');
    store.insertNode(createFrameNode({ id: 'gone' }), 'root');
    const before = store.exportSnapshot();

    store.updateNode('a', { fill: '#FFFFFF' });
    store.moveNode('b', 'a');
    store.deleteNode('gone');
    store.insertNode(createFrameNode({ id: 'new' }), 'root');

    expect(diffSnapshotEdits(before, store.exportSnapshot())).toEqual([
      'a.fill',
      'b#parent',
      'gone#exists',
      'new#exists',
    ]);
  });

  it('returns no edits for identical snapshots', () => {
    const store = new InMemorySceneStore(createDocumentNode({ id: 'root' }));
    const snap = store.exportSnapshot();
    expect(diffSnapshotEdits(snap, snap)).toEqual([]);
  });
});

describe('computeEfficiency', () => {
  it('awards full credit within budget and without waste', () => {
    const metrics = computeEfficiency([record({ index: 0 }), record({ index: 1, mutated: false, name: 'audit_design' })], 2);
    expect(metrics.score).toBe(100);
    expect(metrics.mutatingCalls).toBe(1);
    expect(metrics.readOnlyCalls).toBe(1);
  });

  it('penalises exceeding the budget and wasted calls', () => {
    const records = [
      record({ index: 0, wasted: 'error', isError: true, mutated: false }),
      record({ index: 1, wasted: 'no-op', mutated: false }),
      record({ index: 2, wasted: 'superseded' }),
      record({ index: 3 }),
    ];
    const metrics = computeEfficiency(records, 2);
    // economy 2/4 = 0.5, waste avoidance 1 - 3/4 = 0.25
    expect(metrics.score).toBe(38);
    expect(metrics.failedCalls).toBe(1);
    expect(metrics.noOpCalls).toBe(1);
    expect(metrics.supersededCalls).toBe(1);
    expect(metrics.wastedCalls).toBe(3);
    expect(metrics.callsByTool).toEqual({ update_node: 4 });
  });

  it('scores zero when no calls were made', () => {
    expect(computeEfficiency([], 3).score).toBe(0);
  });
});

describe('ToolCallRecorder via runTask', () => {
  it('classifies failed, no-op, superseded, and churned calls', async () => {
    const agent = new ScriptedAgent('wasteful', {
      'pricing-card': [
        { tool: 'create_frame', args: { id: 'pricing-card', parentId: 'missing-parent' } },
        { tool: 'create_frame', args: { id: 'scratch', parentId: 'board' } },
        { tool: 'create_frame', args: { id: 'pricing-card', parentId: 'board', width: 320, fill: '#1E1E2E' } },
        { tool: 'update_node', args: { nodeId: 'pricing-card', patch: { fill: '#000000' } } },
        { tool: 'update_node', args: { nodeId: 'pricing-card', patch: { fill: '#1E1E2E' } } },
        { tool: 'update_node', args: { nodeId: 'pricing-card', patch: { fill: '#1E1E2E' } } },
        { tool: 'delete_node', args: { nodeId: 'scratch' } },
        { tool: 'audit_design', args: { nodeId: 'pricing-card' } },
      ],
    });
    const result = await runTask(pricingCardTask, agent);
    expect(result.calls.map((c) => c.wasted ?? 'ok')).toEqual([
      'error',
      'superseded',
      'ok',
      'superseded',
      'ok',
      'no-op',
      'ok',
      'ok',
    ]);
    expect(result.calls[7]!.mutated).toBe(false);
    expect(result.efficiency.wastedCalls).toBe(4);
    expect(result.efficiency.totalCalls).toBe(8);
  });
});

describe('diffTokenEdits', () => {
  it('reports changed base tokens, theme overrides, and theme switches only', () => {
    const before = { base: { a: '#000', b: 1 }, themes: { dark: { a: '#111' } }, activeTheme: null };
    const after = { base: { a: '#000', b: 2, c: 'x' }, themes: { dark: { a: '#111' }, light: { a: '#fff' } }, activeTheme: 'light' };
    expect(diffTokenEdits(before, after)).toEqual(['tokens#theme', 'tokens:base.b', 'tokens:base.c', 'tokens:light.a']);
    expect(diffTokenEdits(before, before)).toEqual([]);
  });
});

describe('ToolCallRecorder token tracking', () => {
  it('detects no-op token registration from registry state, not call arguments', async () => {
    const agent = new ScriptedAgent('tokens', {
      'tokenize-colors': [
        // Identical to the fixture tokens: no state change.
        { tool: 'register_tokens', args: { tokens: { colors: { surface: { $value: '#1E1E2E' } } } } },
        // New value, later overwritten: superseded.
        { tool: 'register_tokens', args: { tokens: { colors: { accent: '#F38BA8' } } } },
        { tool: 'register_tokens', args: { tokens: { colors: { accent: '#FAB387' } } } },
        { tool: 'set_theme', args: {} },
        { tool: 'set_theme', args: { theme: 'dark' } },
      ],
    });
    const result = await runTask(tokenizeColorsTask, agent);
    expect(result.calls.map((c) => c.wasted ?? 'ok')).toEqual(['no-op', 'superseded', 'ok', 'no-op', 'ok']);
    expect(result.calls[2]!.edits).toEqual(['tokens:base.colors.accent']);
    expect(result.calls[4]!.edits).toEqual(['tokens#theme']);
  });
});

describe('ToolCallRecorder concurrency', () => {
  it('attributes edits to the right call when an agent issues calls in parallel', async () => {
    const parallel: BenchAgent = {
      name: 'parallel',
      run: async (session) => {
        await Promise.all([
          session.callTool('update_node', { nodeId: 'promo-title', patch: { fill: '$colors.text.primary' } }),
          session.callTool('update_node', { nodeId: 'promo-body', patch: { fill: '$colors.text.muted' } }),
          session.callTool('update_node', { nodeId: 'promo-button', patch: { fill: '$colors.brand.primary' } }),
        ]);
      },
    };
    const result = await runTask(tokenizeColorsTask, parallel);
    expect(result.calls.map((c) => c.edits)).toEqual([
      ['promo-title.fill'],
      ['promo-body.fill'],
      ['promo-button.fill'],
    ]);
    expect(result.calls.every((c) => c.wasted === undefined)).toBe(true);
  });
});

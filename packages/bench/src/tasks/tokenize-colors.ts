import type { DeclarativeNode, SceneNode } from '@vitra/core';
import type { TokenRegistry, TokenTree } from '@vitra/tokens';
import type { BenchTask } from '../types.js';
import type { ScriptedCall } from '../agents/scripted.js';
import { fail, pass } from './helpers.js';

const TOKENS: TokenTree = {
  colors: {
    background: { $value: '#0F111A', $type: 'color' },
    surface: { $value: '#1E1E2E', $type: 'color' },
    text: {
      primary: { $value: '#CDD6F4', $type: 'color' },
      muted: { $value: '#A6ADC8', $type: 'color' },
    },
    brand: {
      primary: { $value: '#89B4FA', $type: 'color' },
      on: { $value: '#11111B', $type: 'color' },
    },
  },
};

/** Hex value to token reference for every color token above. */
const TOKEN_FOR_HEX: Record<string, string> = {
  '#0f111a': '$colors.background',
  '#1e1e2e': '$colors.surface',
  '#cdd6f4': '$colors.text.primary',
  '#a6adc8': '$colors.text.muted',
  '#89b4fa': '$colors.brand.primary',
  '#11111b': '$colors.brand.on',
};

/** A color with no matching token; it must remain a literal. */
const UNTOKENIZED = '#45475A';

const COLOR_PROPS = ['fill', 'stroke', 'color'] as const;

/**
 * Builds the promo artboard with each color produced by `color`, so the
 * fixture (literal hex) and reference (token references) share one shape.
 */
function promoBoard(color: (hex: string) => string): DeclarativeNode {
  return {
    id: 'board-tokens',
    type: 'artboard',
    name: 'Promo',
    preset: 'custom',
    width: 560,
    height: 360,
    fill: color('#0F111A'),
    layout: { direction: 'vertical', padding: { top: 40, right: 40, bottom: 40, left: 40 } },
    children: [
      {
        id: 'promo-card',
        type: 'frame',
        name: 'Promo Card',
        width: 480,
        sizingVertical: 'hug',
        fill: color('#1E1E2E'),
        stroke: color('#89B4FA'),
        strokeWidth: 1,
        cornerRadius: 16,
        layout: { direction: 'vertical', gap: 12, padding: { top: 24, right: 24, bottom: 24, left: 24 } },
        children: [
          {
            id: 'promo-header',
            type: 'frame',
            name: 'Header',
            sizingVertical: 'hug',
            layout: { direction: 'horizontal', gap: 8, alignItems: 'center' },
            children: [
              { id: 'promo-icon', type: 'icon', icon: 'shield', size: 20, color: color('#89B4FA') },
              { id: 'promo-title', type: 'text', text: 'Design tokens', fontSize: 20, fontWeight: 600, fill: color('#CDD6F4') },
            ],
          },
          { id: 'promo-divider', type: 'shape', shapeType: 'divider', width: 432, height: 1, fill: UNTOKENIZED },
          {
            id: 'promo-body',
            type: 'text',
            text: 'One source of truth for every color.',
            fontSize: 14,
            fill: color('#A6ADC8'),
          },
          {
            id: 'promo-button',
            type: 'frame',
            name: 'Button',
            width: 140,
            height: 40,
            fill: color('#89B4FA'),
            cornerRadius: 8,
            layout: { direction: 'horizontal', alignItems: 'center', justifyContent: 'center' },
            children: [
              { id: 'promo-button-label', type: 'text', text: 'Adopt tokens', fontSize: 14, fontWeight: 600, fill: color('#11111B') },
            ],
          },
        ],
      },
    ],
  };
}

/** Keeps a hex color literal (fixture). */
const literal = (hex: string): string => hex;
/** Maps a hex color to its token reference when one exists (reference). */
const tokenized = (hex: string): string => TOKEN_FOR_HEX[hex.toLowerCase()] ?? hex;

/**
 * Color-bearing properties (`fill`, `stroke`, `color`) set on a node,
 * excluding `none` and `transparent`.
 */
function colorEntries(node: SceneNode): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const prop of COLOR_PROPS) {
    const value = (node as Record<string, unknown>)[prop];
    if (typeof value === 'string' && value !== 'none' && value !== 'transparent') {
      entries.push([prop, value]);
    }
  }
  return entries;
}

/**
 * Resolves a color or token reference to a lowercase literal, or a marker
 * string when the reference cannot be resolved.
 */
function resolveColor(registry: TokenRegistry, value: string): string {
  try {
    return String(registry.resolveValue(value)).toLowerCase();
  } catch {
    return `<unresolved ${value}>`;
  }
}

/**
 * Token migration task: replace hardcoded hex colors with token references.
 */
export const tokenizeColorsTask: BenchTask = {
  id: 'tokenize-colors',
  title: 'Migrate hardcoded colors to tokens',
  category: 'tokens',
  prompt: [
    'The artboard "board-tokens" uses hardcoded hex colors. Color design tokens are already registered (see the tokens in the scene context).',
    'Migrate the artboard to tokens:',
    '- Every fill, stroke, or color value that exactly matches a registered color token must be replaced by that token\'s reference, e.g. "$colors.surface".',
    '- Leave colors that have no matching token unchanged. Do not invent new tokens.',
    '- Do not add, remove, or move nodes. The rendered result must remain visually identical.',
  ].join('\n'),
  fixture: { nodes: [promoBoard(literal)], tokens: TOKENS },
  reference: { nodes: [promoBoard(tokenized)], tokens: TOKENS },
  targetNodeId: 'board-tokens',
  callBudget: 8,
  // The reference renders identically to the fixture and the audit is clean
  // before any change, so visual and audit carry almost no signal here. Keep a
  // small weight on each as regression detectors and score the migration
  // itself through the functional checks.
  weights: { functional: 0.65, audit: 0.05, visual: 0.1, efficiency: 0.2 },
  checks: [
    {
      id: 'tokens-applied',
      description: 'Every color matching a token now references that token',
      weight: 3,
      run: ({ store, initialSnapshot }) => {
        let expected = 0;
        const missed: string[] = [];
        for (const [id, before] of Object.entries(initialSnapshot.nodes)) {
          for (const [prop, value] of colorEntries(before)) {
            const ref = TOKEN_FOR_HEX[value.toLowerCase()];
            if (!ref) continue;
            expected++;
            const after = store.getNode(id) as Record<string, unknown> | undefined;
            if (after?.[prop] !== ref) missed.push(`${id}.${prop}`);
          }
        }
        if (missed.length === 0) return pass(`${expected}/${expected} token-matching colors migrated.`);
        return {
          ...fail(`${expected - missed.length}/${expected} migrated; still literal or wrong: ${missed.join(', ')}.`),
          credit: expected === 0 ? 0 : (expected - missed.length) / expected,
        };
      },
    },
    {
      id: 'colors-preserved',
      description: 'Every color resolves to the same value as before',
      kind: 'guard',
      weight: 2,
      run: ({ store, tokenRegistry, initialSnapshot }) => {
        const changed: string[] = [];
        for (const [id, before] of Object.entries(initialSnapshot.nodes)) {
          const after = store.getNode(id);
          if (!after) continue;
          for (const [prop, value] of colorEntries(before)) {
            const now = (after as Record<string, unknown>)[prop];
            if (typeof now !== 'string' || resolveColor(tokenRegistry, now) !== value.toLowerCase()) {
              changed.push(`${id}.${prop}`);
            }
          }
        }
        return changed.length === 0
          ? pass('All colors resolve to their original values.')
          : fail(`Resolved color changed for: ${changed.join(', ')}.`);
      },
    },
    {
      id: 'untokenized-literal',
      description: 'Colors without a matching token stay literal',
      kind: 'guard',
      run: ({ store }) => {
        const divider = store.getNode('promo-divider') as Record<string, unknown> | undefined;
        return divider?.fill === UNTOKENIZED
          ? pass(`Divider keeps literal ${UNTOKENIZED}.`)
          : fail(`Divider fill is ${JSON.stringify(divider?.fill)}, expected literal ${UNTOKENIZED}.`);
      },
    },
    {
      id: 'structure-preserved',
      description: 'No nodes were added, removed, or moved',
      kind: 'guard',
      run: ({ store, initialSnapshot }) => {
        const after = store.exportSnapshot();
        const beforeIds = Object.keys(initialSnapshot.nodes).sort();
        const afterIds = Object.keys(after.nodes).sort();
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) return fail('Node set changed.');
        for (const id of beforeIds) {
          const a = initialSnapshot.nodes[id] as Record<string, unknown>;
          const b = after.nodes[id] as Record<string, unknown>;
          if (a.parentId !== b.parentId || JSON.stringify(a.childIds) !== JSON.stringify(b.childIds)) {
            return fail(`Hierarchy changed at "${id}".`);
          }
        }
        return pass('Hierarchy unchanged.');
      },
    },
  ],
};

/**
 * Reference solution: one `update_node` per node that carries token colors,
 * followed by a verification audit.
 */
export const tokenizeColorsSolution: ScriptedCall[] = [
  { tool: 'update_node', args: { nodeId: 'board-tokens', patch: { fill: '$colors.background' } } },
  {
    tool: 'update_node',
    args: { nodeId: 'promo-card', patch: { fill: '$colors.surface', stroke: '$colors.brand.primary' } },
  },
  { tool: 'update_node', args: { nodeId: 'promo-icon', patch: { color: '$colors.brand.primary' } } },
  { tool: 'update_node', args: { nodeId: 'promo-title', patch: { fill: '$colors.text.primary' } } },
  { tool: 'update_node', args: { nodeId: 'promo-body', patch: { fill: '$colors.text.muted' } } },
  { tool: 'update_node', args: { nodeId: 'promo-button', patch: { fill: '$colors.brand.primary' } } },
  { tool: 'update_node', args: { nodeId: 'promo-button-label', patch: { fill: '$colors.brand.on' } } },
  { tool: 'audit_design', args: { nodeId: 'board-tokens' } },
];

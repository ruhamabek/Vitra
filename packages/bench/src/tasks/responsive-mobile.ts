import type { DeclarativeNode } from '@vitra/core';
import { auditLayoutOverflow } from '@vitra/eval';
import { computeLayout } from '@vitra/layout';
import type { BenchTask } from '../types.js';
import type { ScriptedCall } from '../agents/scripted.js';
import { absoluteBounds, fail, findText, pass, snapshotSubtree } from './helpers.js';

const HEADING = 'Ship designs as code';
const FEATURES: Array<{ title: string; body: string }> = [
  { title: 'Versioned', body: 'Every change is a commit you can diff, branch, and revert.' },
  { title: 'Auditable', body: 'Contrast and overflow checks run headless in CI.' },
  { title: 'Agent-ready', body: 'MCP tools let agents compose and verify interfaces.' },
];

/**
 * Builds one feature card tree with ids namespaced by `prefix`.
 */
function featureCard(prefix: string, index: number, width: number, bodyWidth: number): DeclarativeNode {
  const feature = FEATURES[index]!;
  return {
    id: `${prefix}-feature-${index + 1}`,
    type: 'frame',
    name: `${feature.title} Card`,
    width,
    fill: '#1E1E2E',
    cornerRadius: 12,
    sizingVertical: 'hug',
    layout: { direction: 'vertical', gap: 8, padding: { top: 20, right: 20, bottom: 20, left: 20 } },
    children: [
      { id: `${prefix}-feature-${index + 1}-title`, type: 'text', text: feature.title, fontSize: 20, fontWeight: 600, fill: '#CDD6F4' },
      {
        id: `${prefix}-feature-${index + 1}-body`,
        type: 'text',
        text: feature.body,
        fontSize: 14,
        fill: '#A6ADC8',
        wrap: true,
        maxWidth: bodyWidth,
      },
    ],
  };
}

const DESKTOP: DeclarativeNode = {
  id: 'board-desktop',
  type: 'artboard',
  name: 'Desktop',
  preset: 'desktop',
  width: 1440,
  height: 900,
  fill: '#0F111A',
  layout: { direction: 'vertical', gap: 32, padding: { top: 64, right: 64, bottom: 64, left: 64 } },
  children: [
    { id: 'desktop-heading', type: 'text', text: HEADING, fontSize: 48, fontWeight: 700, fill: '#FFFFFF' },
    {
      id: 'desktop-feature-row',
      type: 'frame',
      name: 'Feature Row',
      width: 1312,
      sizingVertical: 'hug',
      layout: { direction: 'horizontal', gap: 24 },
      children: FEATURES.map((_, i) => featureCard('desktop', i, 421, 381)),
    },
  ],
};

const MOBILE_COMPONENT: DeclarativeNode = {
  id: 'mobile-content',
  type: 'frame',
  name: 'Mobile Content',
  width: 375,
  sizingVertical: 'hug',
  layout: { direction: 'vertical', gap: 24, padding: { top: 32, right: 24, bottom: 32, left: 24 } },
  children: [
    { id: 'mobile-heading', type: 'text', text: HEADING, fontSize: 28, fontWeight: 700, fill: '#FFFFFF', wrap: true, maxWidth: 327 },
    {
      id: 'mobile-feature-column',
      type: 'frame',
      name: 'Feature Column',
      width: 327,
      sizingVertical: 'hug',
      layout: { direction: 'vertical', gap: 16 },
      children: FEATURES.map((_, i) => featureCard('mobile', i, 327, 287)),
    },
  ],
};

const MOBILE_ARTBOARD_ARGS = {
  id: 'board-mobile',
  name: 'Mobile',
  preset: 'mobile',
  x: 1520,
  fill: '#0F111A',
} as const;

/**
 * Responsive task: adapt a three-column desktop layout to a 375px mobile artboard.
 */
export const responsiveMobileTask: BenchTask = {
  id: 'responsive-mobile',
  title: 'Make a layout mobile-responsive',
  category: 'responsive',
  prompt: [
    'The artboard "board-desktop" contains a heading and a horizontal row of three feature cards.',
    'Create a mobile version of this screen:',
    '- Add a mobile artboard with id "board-mobile" (preset "mobile", 375x812) next to the desktop artboard.',
    `- It must contain the heading "${HEADING}" and all three feature cards (titles "Versioned", "Auditable", "Agent-ready", with their body text) stacked vertically in a single column.`,
    '- Use new unique node ids; do not reuse ids from the desktop artboard.',
    '- Nothing may overflow the 375px width, and all text must meet WCAG AA contrast.',
    '- Do not modify "board-desktop".',
  ].join('\n'),
  fixture: { nodes: [DESKTOP] },
  reference: {
    nodes: [DESKTOP, { ...MOBILE_ARTBOARD_ARGS, type: 'artboard', children: [MOBILE_COMPONENT] }],
  },
  targetNodeId: 'board-mobile',
  callBudget: 4,
  checks: [
    {
      id: 'mobile-artboard',
      description: 'Artboard "board-mobile" exists and is 375px wide',
      weight: 2,
      run: ({ store }) => {
        const board = store.getNode('board-mobile');
        if (!board) return fail('Artboard "board-mobile" was not created.');
        if (board.type !== 'artboard') return fail(`"board-mobile" is a ${board.type}, expected an artboard.`);
        if (board.width !== 375) return fail(`Artboard width is ${board.width}px, expected 375px.`);
        return pass('Mobile artboard is 375px wide.');
      },
    },
    {
      id: 'content-present',
      description: 'Heading and all three feature titles and bodies are present on mobile',
      weight: 2,
      run: ({ store }) => {
        if (!store.getNode('board-mobile')) return fail('Mobile artboard missing.');
        const expected = [HEADING, ...FEATURES.flatMap((f) => [f.title, f.body])];
        const missing = expected.filter((text) => !findText(store, 'board-mobile', text));
        return missing.length === 0
          ? pass('All content present.')
          : fail(`Missing on mobile: ${missing.map((m) => `"${m}"`).join(', ')}.`);
      },
    },
    {
      id: 'single-column',
      description: 'Feature titles are stacked vertically, one per row',
      weight: 2,
      run: async ({ store }) => {
        if (!store.getNode('board-mobile')) return fail('Mobile artboard missing.');
        const titles = FEATURES.map((f) => findText(store, 'board-mobile', f.title));
        if (titles.some((t) => !t)) return fail('Not all feature titles are present.');
        const bounds = await absoluteBounds(store, 'board-mobile');
        const boxes = titles.map((t) => bounds.get(t!.id)).sort((a, b) => (a?.y ?? 0) - (b?.y ?? 0));
        for (let i = 1; i < boxes.length; i++) {
          const prev = boxes[i - 1];
          const cur = boxes[i];
          if (!prev || !cur || cur.y < prev.y + prev.height) {
            return fail('Two or more feature titles share a row.');
          }
        }
        return pass('Feature titles are stacked in a single column.');
      },
    },
    {
      id: 'no-overflow',
      description: 'No element overflows the mobile viewport or its containers',
      weight: 2,
      run: async ({ store }) => {
        if (!store.getNode('board-mobile')) return fail('Mobile artboard missing.');
        const layout = await computeLayout(store, 'board-mobile');
        const issues = auditLayoutOverflow(store, layout);
        if (issues.length > 0) {
          return fail(`${issues.length} overflow issue(s), e.g. ${issues[0]!.message}`);
        }
        const bounds = await absoluteBounds(store, 'board-mobile');
        for (const [id, box] of bounds) {
          if (box.x + box.width > 375 + 1) return fail(`Node "${id}" extends to ${Math.round(box.x + box.width)}px.`);
        }
        return pass('Everything fits within 375px.');
      },
    },
    {
      id: 'desktop-untouched',
      description: 'The desktop artboard is unchanged',
      kind: 'guard',
      run: ({ store, initialSnapshot }) => {
        const before = snapshotSubtree(initialSnapshot, 'board-desktop');
        const after = snapshotSubtree(store.exportSnapshot(), 'board-desktop');
        return JSON.stringify(before) === JSON.stringify(after)
          ? pass('Desktop artboard unchanged.')
          : fail('Desktop artboard was modified.');
      },
    },
  ],
};

/**
 * Reference solution: spawn the artboard, insert the mobile tree, verify.
 */
export const responsiveMobileSolution: ScriptedCall[] = [
  { tool: 'spawn_artboard', args: { ...MOBILE_ARTBOARD_ARGS } },
  { tool: 'insert_component', args: { parentId: 'board-mobile', component: MOBILE_COMPONENT } },
  { tool: 'audit_design', args: { nodeId: 'board-mobile' } },
];

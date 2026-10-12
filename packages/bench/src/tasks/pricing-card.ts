import type { DeclarativeNode, FrameNode } from '@vitra/core';
import type { BenchTask } from '../types.js';
import type { ScriptedCall } from '../agents/scripted.js';
import { descendants, fail, findText, isDescendantOf, pass } from './helpers.js';

const BOARD: DeclarativeNode = {
  id: 'board',
  type: 'artboard',
  name: 'Pricing',
  preset: 'custom',
  width: 800,
  height: 640,
  fill: '#0F111A',
  layout: { direction: 'vertical', alignItems: 'center', justifyContent: 'center' },
};

const FEATURES = ['Unlimited projects', 'Version history', 'Priority support'];

const CARD: DeclarativeNode = {
  id: 'pricing-card',
  type: 'frame',
  name: 'Pricing Card',
  width: 320,
  fill: '#1E1E2E',
  stroke: '#313244',
  strokeWidth: 1,
  cornerRadius: 16,
  sizingVertical: 'hug',
  layout: {
    direction: 'vertical',
    gap: 16,
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    alignItems: 'stretch',
  },
  children: [
    { id: 'plan-name', type: 'text', text: 'Pro', fontSize: 20, fontWeight: 600, fill: '#CDD6F4' },
    { id: 'plan-price', type: 'text', text: '$29/mo', fontSize: 36, fontWeight: 700, fill: '#FFFFFF' },
    ...FEATURES.map(
      (text, i): DeclarativeNode => ({
        id: `feature-${i + 1}`,
        type: 'text',
        text,
        fontSize: 14,
        fill: '#A6ADC8',
      })
    ),
    {
      id: 'pricing-cta',
      type: 'frame',
      name: 'CTA Button',
      fill: '#89B4FA',
      cornerRadius: 8,
      sizingHorizontal: 'fill',
      height: 44,
      layout: { direction: 'horizontal', alignItems: 'center', justifyContent: 'center' },
      children: [
        { id: 'pricing-cta-label', type: 'text', text: 'Get started', fontSize: 16, fontWeight: 600, fill: '#11111B' },
      ],
    },
  ],
};

/**
 * Compose task: build a pricing card from a natural-language brief.
 */
export const pricingCardTask: BenchTask = {
  id: 'pricing-card',
  title: 'Build a pricing card',
  category: 'compose',
  prompt: [
    'Inside the artboard "board", build a pricing card.',
    'Requirements:',
    '- The card is a frame with id "pricing-card", 320px wide, vertical auto-layout with 24px padding and 16px gap, corner radius 16, and a dark surface fill (for example #1E1E2E).',
    '- It contains, in order: the plan name text "Pro"; the price text "$29/mo"; three feature lines "Unlimited projects", "Version history", "Priority support"; and a call-to-action button.',
    '- The button is a frame with id "pricing-cta" whose fill differs from the card fill, containing the text "Get started".',
    '- All text must meet WCAG AA contrast and no element may overflow the card.',
  ].join('\n'),
  fixture: { nodes: [BOARD] },
  reference: { nodes: [{ ...BOARD, children: [CARD] }] },
  targetNodeId: 'pricing-card',
  callBudget: 3,
  checks: [
    {
      id: 'card-exists',
      description: 'Frame "pricing-card" exists inside artboard "board"',
      weight: 2,
      run: ({ store }) => {
        const card = store.getNode('pricing-card');
        if (!card) return fail('Node "pricing-card" was not created.');
        if (card.type !== 'frame') return fail(`"pricing-card" is a ${card.type}, expected a frame.`);
        if (!isDescendantOf(store, 'pricing-card', 'board')) return fail('"pricing-card" is not inside "board".');
        return pass('Card frame found inside the artboard.');
      },
    },
    {
      id: 'card-layout',
      description: 'Card uses vertical auto-layout and is 280-360px wide',
      run: ({ store }) => {
        const card = store.getNode('pricing-card') as FrameNode | undefined;
        if (!card || card.type !== 'frame') return fail('Card frame missing.');
        if (card.layout?.direction !== 'vertical') return fail('Card does not use vertical auto-layout.');
        if (card.width === undefined || card.width < 280 || card.width > 360) {
          return fail(`Card width ${card.width ?? 'unset'} is outside 280-360px.`);
        }
        return pass(`Vertical auto-layout, width ${card.width}px.`);
      },
    },
    {
      id: 'plan-and-price',
      description: 'Card shows plan name "Pro" and price "$29/mo"',
      run: ({ store }) => {
        if (!store.getNode('pricing-card')) return fail('Card frame missing.');
        const plan = findText(store, 'pricing-card', 'Pro');
        const price = findText(store, 'pricing-card', /^\$\s?29\s*\/\s*mo(nth)?$/i);
        if (!plan) return fail('Plan name "Pro" not found in card.');
        if (!price) return fail('Price "$29/mo" not found in card.');
        return pass('Plan name and price present.');
      },
    },
    {
      id: 'features',
      description: 'All three feature lines are present',
      weight: 2,
      run: ({ store }) => {
        if (!store.getNode('pricing-card')) return fail('Card frame missing.');
        const missing = FEATURES.filter((f) => !findText(store, 'pricing-card', f));
        return missing.length === 0
          ? pass('All feature lines present.')
          : fail(`Missing feature lines: ${missing.join(', ')}.`);
      },
    },
    {
      id: 'cta',
      description: 'Button "pricing-cta" contains "Get started" and is visually distinct from the card',
      weight: 2,
      run: ({ store, tokenRegistry }) => {
        const card = store.getNode('pricing-card') as FrameNode | undefined;
        const cta = store.getNode('pricing-cta') as FrameNode | undefined;
        if (!card || !cta) return fail('Card or button frame missing.');
        if (cta.type !== 'frame') return fail(`"pricing-cta" is a ${cta.type}, expected a frame.`);
        if (!isDescendantOf(store, 'pricing-cta', 'pricing-card')) return fail('Button is not inside the card.');
        if (!findText(store, 'pricing-cta', /get started/i)) return fail('Button label "Get started" not found.');
        const ctaFill = cta.fill ? String(tokenRegistry.resolveValue(cta.fill)).toLowerCase() : '';
        const cardFill = card.fill ? String(tokenRegistry.resolveValue(card.fill)).toLowerCase() : '';
        if (!ctaFill || ctaFill === 'transparent' || ctaFill === cardFill) {
          return fail('Button fill is missing or identical to the card fill.');
        }
        return pass('Button present with label and distinct fill.');
      },
    },
    {
      id: 'order',
      description: 'Plan name precedes price, and the button is the last element',
      run: ({ store }) => {
        if (!store.getNode('pricing-card')) return fail('Card frame missing.');
        const ordered = descendants(store, 'pricing-card').map((n) => n.id);
        const plan = findText(store, 'pricing-card', 'Pro');
        const price = findText(store, 'pricing-card', /^\$\s?29/);
        const children = store.getChildren('pricing-card');
        if (!plan || !price) return fail('Plan or price missing.');
        if (ordered.indexOf(plan.id) > ordered.indexOf(price.id)) return fail('Price appears before plan name.');
        if (children[children.length - 1]?.id !== 'pricing-cta') return fail('Button is not the last child of the card.');
        return pass('Element order matches the brief.');
      },
    },
  ],
};

/**
 * Reference solution: one atomic insert followed by a verification audit.
 */
export const pricingCardSolution: ScriptedCall[] = [
  { tool: 'insert_component', args: { parentId: 'board', component: CARD } },
  { tool: 'audit_design', args: { nodeId: 'pricing-card' } },
];

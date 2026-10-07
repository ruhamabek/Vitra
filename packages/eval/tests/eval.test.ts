import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  InMemorySceneStore,
} from '@vitra/core';
import {
  calculateContrastRatio,
  calculateLuminance,
  parseColor,
  auditLayoutOverflow,
  auditDesign,
} from '../src/index.js';
import { computeLayout } from '@vitra/layout';

describe('@vitra/eval: Visual Self-Correction & Accessibility Auditor', () => {
  describe('Color Luminance & WCAG Contrast Math', () => {
    it('should parse hex and rgba colors correctly', () => {
      const white = parseColor('#ffffff');
      expect(white).toEqual({ r: 255, g: 255, b: 255, a: 1 });

      const black = parseColor('#000000');
      expect(black).toEqual({ r: 0, g: 0, b: 0, a: 1 });

      const rgba = parseColor('rgba(166, 227, 161, 0.5)');
      expect(rgba).toEqual({ r: 166, g: 227, b: 161, a: 0.5 });
    });

    it('should calculate accurate relative luminance', () => {
      expect(calculateLuminance('#ffffff')).toBeCloseTo(1.0, 2);
      expect(calculateLuminance('#000000')).toBeCloseTo(0.0, 2);
    });

    it('should calculate WCAG 2.1 contrast ratios matching W3C reference', () => {
      const maxContrast = calculateContrastRatio('#ffffff', '#000000');
      expect(maxContrast).toBeCloseTo(21.0, 1);

      const minContrast = calculateContrastRatio('#181926', '#181926');
      expect(minContrast).toBeCloseTo(1.0, 1);

       const whiteOnDark = calculateContrastRatio('#FFFFFF', '#181926');
      expect(whiteOnDark).toBeGreaterThan(12.0);

       const lowContrast = calculateContrastRatio('#313244', '#181926');
      expect(lowContrast).toBeLessThan(4.5); // Fails WCAG AA for normal text
    });
  });

  describe('Container Overflow & Clipping Auditor', () => {
    it('should detect when child elements overflow a fixed-width container card', async () => {
      const root = createDocumentNode({ id: 'root', name: 'Test Canvas' });
      const store = new InMemorySceneStore(root);

       const container = createFrameNode({
        id: 'narrow-card',
        width: 200,
        height: 100,
        fill: '#181926',
        layout: {
          direction: 'horizontal',
          padding: { top: 20, right: 20, bottom: 20, left: 20 },
          gap: 10,
        },
      });
      store.insertNode(container, 'root');

       const child1 = createFrameNode({ id: 'btn-1', width: 100, height: 40 });
      store.insertNode(child1, 'narrow-card');

       const child2 = createFrameNode({ id: 'btn-2', width: 100, height: 40 });
      store.insertNode(child2, 'narrow-card');

      const layout = await computeLayout(store, 'narrow-card');
      const issues = auditLayoutOverflow(store, layout);

      expect(issues.length).toBeGreaterThan(0);
      const overflowIssue = issues.find((i) => i.nodeId === 'btn-2');
      expect(overflowIssue).toBeDefined();
      expect(overflowIssue?.type).toBe('overflow');
      expect(overflowIssue?.severity).toBe('error');
      expect(overflowIssue?.suggestedFix).toBeDefined();
    });

    it('should detect overflow on the exact 3-button row card from user screenshot', async () => {
      const root = createDocumentNode({ id: 'root', name: 'User Screenshot Canvas' });
      const store = new InMemorySceneStore(root);

       const card = createFrameNode({
        id: 'agent-card',
        width: 360,
        layout: {
          direction: 'vertical',
          gap: 16,
          padding: { top: 28, right: 28, bottom: 28, left: 28 },
        },
      });
      store.insertNode(card, 'root');

       const buttonRow = createFrameNode({
        id: 'button-row',
        layout: { direction: 'horizontal', gap: 12 },
      });
      store.insertNode(buttonRow, 'agent-card');

       store.insertNode(createFrameNode({ id: 'primary-button', width: 120, height: 40 }), 'button-row');
       store.insertNode(createFrameNode({ id: 'secondary-button', width: 110, height: 40 }), 'button-row');
       store.insertNode(createFrameNode({ id: 'live-badge', width: 130, height: 40 }), 'button-row');

      const audit = await auditDesign(store, 'agent-card');
      expect(audit.valid).toBe(false);
      expect(audit.issues.some((i) => i.nodeId === 'live-badge')).toBe(true);

      const badgeIssue = audit.issues.find((i) => i.nodeId === 'live-badge');
      expect(badgeIssue?.message).toContain('overflow');
      expect(badgeIssue?.suggestedFix?.property).toBe('width');
      expect(badgeIssue?.suggestedFix?.suggestedValue).toBeGreaterThanOrEqual(440);
    });
  });
});

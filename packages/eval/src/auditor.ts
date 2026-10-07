import { ISceneStore, TextNode } from '@vitra/core';
import { computeLayout, LayoutNodeResult } from '@vitra/layout';
import { TokenRegistry } from '@vitra/tokens';
import { evaluateTextContrast, parseColor, compositeColor, type RGBA } from './color.js';
import { auditLayoutOverflow, AuditIssue } from './overflow.js';

export interface AuditOptions {
  tokenRegistry?: TokenRegistry;
  strictWcagAAA?: boolean;
}

export interface AuditResult {
  valid: boolean;
  score: number;
  totalChecks: number;
  issues: AuditIssue[];
}

export async function auditDesign(
  store: ISceneStore,
  targetNodeId: string,
  options?: AuditOptions
): Promise<AuditResult> {
  const rootNode = store.getNode(targetNodeId);
  if (!rootNode) {
    throw new Error(`Target node "${targetNodeId}" not found for audit.`);
  }

  const layout = await computeLayout(store, targetNodeId);
  const issues: AuditIssue[] = [];

  // 1. Layout Overflow Audit
  const overflowIssues = auditLayoutOverflow(store, layout);
  issues.push(...overflowIssues);

  // 2. WCAG Accessibility & Contrast Audit
  const contrastIssues = auditAccessibility(store, layout, options);
  issues.push(...contrastIssues);

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;

  const score = Math.max(0, Math.min(100, 100 - errorsCount * 25 - warningsCount * 10));
  const valid = errorsCount === 0;

  return {
    valid,
    score,
    totalChecks: overflowIssues.length + contrastIssues.length + 10,
    issues,
  };
}

export function auditAccessibility(
  store: ISceneStore,
  layout: LayoutNodeResult,
  options?: AuditOptions
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const registry = options?.tokenRegistry;

  function resolveColor(val?: string): string {
    if (!val) return '#000000';
    if (val.startsWith('$') && registry) {
      return String(registry.resolve(val));
    }
    return val;
  }

  function findEffectiveBackground(startNodeId: string): string {
    const layers: RGBA[] = [];
    let current = store.getNode(startNodeId);
    while (current && current.parentId) {
      const parent = store.getNode(current.parentId);
      if (parent && 'fill' in parent && parent.fill && parent.fill !== 'transparent') {
        const parsed = parseColor(resolveColor(parent.fill));
        layers.unshift(parsed);
        if (parsed.a >= 1) {
           break;
        }
      }
      current = parent;
    }

    if (layers.length === 0) {
      return '#0F111A';
    }

    let effective = layers[0]!;
    if (effective.a < 1) {
      effective = compositeColor(effective, parseColor('#0F111A'));
    }

    for (let i = 1; i < layers.length; i++) {
      effective = compositeColor(layers[i]!, effective);
    }

    return `rgb(${effective.r}, ${effective.g}, ${effective.b})`;
  }

  function traverse(currentLayout: LayoutNodeResult) {
    const node = store.getNode(currentLayout.nodeId);
    if (node && node.type === 'text') {
      const textNode = node as TextNode;
      const textFill = resolveColor(textNode.fill);
      const bgFill = findEffectiveBackground(textNode.id);

      const evaluation = evaluateTextContrast(
        textFill,
        bgFill,
        textNode.fontSize ?? 16,
        textNode.fontWeight ?? 400
      );

      const failedAA = !evaluation.passesAA;
      const failedAAA = options?.strictWcagAAA && !evaluation.passesAAA;

      if (failedAA || failedAAA) {
        issues.push({
          nodeId: textNode.id,
          type: 'contrast',
          severity: failedAA ? 'error' : 'warning',
          message: `Text "${textNode.text}" (fill: ${textFill}) has contrast ratio ${evaluation.ratio.toFixed(2)}:1 against background (${bgFill}). Fails WCAG ${failedAA ? 'AA' : 'AAA'}.`,
          details: {
            contrastRatio: evaluation.ratio,
          },
          suggestedFix: {
            targetNodeId: textNode.id,
            action: 'restyle',
            property: 'fill',
            suggestedValue: evaluation.ratio < 4.5 ? '#CAD3F5' : '#FFFFFF',
            description: `Adjust text fill to a higher contrast color against background ${bgFill}.`,
          },
        });
      }
    }

    for (const child of currentLayout.children) {
      traverse(child);
    }
  }

  traverse(layout);
  return issues;
}

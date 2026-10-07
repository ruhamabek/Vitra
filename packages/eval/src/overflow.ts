import { ISceneStore } from '@vitra/core';
import { LayoutNodeResult } from '@vitra/layout';

export interface AuditIssue {
  nodeId: string;
  type: 'overflow' | 'clipping' | 'contrast' | 'alignment';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: {
    overflowAmount?: number;
    axis?: 'horizontal' | 'vertical';
    parentWidth?: number;
    requiredWidth?: number;
    contrastRatio?: number;
    currentLuminance?: number;
  };
  suggestedFix?: {
    targetNodeId: string;
    action: 'resize' | 'restyle' | 'reorder';
    property: string;
    suggestedValue: string | number;
    description: string;
  };
}

interface FrameBoundary {
  nodeId: string;
  name: string;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function auditLayoutOverflow(
  store: ISceneStore,
  layout: LayoutNodeResult
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  function inspectNode(
    currentLayout: LayoutNodeResult,
    offsetX: number,
    offsetY: number,
    parentBoundaries: FrameBoundary[]
  ) {
    const node = store.getNode(currentLayout.nodeId);
    if (!node) return;

    const currentAbsoluteX = offsetX + currentLayout.bounds.x;
    const currentAbsoluteY = offsetY + currentLayout.bounds.y;
    const currentRight = currentAbsoluteX + currentLayout.bounds.width;
    const currentBottom = currentAbsoluteY + currentLayout.bounds.height;

     for (const ancestor of parentBoundaries) {
       if (currentRight > ancestor.maxX + 1) {
        const overflowX = Math.round(currentRight - ancestor.maxX);
        const requiredWidth = Math.ceil(ancestor.width + overflowX);

        issues.push({
          nodeId: node.id,
          type: 'overflow',
          severity: 'error',
          message: `Element "${node.name ?? node.id}" (extends to ${Math.round(currentRight)}px) overflows container "${ancestor.name}" content boundary (${Math.round(ancestor.maxX)}px) by ${overflowX}px.`,
          details: {
            overflowAmount: overflowX,
            axis: 'horizontal',
            parentWidth: ancestor.width,
            requiredWidth,
          },
          suggestedFix: {
            targetNodeId: ancestor.nodeId,
            action: 'resize',
            property: 'width',
            suggestedValue: requiredWidth,
            description: `Increase width of container "${ancestor.name}" to at least ${requiredWidth}px to fit all elements cleanly.`,
          },
        });
      }

       if (ancestor.height > 0 && currentBottom > ancestor.maxY + 1) {
        const overflowY = Math.round(currentBottom - ancestor.maxY);
        const requiredHeight = Math.ceil(ancestor.height + overflowY);

        issues.push({
          nodeId: node.id,
          type: 'overflow',
          severity: 'error',
          message: `Element "${node.name ?? node.id}" overflows container "${ancestor.name}" vertical boundary by ${overflowY}px.`,
          details: {
            overflowAmount: overflowY,
            axis: 'vertical',
            requiredWidth: requiredHeight,
          },
          suggestedFix: {
            targetNodeId: ancestor.nodeId,
            action: 'resize',
            property: 'height',
            suggestedValue: requiredHeight,
            description: `Increase height of container "${ancestor.name}" to at least ${requiredHeight}px.`,
          },
        });
      }
    }

     const nextBoundaries = [...parentBoundaries];
    if (node.type === 'frame' || node.type === 'artboard') {
      const padRight = node.layout?.padding?.right ?? 0;
      const padBottom = node.layout?.padding?.bottom ?? 0;

      if (currentLayout.bounds.width > 0) {
        nextBoundaries.push({
          nodeId: node.id,
          name: node.name ?? node.id,
          maxX: currentAbsoluteX + currentLayout.bounds.width - padRight,
          maxY: currentAbsoluteY + currentLayout.bounds.height - padBottom,
          width: currentLayout.bounds.width,
          height: currentLayout.bounds.height,
        });
      }
    }

     for (const childLayout of currentLayout.children) {
      inspectNode(childLayout, currentAbsoluteX, currentAbsoluteY, nextBoundaries);
    }
  }

  inspectNode(layout, 0, 0, []);
  return issues;
}

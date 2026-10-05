import type {
  AutoLayout,
} from '@vitra/core';

export interface PenpotFlexProps {
  layout: 'flex';
  flexDirection: 'row' | 'column';
  rowGap: number;
  columnGap: number;
  alignItems: 'start' | 'center' | 'end' | 'stretch';
  justifyContent: 'start' | 'center' | 'end' | 'space-between';
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export function mapVitraLayoutToPenpot(layout?: Partial<AutoLayout>): PenpotFlexProps | undefined {
  if (!layout) return undefined;

  const flexDirection = layout.direction === 'vertical' ? 'column' : 'row';
  const gap = layout.gap ?? 0;

  return {
    layout: 'flex',
    flexDirection,
    rowGap: gap,
    columnGap: gap,
    alignItems: layout.alignItems || 'start',
    justifyContent: layout.justifyContent || 'start',
    paddingTop: layout.padding?.top ?? 0,
    paddingRight: layout.padding?.right ?? 0,
    paddingBottom: layout.padding?.bottom ?? 0,
    paddingLeft: layout.padding?.left ?? 0,
  };
}

export function mapVitraFillsToPenpot(fill?: string): { fillColor?: string } {
  if (!fill || fill === 'transparent') return {};
  return { fillColor: fill };
}

export function mapVitraStrokesToPenpot(stroke?: string, strokeWidth?: number): { strokeColor?: string; strokeWidth?: number } {
  if (!stroke) return {};
  return {
    strokeColor: stroke,
    strokeWidth: strokeWidth ?? 1,
  };
}

export interface PenpotChildSizing {
  horizontalSizing: 'auto' | 'fill' | 'fix';
  verticalSizing: 'auto' | 'fill' | 'fix';
}

/**
 * Maps Vitra layout sizing enums ('fixed' | 'hug' | 'fill') and flex contexts
 * to Penpot's native child flex sizing ('fix' | 'auto' | 'fill').
 */
export function mapVitraSizingToPenpot(
  childNode: any,
  parentFlex?: PenpotFlexProps
): PenpotChildSizing {
  let horizontalSizing: 'auto' | 'fill' | 'fix' = 'fix';
  let verticalSizing: 'auto' | 'fill' | 'fix' = 'fix';

  if (childNode.sizingHorizontal === 'fill' || childNode.layoutAlign === 'stretch') {
    horizontalSizing = 'fill';
  } else if (childNode.sizingHorizontal === 'hug') {
    horizontalSizing = 'auto';
  } else if (childNode.sizingHorizontal === 'fixed') {
    horizontalSizing = (childNode.width !== undefined && childNode.width > 0) ? 'fix' : 'auto';
  } else if (childNode.width !== undefined && childNode.width > 0) {
    horizontalSizing = 'fix';
  } else if (childNode.type === 'text') {
    horizontalSizing = (childNode.wrap && parentFlex?.flexDirection === 'column') ? 'fill' : 'auto';
  } else if (childNode.type === 'icon') {
    horizontalSizing = 'fix';
  } else {
    if (parentFlex?.flexDirection === 'column' && parentFlex?.alignItems === 'stretch') {
      horizontalSizing = 'fill';
    } else {
      horizontalSizing = 'auto';
    }
  }

   if (childNode.sizingVertical === 'fill' || childNode.layoutGrow === 1) {
    verticalSizing = 'fill';
  } else if (childNode.sizingVertical === 'hug') {
    verticalSizing = 'auto';
  } else if (childNode.sizingVertical === 'fixed') {
    verticalSizing = (childNode.height !== undefined && childNode.height > 0) ? 'fix' : 'auto';
  } else if (childNode.height !== undefined && childNode.height > 0) {
    verticalSizing = 'fix';
  } else if (childNode.type === 'text') {
    verticalSizing = 'auto';
  } else if (childNode.type === 'icon') {
    verticalSizing = 'fix';
  } else {
    if (parentFlex?.flexDirection === 'row' && parentFlex?.alignItems === 'stretch') {
      verticalSizing = 'fill';
    } else {
      verticalSizing = 'auto';
    }
  }

  return { horizontalSizing, verticalSizing };
}


import type {
  AutoLayout,
  PenpotShape,
} from '@vitra/core';
import type { PenpotNativeShape, PenpotPluginApi } from './types.js';

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

declare const penpot: PenpotPluginApi | undefined;

export function getPageTopLevelShapes(api?: Partial<PenpotPluginApi>): PenpotNativeShape[] {
  try {
    const penpotInstance = api ?? (typeof penpot !== 'undefined' ? penpot : undefined);
    if (!penpotInstance) return [];

    const page = penpotInstance.currentPage;

     const root = page?.root || penpotInstance.root;
    if (root && Array.isArray(root.children) && root.children.length > 0) {
      return root.children;
    }

     if (page && Array.isArray(page.children) && page.children.length > 0) {
      return page.children;
    }

     if (typeof page?.findShapes === 'function') {
      try {
        const boards = page.findShapes({ type: 'board' });
        if (Array.isArray(boards) && boards.length > 0) {
          return boards;
        }
      } catch {}

      try {
        const allShapes = page.findShapes();
        if (Array.isArray(allShapes) && allShapes.length > 0) {
          const topLevel = allShapes.filter(
            (s: PenpotNativeShape) =>
              !s.parent || s.parent === root || s.parent?.id === root?.id || s.parent?.type === 'root'
          );
          if (topLevel.length > 0) return topLevel;
          const boards = allShapes.filter((s: PenpotNativeShape) => s && s.type === 'board');
          if (boards.length > 0) return boards;
          return allShapes;
        }
      } catch {}
    }

     if (page && Array.isArray(page.shapes) && page.shapes.length > 0) {
      return page.shapes;
    }
  } catch (err) {
    console.warn('[Vitra] Error retrieving Penpot page shapes:', err);
  }

  return [];
}

export function serializePenpotShape(shape: PenpotNativeShape, isTopLevel = false): PenpotShape {
  const childrenSerialized = shape.children
    ? shape.children.map((c: PenpotNativeShape) => serializePenpotShape(c, false))
    : shape.shapes
    ? shape.shapes.map((c: PenpotNativeShape) => serializePenpotShape(c, false))
    : undefined;

  const flexObj = (shape as unknown as { flex?: Record<string, unknown>; layoutFlex?: Record<string, unknown> }).flex
    || (shape as unknown as { flex?: Record<string, unknown>; layoutFlex?: Record<string, unknown> }).layoutFlex
    || {};
  const layoutChild = shape.layoutChild || (shape as unknown as { layoutChild?: Record<string, unknown> }).layoutChild || {};

  const rawDir =
    shape.flexDirection ||
    (flexObj.dir as string | undefined) ||
    (flexObj.flexDirection as string | undefined) ||
    (shape as unknown as { dir?: string }).dir;

  const flexDir =
    rawDir === 'column' || rawDir === 'vertical' || rawDir === 'column-reverse'
      ? 'column'
      : rawDir === 'row' || rawDir === 'horizontal' || rawDir === 'row-reverse'
      ? 'row'
      : undefined;

  const isFlex =
    shape.layout === 'flex' ||
    Boolean(flexObj.dir) ||
    Boolean(shape.flexDirection) ||
    Boolean((shape as unknown as { dir?: string }).dir);

  const rowGap = shape.rowGap ?? (flexObj.rowGap as number | undefined) ?? (flexObj.gap as number | undefined);
  const colGap = shape.columnGap ?? (flexObj.columnGap as number | undefined) ?? (flexObj.gap as number | undefined);
  const alignItems = shape.alignItems || (flexObj.alignItems as string | undefined);
  const justifyContent = shape.justifyContent || (flexObj.justifyContent as string | undefined);

  const padTop = shape.padding?.top ?? (flexObj.topPadding as number | undefined) ?? (flexObj.verticalPadding as number | undefined);
  const padRight = shape.padding?.right ?? (flexObj.rightPadding as number | undefined) ?? (flexObj.horizontalPadding as number | undefined);
  const padBottom = shape.padding?.bottom ?? (flexObj.bottomPadding as number | undefined) ?? (flexObj.verticalPadding as number | undefined);
  const padLeft = shape.padding?.left ?? (flexObj.leftPadding as number | undefined) ?? (flexObj.horizontalPadding as number | undefined);

  const padding = (padTop || padRight || padBottom || padLeft)
    ? { top: padTop || 0, right: padRight || 0, bottom: padBottom || 0, left: padLeft || 0 }
    : shape.padding;

  const sizingH = layoutChild.horizontalSizing || (shape as unknown as { sizingHorizontal?: string }).sizingHorizontal;
  const sizingV = layoutChild.verticalSizing || (shape as unknown as { sizingVertical?: string }).sizingVertical;

  const sizingHorizontal =
    sizingH === 'fill' ? 'fill' : sizingH === 'auto' ? 'hug' : sizingH === 'fix' ? 'fixed' : undefined;
  const sizingVertical =
    sizingV === 'fill' ? 'fill' : sizingV === 'auto' ? 'hug' : sizingV === 'fix' ? 'fixed' : undefined;

  const fill =
    shape.fills?.[0]?.fillColor ||
    shape.fills?.[0]?.color ||
    shape.fillColor ||
    shape.fill;

  const stroke =
    shape.strokes?.[0]?.strokeColor ||
    shape.strokes?.[0]?.color ||
    shape.strokeColor ||
    shape.stroke;

  const strokeW =
    shape.strokes?.[0]?.strokeWidth ||
    shape.strokes?.[0]?.width ||
    shape.strokeWidth;

  const shapeType = !isTopLevel && shape.type === 'board' ? 'frame' : shape.type;

  return {
    id: shape.id,
    name: shape.name,
    type: shapeType,
    x: shape.x || 0,
    y: shape.y || 0,
    width: shape.width || 100,
    height: shape.height || 100,
    fillColor: fill,
    strokeColor: stroke,
    strokeWidth: strokeW,
    borderRadius: shape.borderRadius,
    layout: isFlex ? 'flex' : undefined,
    flexDirection: flexDir,
    rowGap,
    columnGap: colGap,
    alignItems: alignItems as 'start' | 'center' | 'end' | 'stretch' | undefined,
    justifyContent: justifyContent as 'start' | 'center' | 'end' | 'space-between' | undefined,
    padding,
    sizingHorizontal,
    sizingVertical,
    characters: shape.characters || shape.text || shape.content,
    fontSize: typeof shape.fontSize === 'number' ? shape.fontSize : undefined,
    children: childrenSerialized,
    shapes: childrenSerialized,
  };
}


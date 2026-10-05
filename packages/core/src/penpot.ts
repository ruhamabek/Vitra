import {
  createDocumentNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
  AutoLayout,
  SceneNode,
} from './nodes.js';
import { ISceneStore, InMemorySceneStore } from './store.js';

export interface PenpotShape {
  id?: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fillColor?: string;
  'fill-color'?: string;
  fills?: Array<{ color?: string; 'fill-color'?: string }>;
  strokeColor?: string;
  'stroke-color'?: string;
  strokeWidth?: number;
  'stroke-width'?: number;
  strokes?: Array<{ color?: string; width?: number }>;
  borderRadius?: number;
  rx?: number;
  cornerRadius?: number;
  flexDirection?: 'column' | 'row' | 'vertical' | 'horizontal';
  layoutDir?: 'column' | 'row';
  'flex-direction'?: 'column' | 'row';
  layout?: 'flex' | 'grid' | 'none';
  layoutAlign?: 'stretch' | 'start' | 'center' | 'end';
  layoutGrow?: number;
  sizingHorizontal?: 'fixed' | 'hug' | 'fill';
  sizingVertical?: 'fixed' | 'hug' | 'fill';
  rowGap?: number;
  columnGap?: number;
  gap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between';
  shapes?: PenpotShape[];
  children?: PenpotShape[];
  text?: string;
  content?: string;
  characters?: string;
  fontSize?: number;
  'font-size'?: number;
  fontWeight?: number;
  'font-weight'?: number;
  lineHeight?: number;
  'line-height'?: number;
  wrap?: boolean;
}

export interface PenpotDocumentResponse {
  name?: string;
  version?: string;
  pages?: Array<{
    id?: string;
    name?: string;
    shapes?: PenpotShape[];
    children?: PenpotShape[];
  }>;
  data?: {
    pages?: Array<{
      id?: string;
      name?: string;
      shapes?: PenpotShape[];
      children?: PenpotShape[];
    }>;
  };
}

/**
 * Converts a Penpot design JSON structure into a Vitra InMemorySceneStore.
 */
export function convertPenpotJsonToVitra(
  penpotData: PenpotDocumentResponse | PenpotShape | PenpotShape[] | Record<string, unknown>,
  projectName = 'Imported Penpot Project'
): { store: InMemorySceneStore; manifestName: string; extractedColors: string[] } {
  const raw = penpotData as (PenpotDocumentResponse & { shapes?: PenpotShape[]; children?: PenpotShape[] }) | undefined;
  const pages =
    raw?.pages ||
    raw?.data?.pages ||
    (Array.isArray(penpotData)
      ? (penpotData as Array<{ shapes?: PenpotShape[]; children?: PenpotShape[] }>)
      : [raw || {}]);

  const docNode = createDocumentNode({
    id: 'root',
    name: projectName,
  });

  const store = new InMemorySceneStore(docNode);
  const extractedColors = new Set<string>();

  function extractPenpotColor(shape: PenpotShape): string | undefined {
    let color: string | undefined = shape.fillColor || shape['fill-color'];
    if (!color && Array.isArray(shape.fills) && shape.fills.length > 0) {
      color = shape.fills[0]?.color || shape.fills[0]?.['fill-color'];
    }
    if (color && typeof color === 'string' && color.startsWith('#')) {
      extractedColors.add(color);
      return color;
    }
    return color;
  }

  function processPenpotShape(shape: PenpotShape, parentId: string, isTopLevel: boolean): void {
    if (!shape) return;
    const type = (shape.type || '').toLowerCase();
    const fill = extractPenpotColor(shape);
    const stroke = shape.strokeColor || shape['stroke-color'] || shape.strokes?.[0]?.color;
    const strokeWidth = shape.strokeWidth || shape['stroke-width'] || shape.strokes?.[0]?.width;
    const cornerRadius = shape.borderRadius || shape.rx || shape.cornerRadius || 0;
    const width = shape.width;
    const height = shape.height;

    const flexDir = shape.flexDirection || shape.layoutDir || shape['flex-direction'];
    const direction = flexDir === 'column' || flexDir === 'vertical' ? 'vertical' : 'horizontal';
    const hasLayout =
      shape.layout === 'flex' || Boolean(flexDir) || shape.rowGap || shape.columnGap || shape.padding;

    const layout: AutoLayout | undefined = hasLayout
      ? {
          direction,
          gap: shape.rowGap || shape.columnGap || shape.gap || 0,
          padding: {
            top: shape.paddingTop ?? shape.padding?.top ?? 0,
            right: shape.paddingRight ?? shape.padding?.right ?? 0,
            bottom: shape.paddingBottom ?? shape.padding?.bottom ?? 0,
            left: shape.paddingLeft ?? shape.padding?.left ?? 0,
          },
          alignItems:
            shape.alignItems === 'center'
              ? 'center'
              : shape.alignItems === 'stretch'
              ? 'stretch'
              : 'start',
          justifyContent:
            shape.justifyContent === 'center'
              ? 'center'
              : shape.justifyContent === 'space-between'
              ? 'space-between'
              : 'start',
        }
      : undefined;

    const children = shape.shapes || shape.children || [];

    if (isTopLevel || type === 'board') {
      const artboardWidth = width || 1440;
      const preset = artboardWidth <= 500 ? 'mobile' : artboardWidth >= 1200 ? 'desktop' : 'tablet';
      const artboard = createArtboardNode({
        id: shape.id || `artboard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: shape.name || 'Board',
        preset,
        x: shape.x ?? 0,
        y: shape.y ?? 0,
        width: artboardWidth,
        height: height || 900,
        fill: fill || '#FFFFFF',
        cornerRadius,
        layout: layout || {
          direction: 'vertical',
          gap: 0,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          alignItems: 'start',
          justifyContent: 'start',
        },
      });
      store.insertNode(artboard, parentId);

      for (const child of children) {
        processPenpotShape(child, artboard.id, false);
      }
    } else if (type === 'frame' || type === 'group' || children.length > 0) {
      const sizingHorizontal =
        shape.layoutAlign === 'stretch' || shape.sizingHorizontal === 'fill'
          ? 'fill'
          : shape.width
          ? 'fixed'
          : 'hug';
      const sizingVertical =
        shape.layoutGrow === 1 || shape.sizingVertical === 'fill'
          ? 'fill'
          : shape.height
          ? 'fixed'
          : 'hug';

      const frameWidth = sizingHorizontal === 'fill' ? undefined : (shape.width ?? undefined);
      const frameHeight = sizingVertical === 'fill' ? undefined : (shape.height ?? undefined);

      const frame = createFrameNode({
        id: shape.id || `frame-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: shape.name || 'Frame',
        width: frameWidth,
        height: frameHeight,
        sizingHorizontal,
        sizingVertical,
        fill,
        stroke,
        strokeWidth,
        cornerRadius,
        layout,
      });
      store.insertNode(frame, parentId);

      for (const child of children) {
        processPenpotShape(child, frame.id, false);
      }
    } else if (type === 'text') {
      const textContent = shape.text || shape.content || shape.characters || '';
      const textNode = createTextNode({
        id: shape.id || `text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: shape.name || textContent.slice(0, 16) || 'Text',
        text: textContent,
        fontSize: shape.fontSize || shape['font-size'] || 16,
        fontWeight: shape.fontWeight || shape['font-weight'] || 400,
        lineHeight: shape.lineHeight || shape['line-height'],
        fill: fill || '#000000',
        wrap: Boolean(shape.wrap || textContent.length > 35),
      });
      store.insertNode(textNode, parentId);
    } else if (type === 'rect' || type === 'circle' || type === 'path' || type === 'shape') {
      const shapeNode = createShapeNode({
        id: shape.id || `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: shape.name || type,
        shapeType: type === 'circle' ? 'ellipse' : 'rectangle',
        width: width ?? 100,
        height: height ?? 100,
        fill: fill || '#89B4FA',
        stroke,
        strokeWidth,
        cornerRadius,
      });
      store.insertNode(shapeNode, parentId);
    }
  }

  for (const page of pages) {
    const pageObj = page as { shapes?: PenpotShape[]; children?: PenpotShape[] } & PenpotShape;
    const shapes = pageObj?.shapes || pageObj?.children || (pageObj?.type ? [pageObj] : []);
    for (const shape of shapes) {
      processPenpotShape(shape, 'root', true);
    }
  }

  return { store, manifestName: projectName, extractedColors: Array.from(extractedColors) };
}

export interface PenpotExportResult extends PenpotDocumentResponse {
  name: string;
  version: string;
  pages: Array<{
    id: string;
    name: string;
    shapes: PenpotShape[];
  }>;
}

/**
 * Converts a Vitra InMemorySceneStore into a Penpot-compatible JSON document.
 */
export function convertVitraToPenpotJson(
  store: ISceneStore,
  projectName = 'Vitra Penpot Export'
): PenpotExportResult {
  const root = store.getRoot();
  const children = store.getChildren(root.id);

  function nodeToPenpot(node: SceneNode): PenpotShape {
    switch (node.type) {
      case 'artboard': {
        const boardChildren = store.getChildren(node.id).map(nodeToPenpot);
        return {
          id: node.id,
          name: node.name,
          type: 'board',
          width: node.width,
          height: node.height,
          fillColor: node.fill || '#FFFFFF',
          borderRadius: node.cornerRadius ?? 0,
          flexDirection: node.layout?.direction === 'horizontal' ? 'row' : 'column',
          rowGap: node.layout?.gap ?? 0,
          columnGap: node.layout?.gap ?? 0,
          paddingTop: node.layout?.padding?.top ?? 0,
          paddingRight: node.layout?.padding?.right ?? 0,
          paddingBottom: node.layout?.padding?.bottom ?? 0,
          paddingLeft: node.layout?.padding?.left ?? 0,
          shapes: boardChildren,
        };
      }
      case 'frame': {
        const frameChildren = store.getChildren(node.id).map(nodeToPenpot);
        return {
          id: node.id,
          name: node.name,
          type: 'frame',
          width: node.width,
          height: node.height,
          fillColor: node.fill,
          strokeColor: node.stroke,
          strokeWidth: node.strokeWidth,
          borderRadius: node.cornerRadius ?? 0,
          flexDirection: node.layout?.direction === 'horizontal' ? 'row' : 'column',
          rowGap: node.layout?.gap ?? 0,
          columnGap: node.layout?.gap ?? 0,
          shapes: frameChildren,
        };
      }
      case 'text': {
        return {
          id: node.id,
          name: node.name,
          type: 'text',
          text: node.text,
          fontSize: node.fontSize,
          fontWeight: node.fontWeight,
          lineHeight: node.lineHeight,
          fillColor: node.fill,
          wrap: node.wrap,
        };
      }
      case 'shape': {
        return {
          id: node.id,
          name: node.name,
          type: node.shapeType === 'ellipse' ? 'circle' : 'rect',
          width: node.width,
          height: node.height,
          fillColor: node.fill,
          strokeColor: node.stroke,
          strokeWidth: node.strokeWidth,
          borderRadius: node.cornerRadius ?? 0,
        };
      }
      default:
        return {
          id: node.id,
          name: node.name,
          type: 'frame',
        };
    }
  }

  return {
    name: projectName,
    version: '1.0',
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: children.map(nodeToPenpot),
      },
    ],
  };
}

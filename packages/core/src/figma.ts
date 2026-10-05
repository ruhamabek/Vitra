import {
  SceneNode,
  FrameNode,
  AutoLayout,
  createDocumentNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
} from './nodes.js';
import { ISceneStore, InMemorySceneStore } from './store.js';

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPaint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  layoutAlign?: 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX';
  layoutGrow?: number;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  characters?: string;
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPx?: number;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  };
  effects?: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR';
    visible?: boolean;
    color?: FigmaColor;
    offset?: { x: number; y: number };
    radius?: number;
  }>;
}

export interface FigmaDocumentResponse {
  document?: FigmaNode;
  nodes?: Record<string, { document: FigmaNode }>;
  name?: string;
}

/**
 * Converts a Figma 0-1 floating RGBA color to an 8-character or 6-character hex string.
 */
export function figmaColorToHex(color?: FigmaColor, opacity?: number): string | undefined {
  if (!color) return undefined;
  const r = Math.round(Math.min(1, Math.max(0, color.r)) * 255);
  const g = Math.round(Math.min(1, Math.max(0, color.g)) * 255);
  const b = Math.round(Math.min(1, Math.max(0, color.b)) * 255);
  const a = opacity !== undefined ? opacity : color.a !== undefined ? color.a : 1;

  const hexR = r.toString(16).padStart(2, '0').toUpperCase();
  const hexG = g.toString(16).padStart(2, '0').toUpperCase();
  const hexB = b.toString(16).padStart(2, '0').toUpperCase();

  if (a < 0.999) {
    const hexA = Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0').toUpperCase();
    return `#${hexR}${hexG}${hexB}${hexA}`;
  }

  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Converts Figma AutoLayout properties to Vitra AutoLayout schema.
 */
export function figmaLayoutToVitra(node: FigmaNode): AutoLayout | undefined {
  if (!node.layoutMode || node.layoutMode === 'NONE') {
    return undefined;
  }

  const direction = node.layoutMode === 'VERTICAL' ? 'vertical' : 'horizontal';

  let justifyContent: 'start' | 'center' | 'end' | 'space-between' = 'start';
  if (node.primaryAxisAlignItems === 'CENTER') justifyContent = 'center';
  else if (node.primaryAxisAlignItems === 'MAX') justifyContent = 'end';
  else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') justifyContent = 'space-between';

  let alignItems: 'start' | 'center' | 'end' | 'stretch' = 'start';
  if (node.counterAxisAlignItems === 'CENTER') alignItems = 'center';
  else if (node.counterAxisAlignItems === 'MAX') alignItems = 'end';

  return {
    direction,
    gap: node.itemSpacing ?? 0,
    padding: {
      top: node.paddingTop ?? 0,
      right: node.paddingRight ?? 0,
      bottom: node.paddingBottom ?? 0,
      left: node.paddingLeft ?? 0,
    },
    alignItems,
    justifyContent,
  };
}

/**
 * Converts a Figma REST API document or export JSON directly into a Vitra InMemorySceneStore.
 */
export function convertFigmaJsonToVitra(
  figmaData: FigmaDocumentResponse | FigmaNode,
  projectName = 'Imported Figma Project'
): { store: InMemorySceneStore; manifestName: string; extractedColors: string[] } {

   let figmaRoot: FigmaNode;

  if ('document' in figmaData && figmaData.document) {
    figmaRoot = figmaData.document;
  } else if ('nodes' in figmaData && figmaData.nodes) {
    const firstKey = Object.keys(figmaData.nodes)[0];
    figmaRoot = (firstKey ? figmaData.nodes[firstKey]?.document : undefined) || (figmaData as unknown as FigmaNode);
  } else if (Array.isArray(figmaData)) {
    figmaRoot = {
      id: '0:0',
      name: projectName,
      type: 'DOCUMENT',
      children: figmaData as FigmaNode[],
    };
  } else {
    figmaRoot = figmaData as FigmaNode;
  }

  const docNode = createDocumentNode({
    id: 'root',
    name: projectName,
  });

  const store = new InMemorySceneStore(docNode);
  const extractedColors = new Set<string>();

  function processFigmaNode(node: FigmaNode, parentId: string): void {
    if (node.visible === false) return;

     let fill: string | undefined;
    if (node.fills && node.fills.length > 0) {
      const solid = node.fills.find((f) => f.visible !== false && f.type === 'SOLID');
      if (solid && solid.color) {
        fill = figmaColorToHex(solid.color, solid.opacity);
        if (fill) extractedColors.add(fill);
      }
    }

    let stroke: string | undefined;
    let strokeWidth: number | undefined;
    if (node.strokes && node.strokes.length > 0) {
      const strokePaint = node.strokes.find((s) => s.visible !== false && s.type === 'SOLID');
      if (strokePaint && strokePaint.color) {
        stroke = figmaColorToHex(strokePaint.color, strokePaint.opacity);
        strokeWidth = node.strokeWeight ?? 1;
        if (stroke) extractedColors.add(stroke);
      }
    }

     const cornerRadius = node.cornerRadius ?? (node.rectangleCornerRadii ? node.rectangleCornerRadii[0] : 0);

     const effects: FrameNode['effects'] = [];
    if (node.effects) {
      for (const eff of node.effects) {
        if (eff.visible !== false && eff.type === 'DROP_SHADOW') {
          effects.push({
            type: 'drop-shadow',
            color: figmaColorToHex(eff.color) ?? 'rgba(0,0,0,0.2)',
            offsetX: eff.offset?.x ?? 0,
            offsetY: eff.offset?.y ?? 4,
            blur: eff.radius ?? 8,
          });
        }
      }
    }

    const bbox = node.absoluteBoundingBox;
    const width = bbox?.width ?? 100;
    const height = bbox?.height ?? 100;

     switch (node.type) {
      case 'DOCUMENT': {
         if (node.children) {
          for (const child of node.children) {
            processFigmaNode(child, parentId);
          }
        }
        break;
      }

      case 'CANVAS': {
         if (node.children) {
          for (const child of node.children) {
            processFigmaNode(child, parentId);
          }
        }
        break;
      }

      case 'FRAME':
      case 'COMPONENT':
      case 'INSTANCE':
      case 'GROUP': {
        const isTopLevel = parentId === 'root';
        const layout = figmaLayoutToVitra(node);

        let sizingHorizontal: 'fixed' | 'hug' | 'fill' = 'fixed';
        if (node.layoutAlign === 'STRETCH' || node.layoutSizingHorizontal === 'FILL') {
          sizingHorizontal = 'fill';
        } else if (node.layoutSizingHorizontal === 'HUG' || (!bbox && node.children && node.children.length > 0)) {
          sizingHorizontal = 'hug';
        }

        let sizingVertical: 'fixed' | 'hug' | 'fill' = 'fixed';
        if (node.layoutGrow === 1 || node.layoutSizingVertical === 'FILL') {
          sizingVertical = 'fill';
        } else if (node.layoutSizingVertical === 'HUG' || (!bbox && node.children && node.children.length > 0)) {
          sizingVertical = 'hug';
        }

        if (isTopLevel) {
           const preset = width <= 500 ? 'mobile' : width >= 1200 ? 'desktop' : 'tablet';
          const artboard = createArtboardNode({
            id: node.id || `artboard-${Date.now().toString(36)}`,
            name: node.name || 'Artboard',
            preset,
            x: bbox?.x ?? 0,
            y: bbox?.y ?? 0,
            width,
            height,
            fill: fill ?? '#FFFFFF',
            cornerRadius,
            layout: layout ?? {
              direction: 'vertical',
              gap: 0,
              padding: { top: 0, right: 0, bottom: 0, left: 0 },
              alignItems: 'start',
              justifyContent: 'start',
            },
          });
          store.insertNode(artboard, parentId);

          if (node.children) {
            for (const child of node.children) {
              processFigmaNode(child, artboard.id);
            }
          }
        } else {
           const frameWidth = sizingHorizontal === 'fill' ? undefined : (bbox?.width ?? (sizingHorizontal === 'hug' ? undefined : 100));
          const frameHeight = sizingVertical === 'fill' ? undefined : (bbox?.height ?? (sizingVertical === 'hug' ? undefined : 100));

          const frame = createFrameNode({
            id: node.id || `frame-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name: node.name || 'Frame',
            width: frameWidth,
            height: frameHeight,
            sizingHorizontal,
            sizingVertical,
            fill,
            stroke,
            strokeWidth,
            cornerRadius,
            layout,
            effects: effects.length > 0 ? effects : undefined,
          });
          store.insertNode(frame, parentId);

          if (node.children) {
            for (const child of node.children) {
              processFigmaNode(child, frame.id);
            }
          }
        }
        break;
      }

      case 'TEXT': {
        const textContent = node.characters ?? '';
        const fontSize = node.style?.fontSize ?? 16;
        const fontWeight = node.style?.fontWeight ?? 400;
        const lineHeight = node.style?.lineHeightPx ?? Math.round(fontSize * 1.3);

        const shouldWrap = (bbox && bbox.width > 0 && (node.textAutoResize === 'HEIGHT' || node.textAutoResize === 'NONE'))
          || node.layoutAlign === 'STRETCH'
          || (textContent.length > 35 && (!node.textAutoResize || node.textAutoResize === 'HEIGHT'));

        const wrapMaxWidth = (bbox && bbox.width > 0) ? bbox.width : (shouldWrap ? 260 : undefined);

        const textNode = createTextNode({
          id: node.id || `text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: node.name || textContent.slice(0, 16) || 'Text',
          text: textContent,
          fontSize,
          fontWeight,
          lineHeight,
          fill: fill ?? '#000000',
          maxWidth: wrapMaxWidth,
          wrap: Boolean(shouldWrap),
        });
        store.insertNode(textNode, parentId);
        break;
      }

      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'VECTOR': {
        const shapeType = node.type === 'ELLIPSE' ? 'ellipse' : 'rectangle';
        const shape = createShapeNode({
          id: node.id || `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: node.name || shapeType,
          shapeType,
          width,
          height,
          fill: fill ?? '#CCCCCC',
          stroke,
          strokeWidth,
          cornerRadius,
        });
        store.insertNode(shape, parentId);
        break;
      }

      default: {
         if (node.children && node.children.length > 0) {
          const fallback = createFrameNode({
            id: node.id || `container-${Date.now().toString(36)}`,
            name: node.name || node.type,
            width,
            height,
            fill,
          });
          store.insertNode(fallback, parentId);
          for (const child of node.children) {
            processFigmaNode(child, fallback.id);
          }
        }
        break;
      }
    }
  }

  processFigmaNode(figmaRoot, 'root');

  return {
    store,
    manifestName: (projectName && projectName !== 'Imported Figma Project') ? projectName : (figmaRoot.name || projectName),
    extractedColors: Array.from(extractedColors),
  };
}

export interface FigmaExportResult {
  name: string;
  document: FigmaNode;
}

/**
 * Converts a Vitra InMemorySceneStore into a Figma REST-compatible JSON document.
 */
export function convertVitraToFigmaJson(
  store: ISceneStore,
  documentName = 'Vitra Export'
): FigmaExportResult {
  const root = store.getRoot();
  const children = store.getChildren(root.id);

  function nodeToFigma(node: SceneNode): FigmaNode {
    const figmaNode: FigmaNode = {
      id: node.id,
      name: node.name,
      type: 'FRAME',
    };

    if (node.type === 'artboard' || node.type === 'frame') {
      const x = 'x' in node && typeof node.x === 'number' ? node.x : 0;
      const y = 'y' in node && typeof node.y === 'number' ? node.y : 0;
      figmaNode.type = 'FRAME';
      figmaNode.absoluteBoundingBox = {
        x,
        y,
        width: node.width ?? 400,
        height: node.height ?? 400,
      };

      if (node.fill) {
        figmaNode.fills = [
          {
            type: 'SOLID',
            color: hexToFigmaColor(node.fill),
          },
        ];
      }

      if (node.stroke) {
        figmaNode.strokes = [
          {
            type: 'SOLID',
            color: hexToFigmaColor(node.stroke),
          },
        ];
        figmaNode.strokeWeight = node.strokeWidth ?? 1;
      }

      if (node.cornerRadius) {
        figmaNode.cornerRadius = node.cornerRadius;
      }

      if (node.layout) {
        figmaNode.layoutMode = node.layout.direction === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
        figmaNode.itemSpacing = node.layout.gap ?? 0;
        figmaNode.paddingTop = node.layout.padding?.top ?? 0;
        figmaNode.paddingRight = node.layout.padding?.right ?? 0;
        figmaNode.paddingBottom = node.layout.padding?.bottom ?? 0;
        figmaNode.paddingLeft = node.layout.padding?.left ?? 0;

        if (node.layout.justifyContent === 'center') figmaNode.primaryAxisAlignItems = 'CENTER';
        else if (node.layout.justifyContent === 'end') figmaNode.primaryAxisAlignItems = 'MAX';
        else if (node.layout.justifyContent === 'space-between') figmaNode.primaryAxisAlignItems = 'SPACE_BETWEEN';
        else figmaNode.primaryAxisAlignItems = 'MIN';

        if (node.layout.alignItems === 'center') figmaNode.counterAxisAlignItems = 'CENTER';
        else if (node.layout.alignItems === 'end') figmaNode.counterAxisAlignItems = 'MAX';
        else figmaNode.counterAxisAlignItems = 'MIN';
      }

      const nodeChildren = store.getChildren(node.id);
      if (nodeChildren.length > 0) {
        figmaNode.children = nodeChildren.map((c: SceneNode) => nodeToFigma(c));
      }
    } else if (node.type === 'text') {
      figmaNode.type = 'TEXT';
      figmaNode.characters = node.text;
      figmaNode.style = {
        fontSize: node.fontSize ?? 16,
        fontWeight: node.fontWeight ?? 400,
        lineHeightPx: node.lineHeight ?? 22,
      };
      if (node.fill) {
        figmaNode.fills = [
          {
            type: 'SOLID',
            color: hexToFigmaColor(node.fill),
          },
        ];
      }
    } else if (node.type === 'shape') {
      figmaNode.type = node.shapeType === 'ellipse' ? 'ELLIPSE' : 'RECTANGLE';
      figmaNode.absoluteBoundingBox = {
        x: 0,
        y: 0,
        width: node.width ?? 100,
        height: node.height ?? 100,
      };
      if (node.fill) {
        figmaNode.fills = [
          {
            type: 'SOLID',
            color: hexToFigmaColor(node.fill),
          },
        ];
      }
      if (node.cornerRadius) {
        figmaNode.cornerRadius = node.cornerRadius;
      }
    }

    return figmaNode;
  }

  return {
    name: documentName,
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [
        {
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          children: children.map((child: SceneNode) => nodeToFigma(child)),
        },
      ],
    },
  };
}

export function hexToFigmaColor(hex: string): FigmaColor {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = clean.length >= 8 ? parseInt(clean.substring(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

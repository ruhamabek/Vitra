import {
  SceneNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
  createIconNode,
  AutoLayout,
  Effect,
  LayoutSizing,
  ShapeType,
  ArtboardPreset,
} from './nodes.js';
import { ISceneStore } from './store.js';

export type DeclarativeNodeType = 'artboard' | 'frame' | 'text' | 'shape' | 'icon';

export interface DeclarativeNode {
  id?: string;
  type?: DeclarativeNodeType;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  parentId?: string | null;
  preset?: ArtboardPreset;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  sizingHorizontal?: LayoutSizing;
  sizingVertical?: LayoutSizing;
  layout?: Partial<AutoLayout>;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  wrap?: boolean;
  maxWidth?: number;
  icon?: string;
  size?: number;
  color?: string;
  shapeType?: ShapeType;
  effects?: Effect[];
  stateLabel?: string;
  children?: DeclarativeNode[];
  [key: string]: unknown;
}

export type DeclarativeNodeInput = DeclarativeNode;

export interface InsertTreeResult {
  rootId: string;
  totalInserted: number;
}

/**
 * Normalizes an arbitrary JSON node specification into a validated Vitra SceneNode.
 */
export function instantiateNode(raw: DeclarativeNode): SceneNode {
  const id = raw.id || crypto.randomUUID();
  const rawWithId = { ...raw, id };
  const type = rawWithId.type;

  switch (type) {
    case 'artboard':
      return createArtboardNode(rawWithId as Parameters<typeof createArtboardNode>[0]);
    case 'frame':
      return createFrameNode(rawWithId as Parameters<typeof createFrameNode>[0]);
    case 'text':
      return createTextNode(rawWithId as Parameters<typeof createTextNode>[0]);
    case 'shape':
      return createShapeNode(rawWithId as Parameters<typeof createShapeNode>[0]);
    case 'icon':
      return createIconNode(rawWithId as Parameters<typeof createIconNode>[0]);
    default:
       if ('text' in rawWithId && typeof rawWithId.text === 'string') {
        return createTextNode(rawWithId as Parameters<typeof createTextNode>[0]);
      }
       return createFrameNode({ ...rawWithId, type: 'frame', id } as Parameters<typeof createFrameNode>[0]);
  }
}

/**
 * Recursively inserts a declarative node tree into the scene store.
 * Supports arbitrary nested `children: [...]` or flat structures.
 */
export function insertDeclarativeTree(
  store: ISceneStore,
  rawNode: DeclarativeNode,
  parentId: string,
  index?: number
): InsertTreeResult {
  const children = rawNode.children;
   const { children: _c, ...nodeProps } = rawNode;

  const node = instantiateNode(nodeProps);
  store.insertNode(node, parentId, index);
  let count = 1;

  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;
      const res = insertDeclarativeTree(store, child, node.id, i);
      count += res.totalInserted;
    }
  }

  return { rootId: node.id, totalInserted: count };
}

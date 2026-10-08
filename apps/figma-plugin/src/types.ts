import type {
  SceneNode as VitraNode,
  DocumentNode as VitraDocNode,
   FigmaDocumentResponse,
} from '@vitra/core';

 export type PluginToUiMessage =
  | { type: 'PULL_SUCCESS'; message: string; count: number }
  | { type: 'PUSH_SUCCESS'; message: string }
  | { type: 'ERROR'; error: string }
  | { type: 'SELECTION_SERIALIZED'; figmaJson: FigmaDocumentResponse }
  | { type: 'VARIABLES_SERIALIZED'; tokens: Record<string, unknown>; themes: Record<string, Record<string, unknown>>; count: number };

export type UiToPluginMessage =
  | { type: 'APPLY_SNAPSHOT'; root: VitraDocNode; nodes: Record<string, VitraNode> }
  | { type: 'APPLY_MUTATION'; event: Record<string, unknown> }
  | { type: 'REQUEST_PUSH_SELECTION' }
  | { type: 'REQUEST_PUSH_ALL' }
  | { type: 'REQUEST_EXPORT_VARIABLES' }
  | { type: 'SET_LIVE_MODE'; enabled: boolean };

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

export interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR';
  visible?: boolean;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  radius?: number;
}

export interface FigmaPluginParentNode {
  appendChild: (child: FigmaPluginNode) => void;
}

export interface FigmaPluginNode extends FigmaPluginParentNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  removed?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: FigmaPaint[] | ReadonlyArray<FigmaPaint>;
  strokes?: FigmaPaint[] | ReadonlyArray<FigmaPaint>;
  strokeWeight?: number;
  cornerRadius?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  effects?: FigmaEffect[] | ReadonlyArray<FigmaEffect>;
  characters?: string;
  fontSize?: number;
  lineHeight?: { value: number; unit: 'PIXELS' | 'PERCENT' };
  children?: FigmaPluginNode[] | ReadonlyArray<FigmaPluginNode>;
  resize: (width: number, height: number) => void;
  setPluginData: (key: string, value: string) => void;
  getPluginData: (key: string) => string;
}

export interface FigmaPluginPage extends FigmaPluginParentNode {
  name: string;
  children: FigmaPluginNode[];
  selection: FigmaPluginNode[];
  findOne: (predicate: (node: FigmaPluginNode) => boolean) => FigmaPluginNode | null;
}

export interface FigmaVariableMode {
  modeId: string;
  name: string;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  variableIds?: string[];
  modes?: FigmaVariableMode[];
}

export interface FigmaVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | string;
  valuesByMode?: Record<string, unknown>;
}

export interface FigmaPaintStyle {
  id?: string;
  name: string;
  paints?: FigmaPaint[];
}

export interface FigmaPluginApi {
  showUI: (
    html: string,
    options: {
      width: number;
      height: number;
      title?: string;
      themeColors?: boolean;
    }
  ) => void;
  ui: {
    postMessage: (msg: PluginToUiMessage) => void;
    onmessage?: (msg: UiToPluginMessage) => void | Promise<void>;
  };
  currentPage: FigmaPluginPage;
  root: {
    name?: string;
  };
  viewport: {
    scrollAndZoomIntoView: (nodes: FigmaPluginNode[] | ReadonlyArray<FigmaPluginNode>) => void;
  };
  createFrame: () => FigmaPluginNode;
  createText: () => FigmaPluginNode;
  createRectangle: () => FigmaPluginNode;
  createEllipse: () => FigmaPluginNode;
  createNodeFromSvg?: (svg: string) => FigmaPluginNode;
  loadFontAsync: (font: { family: string; style: string }) => Promise<void>;
  variables?: {
    getLocalVariableCollectionsAsync?: () => Promise<FigmaVariableCollection[]>;
    getLocalVariablesAsync?: () => Promise<FigmaVariable[]>;
  };
  getLocalPaintStylesAsync?: () => Promise<FigmaPaintStyle[]>;
}

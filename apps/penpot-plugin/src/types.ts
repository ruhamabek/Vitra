import type { SceneNode as VitraNode, DocumentNode as VitraDocNode, PenpotDocumentResponse } from '@vitra/core';

export interface PenpotNativeShape {
  id: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: Array<{ fillColor?: string }>;
  strokes?: Array<{ strokeColor?: string; strokeWidth?: number }>;
  borderRadius?: number;
  layout?: string;
  flexDirection?: string;
  rowGap?: number;
  columnGap?: number;
  alignItems?: string;
  justifyContent?: string;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  characters?: string;
  text?: string;
  fontSize?: number | string;
  fontWeight?: string;
  lineHeight?: number;
  growType?: 'auto-width' | 'auto-height' | 'none';
  children?: PenpotNativeShape[];
  layoutChild?: {
    horizontalSizing?: 'auto' | 'fill' | 'fix';
    verticalSizing?: 'auto' | 'fill' | 'fix';
  };
  resize?: (width: number, height: number) => void;
  remove?: () => void;
  appendChild?: (child: PenpotNativeShape) => void;
  addFlexLayout?: (options?: Record<string, unknown>) => Record<string, unknown>;
}

export interface PenpotPluginApi {
  ui: {
    open: (title: string, url: string, options: { width: number; height: number }) => void;
    sendMessage: (msg: PenpotToUiMessage) => void;
    onMessage?: (handler: (msg: UiToPenpotMessage) => void) => void;
    on?: (event: string, handler: (msg: UiToPenpotMessage) => void) => void;
  };
  selection?: PenpotNativeShape[];
  currentPage?: {
    id?: string;
    name?: string;
    shapes?: PenpotNativeShape[];
  };
  createBoard: () => PenpotNativeShape;
  createText: (text: string) => PenpotNativeShape;
  createRectangle: () => PenpotNativeShape;
  createEllipse?: () => PenpotNativeShape;
  createShapeFromSvg?: (svg: string) => PenpotNativeShape;
  on?: (event: string, handler: (msg: UiToPenpotMessage) => void) => void;
}

export type PenpotToUiMessage =
  | { type: 'PULL_SUCCESS'; message: string; count: number }
  | { type: 'PUSH_SUCCESS'; message: string }
  | { type: 'ERROR'; error: string }
  | { type: 'SELECTION_SERIALIZED'; penpotJson: PenpotDocumentResponse };

export type UiToPenpotMessage =
  | { type: 'APPLY_SNAPSHOT'; root: VitraDocNode; nodes: Record<string, VitraNode> }
  | { type: 'REQUEST_PUSH_SELECTION' }
  | { type: 'REQUEST_PUSH_ALL' }
  | { type: 'SET_LIVE_MODE'; enabled: boolean };


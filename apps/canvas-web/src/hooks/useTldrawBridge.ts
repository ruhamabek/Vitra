import { useEffect, useRef } from 'react';
import { Editor, createShapeId, type TLShape } from '@tldraw/tldraw';
import {
  SceneNode,
  InMemorySceneStore,
  ArtboardNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
} from '@vitra/core';
import type { LayoutNodeResult } from '@vitra/layout';

const TLDRAW_COLOR_MAP: Record<string, string> = {
  black: '#F3F4F6',
  grey: '#94A3B8',
  'light-violet': '#C084FC',
  violet: '#A855F7',
  blue: '#38BDF8',
  'light-blue': '#7DD3FC',
  yellow: '#FBBF24',
  orange: '#FB923C',
  green: '#34D399',
  red: '#F87171',
  white: '#FFFFFF',
};

const FONT_SIZE_MAP: Record<string, number> = {
  s: 13,
  m: 16,
  l: 24,
  xl: 32,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getUniqueId(baseId: string, store: InMemorySceneStore): string {
  let candidate = baseId;
  let counter = 1;
  while (store.getNode(candidate)) {
    candidate = `${baseId}-${counter++}`;
  }
  return candidate;
}

function findDeepestContainer(
  store: InMemorySceneStore,
  layout: LayoutNodeResult | undefined,
  point: { x: number; y: number },
  currentOffset = { x: 0, y: 0 }
): string {
  if (!layout) return '';

  if (layout.children) {
    for (const childLayout of layout.children) {
      const node = store.getNode(childLayout.nodeId);
      if (!node) continue;
      if (node.type === 'frame' || node.type === 'artboard') {
        const absX = currentOffset.x + childLayout.bounds.x;
        const absY = currentOffset.y + childLayout.bounds.y;
        const width = childLayout.bounds.width;
        const height = childLayout.bounds.height;
        if (
          point.x >= absX &&
          point.x <= absX + width &&
          point.y >= absY &&
          point.y <= absY + height
        ) {
          const deeper = findDeepestContainer(store, childLayout, point, {
            x: absX,
            y: absY,
          });
          return deeper || childLayout.nodeId;
        }
      }
    }
  }

  return layout.nodeId;
}

interface RichTextNode {
  type?: string;
  text?: string;
  content?: RichTextNode[];
  [key: string]: unknown;
}

interface TldrawShapeProps {
  text?: string;
  richText?: RichTextNode;
  name?: string;
  color?: string;
  size?: string;
  w?: number;
  h?: number;
  geo?: string;
  [key: string]: unknown;
}

function extractTextFromRichText(obj: unknown): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(extractTextFromRichText).join('');
  if (typeof obj === 'object') {
    const node = obj as RichTextNode;
    if (typeof node.text === 'string') return node.text;
    if (node.content) return extractTextFromRichText(node.content);
  }
  return '';
}

function extractShapeText(editor: Editor, shape: TLShape): string {
  try {
    const util = editor.getShapeUtil(shape);
    if (util && 'getText' in util && typeof (util as { getText?: (s: TLShape) => string }).getText === 'function') {
      const text = (util as { getText: (s: TLShape) => string }).getText(shape);
      if (typeof text === 'string' && text.trim()) return text.trim();
    }
  } catch {}

  const props = (shape.props ?? {}) as TldrawShapeProps;
  if (typeof props.text === 'string' && props.text.trim()) {
    return props.text.trim();
  }

  if (props.richText) {
    const extracted = extractTextFromRichText(props.richText).trim();
    if (extracted) return extracted;
  }

  return '';
}

export interface UseTldrawBridgeOptions {
  editor: Editor | null;
  editorRef?: React.MutableRefObject<Editor | null>;
  store: InMemorySceneStore | null;
  storeRef: React.MutableRefObject<InMemorySceneStore | null>;
  layouts: Record<string, LayoutNodeResult>;
  handleInsertNode: (node: SceneNode, parentId: string, index?: number) => void;
  handleDeleteNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
}

export function useTldrawBridge({
  editor: editorProp,
  editorRef,
  store,
  storeRef,
  layouts,
  handleInsertNode,
  handleDeleteNode,
  selectedNodeId,
  setSelectedNodeId,
}: UseTldrawBridgeOptions) {
  const isIngestingRef = useRef(false);
  const pendingTimerRef = useRef<number | null>(null);
  const lastTextChangeRef = useRef<Record<string, { text: string; time: number }>>({});

  useEffect(() => {
    const editor = editorProp || editorRef?.current;
    if (!editor) return;

    const scheduleCheck = (delay = 100) => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = window.setTimeout(() => {
        processShapes();
      }, delay);
    };

    const processShapes = () => {
      if (isIngestingRef.current) return;
      const currentStore = storeRef.current;
      if (!currentStore) return;

      const allShapes = editor.getCurrentPageShapes();
      const editingShapeId = editor.getEditingShapeId();

      for (const shape of allShapes) {
        if (shape.type === 'vitra-artboard') continue;

        if (shape.type === 'text') {
          const text = extractShapeText(editor, shape);
          if (!text) {
            // NEVER delete empty text shapes while user is placing or editing them!
            continue;
          }

          if (shape.id === editingShapeId) {
            const now = Date.now();
            const record = lastTextChangeRef.current[shape.id];
            if (!record || record.text !== text) {
              lastTextChangeRef.current[shape.id] = { text, time: now };
              scheduleCheck(800);
              continue;
            } else if (now - record.time < 800) {
              scheduleCheck(800 - (now - record.time));
              continue;
            } else {
               editor.setEditingShape(null);
              delete lastTextChangeRef.current[shape.id];
            }
          }
        } else {
          // Skip shapes currently being edited by user in tldraw
          if (shape.id === editingShapeId) continue;
        }

        // We have a completed user shape (text, geo, frame, arrow, line, note)!
        const didIngest = ingestShape(shape, currentStore);
        if (didIngest) {
          break; // Ingest one at a time to let layout update
        }
      }
    };

    const ingestShape = (shape: TLShape, currentStore: InMemorySceneStore): boolean => {
      isIngestingRef.current = true;
      try {
        const root = currentStore.getRoot();
        const artboardNodes = currentStore
          .getChildren(root.id)
          .filter((c) => c.type === 'artboard') as ArtboardNode[];

        let targetArtboardId: string | null = null;
        let relX = shape.x;
        let relY = shape.y;

        for (const artboard of artboardNodes) {
          const artboardShape = editor.getShape(createShapeId(`vitra-${artboard.id}`));
          const abX = artboardShape ? artboardShape.x : artboard.x;
          const abY = artboardShape ? artboardShape.y : artboard.y;
          const abProps = (artboardShape?.props ?? {}) as TldrawShapeProps;
          const abW = abProps.w ?? artboard.width ?? 1440;
          const abH = abProps.h ?? artboard.height ?? 900;

          if (
            shape.x >= abX &&
            shape.x <= abX + abW &&
            shape.y >= abY &&
            shape.y <= abY + abH
          ) {
            targetArtboardId = artboard.id;
            relX = shape.x - abX;
            relY = shape.y - abY;
            break;
          }
        }

        const props = (shape.props ?? {}) as TldrawShapeProps;
        const colorName = props.color || 'white';
        const mappedColor = TLDRAW_COLOR_MAP[colorName] || '#FFFFFF';

         if (shape.type === 'frame' && !targetArtboardId) {
          const name = props.name || `Artboard ${artboardNodes.length + 1}`;
          const id = getUniqueId(slugify(name) || 'artboard', currentStore);
          const newArtboard = createArtboardNode({
            id,
            name,
            x: Math.round(shape.x),
            y: Math.round(shape.y),
            width: Math.max(300, Math.round(props.w ?? 1440)),
            height: Math.max(300, Math.round(props.h ?? 900)),
            preset: 'desktop',
            fill: '#0B0E14',
          });

          handleInsertNode(newArtboard, root.id);
          editor.deleteShapes([shape.id]);
          setSelectedNodeId(id);
          scheduleCheck(50);
          return true;
        }

         let parentId: string;
        if (!targetArtboardId) {
          const abW = Math.max(480, Math.round(((props.w as number) || 240) + 64));
          const abH = Math.max(320, Math.round(((props.h as number) || 120) + 64));
          const newAbId = getUniqueId(`artboard-${artboardNodes.length + 1}`, currentStore);
          const newArtboard = createArtboardNode({
            id: newAbId,
            name: `Artboard ${artboardNodes.length + 1}`,
            x: Math.round(shape.x - 32),
            y: Math.round(shape.y - 32),
            width: abW,
            height: abH,
            preset: 'custom',
            fill: '#0B0E14',
            layout: {
              direction: 'vertical',
              padding: { top: 24, right: 24, bottom: 24, left: 24 },
              gap: 16,
              alignItems: 'start',
              justifyContent: 'start',
            },
          });
          handleInsertNode(newArtboard, root.id);
          targetArtboardId = newArtboard.id;
          parentId = newArtboard.id;
        } else {
          const artboardLayout = layouts[targetArtboardId];
          parentId =
            findDeepestContainer(currentStore, artboardLayout, {
              x: relX,
              y: relY,
            }) || targetArtboardId;
        }

        // 2. Text shape
        if (shape.type === 'text') {
          const textContent = extractShapeText(editor, shape);
          if (!textContent) {
            return false;
          }
          const baseSlug = slugify(textContent.slice(0, 16)) || 'text';
          const id = getUniqueId(`text-${baseSlug}`, currentStore);
          const fontSize = (props.size && props.size in FONT_SIZE_MAP) ? FONT_SIZE_MAP[props.size] : 16;

          const textNode = createTextNode({
            id,
            name: textContent.slice(0, 24),
            text: textContent,
            fontSize,
            fill: mappedColor || '#F3F4F6',
            fontWeight: 500,
          });

          handleInsertNode(textNode, parentId);
          editor.deleteShapes([shape.id]);
          setSelectedNodeId(id);
          scheduleCheck(50);
          return true;
        }

        // 3. Geometric shape (Rectangle / Ellipse)
        if (shape.type === 'geo') {
          const isEllipse = props.geo === 'ellipse';
          const baseName = isEllipse ? 'ellipse' : 'rect';
          const id = getUniqueId(baseName, currentStore);
          const w = Math.max(20, Math.round(props.w ?? 100));
          const h = Math.max(20, Math.round(props.h ?? 100));

          const shapeNode = createShapeNode({
            id,
            shapeType: isEllipse ? 'ellipse' : 'rectangle',
            name: isEllipse ? 'Ellipse' : 'Rectangle',
            width: w,
            height: h,
            fill: mappedColor || '#38BDF8',
            cornerRadius: isEllipse ? 0 : 8,
          });

          handleInsertNode(shapeNode, parentId);
          editor.deleteShapes([shape.id]);
          setSelectedNodeId(id);
          scheduleCheck(50);
          return true;
        }

         if (shape.type === 'arrow' || shape.type === 'line' || shape.type === 'draw') {
          const bounds = editor.getShapePageBounds(shape.id);
          const w = Math.max(20, Math.round(bounds?.width ?? props.w ?? 100));
          const h = Math.max(2, Math.round(bounds?.height ?? props.h ?? 2));
          const isArrow = shape.type === 'arrow';
          const baseName = isArrow ? 'arrow' : (shape.type === 'line' ? 'line' : 'draw');
          const id = getUniqueId(baseName, currentStore);

          const shapeNode = createShapeNode({
            id,
            shapeType: 'divider',
            name: isArrow ? 'Arrow' : (shape.type === 'line' ? 'Line' : 'Divider'),
            width: w,
            height: Math.max(2, h),
            fill: mappedColor || '#38BDF8',
            stroke: mappedColor || '#38BDF8',
            strokeWidth: 2,
          });

          handleInsertNode(shapeNode, parentId);
          editor.deleteShapes([shape.id]);
          setSelectedNodeId(id);
          scheduleCheck(50);
          return true;
        }

        // 5. Frame shape inside artboard
        if (shape.type === 'frame') {
          const name = props.name || 'Frame';
          const id = getUniqueId(slugify(name) || 'frame', currentStore);
          const w = Math.max(40, Math.round(props.w ?? 240));
          const h = Math.max(40, Math.round(props.h ?? 160));

          const frameNode = createFrameNode({
            id,
            name,
            width: w,
            height: h,
            fill: '#151A22',
            cornerRadius: 8,
          });

          handleInsertNode(frameNode, parentId);
          editor.deleteShapes([shape.id]);
          setSelectedNodeId(id);
          scheduleCheck(50);
          return true;
        }

        // 6. Note shape (sticky note -> Frame with Text)
        if (shape.type === 'note') {
          const textContent = extractShapeText(editor, shape) || 'Note';
          const id = getUniqueId('note', currentStore);
          const textId = getUniqueId(`${id}-text`, currentStore);

          const noteFrame = createFrameNode({
            id,
            name: 'Sticky Note',
            width: Math.max(120, Math.round(props.w ?? 160)),
            height: Math.max(80, Math.round(props.h ?? 120)),
            fill: mappedColor || '#FBBF24',
            cornerRadius: 8,
          });

          const noteText = createTextNode({
            id: textId,
            name: textContent.slice(0, 20),
            text: textContent,
            fontSize: 14,
            fill: '#0B0E14',
            wrap: true,
          });

          handleInsertNode(noteFrame, parentId);
          handleInsertNode(noteText, noteFrame.id);
          editor.deleteShapes([shape.id]);
          setSelectedNodeId(id);
          scheduleCheck(50);
          return true;
        }

        // Unhandled shape type - do not delete, do not break loop
        return false;
      } catch (err: unknown) {
        console.error('[useTldrawBridge] Error ingesting shape:', err);
        return false;
      } finally {
        isIngestingRef.current = false;
      }
    };

     scheduleCheck(50);

    const heartbeatInterval = window.setInterval(() => {
      processShapes();
    }, 250);

    const unsubscribe = editor.store.listen(() => {
      scheduleCheck(100);
    });

    return () => {
      window.clearInterval(heartbeatInterval);
      unsubscribe();
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [
    editorProp,
    editorRef,
    store,
    storeRef,
    layouts,
    handleInsertNode,
    setSelectedNodeId,
  ]);

   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (!selectedNodeId) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const activeEditor = editorProp || editorRef?.current;
      if (activeEditor?.getEditingShapeId()) return;

      e.preventDefault();
      handleDeleteNode(selectedNodeId);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, handleDeleteNode, editorProp, editorRef]);
}

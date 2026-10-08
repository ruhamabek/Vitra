import React, { useState, useCallback } from 'react';
import { ShapeUtil, HTMLContainer, TLBaseShape, T, Rectangle2d } from '@tldraw/tldraw';
import { SceneNode, InMemorySceneStore } from '@vitra/core';
import { LayoutNodeResult } from '@vitra/layout';
import { icons } from 'lucide-react';

declare module '@tldraw/tldraw' {
  interface TLGlobalShapePropsMap {
    'vitra-artboard': {
      w: number;
      h: number;
      artboardId: string;
      title: string;
      stateLabel?: string;
      preset: string;
      version?: number;
    };
  }
}

export type VitraArtboardShape = TLBaseShape<
  'vitra-artboard',
  {
    w: number;
    h: number;
    artboardId: string;
    title: string;
    stateLabel?: string;
    preset: string;
    version?: number;
  }
>;

export interface LucideIconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  fill?: string;
  style?: React.CSSProperties;
  className?: string;
}

 const LUCIDE_INDEX = new Map<string, React.ComponentType<LucideIconProps>>();
if (icons) {
  for (const [key, Component] of Object.entries(icons as unknown as Record<string, React.ComponentType<LucideIconProps>>)) {
    if (Component) {
      LUCIDE_INDEX.set(key.toLowerCase().replace(/[^a-z0-9]/g, ''), Component);
    }
  }
}

 const LUCIDE_ALIASES: Record<string, string> = {
   barchart: 'chartbar',
  barchart2: 'chartbar',
  barchart3: 'chartcolumn',
  barchart4: 'chartcolumn',
  barchartbig: 'chartcolumnbig',
  'bar-chart-2': 'chartbar',
  'bar-chart': 'chartbar',
  'bar-chart-3': 'chartcolumn',
  piechart: 'chartpie',
  'pie-chart': 'chartpie',
  linechart: 'chartline',
  'line-chart': 'chartline',
  areachart: 'chartarea',
  'area-chart': 'chartarea',
  scatterchart: 'chartscatter',
  candlestickchart: 'chartcandlestick',

  morehorizontal: 'ellipsis',
  'more-horizontal': 'ellipsis',
  morevertical: 'ellipsisvertical',
  'more-vertical': 'ellipsisvertical',
  more: 'ellipsis',
  dots: 'ellipsis',
  dotshorizontal: 'ellipsis',
  dotsvertical: 'ellipsisvertical',

  helpcircle: 'circlehelp',
  'help-circle': 'circlehelp',
  alertcircle: 'circlealert',
  'alert-circle': 'circlealert',
  checkcircle: 'circlecheck',
  'check-circle': 'circlecheck',
  checkcircle2: 'circlecheck',
  'check-circle-2': 'circlecheck',
  xcircle: 'circlex',
  'x-circle': 'circlex',
  pluscircle: 'circleplus',
  minuscircle: 'circleminus',
  dividecircle: 'circledivide',
  dotcircle: 'circledot',
  playcircle: 'circleplay',
  stopcircle: 'circlestop',
  pausecircle: 'circlepause',
  arrowdowncircle: 'circlearrowdown',
  arrowupcircle: 'circlearrowup',
  arrowleftcircle: 'circlearrowleft',
  arrowrightcircle: 'circlearrowright',

  usercircle: 'circleuser',
  usercircle2: 'circleuserround',
  usersquare: 'squareuser',

  edit: 'pencil',
  edit2: 'pencil',
  edit3: 'pencil',
  'edit-2': 'pencil',
  'edit-3': 'pencil',
  modify: 'pencil',
  pen: 'pencil',

  fileedit: 'filepenline',
  'file-edit': 'filepenline',
  folderedit: 'folderpen',
  'folder-edit': 'folderpen',

  cart: 'shoppingcart',
  shopping_cart: 'shoppingcart',
  'shopping-cart': 'shoppingcart',

  close: 'x',
  cancel: 'x',
  cross: 'x',

  trash: 'trash2',
  delete: 'trash2',
  remove: 'trash2',

  checkdouble: 'checkcheck',
  check_double: 'checkcheck',
  'check-double': 'checkcheck',
  doublecheck: 'checkcheck',

  hamburger: 'menu',
  nav: 'menu',
  navigation: 'compass',

  home: 'house',
  profile: 'user',
  account: 'user',
  avatar: 'user',

  like: 'heart',
  favorite: 'heart',
  rating: 'star',

  chat: 'messagesquare',
  message: 'messagesquare',
  comment: 'messagesquare',
  comments: 'messagesquare',
  discussion: 'messagesquare',

  audio: 'headphones',
  huddle: 'headphones',
  headset: 'headphones',

  mic: 'mic',
  microphone: 'mic',

  lightning: 'zap',
  signal: 'activity',

  attachment: 'paperclip',
  clip: 'paperclip',
  attach: 'paperclip',

  sendmessage: 'send',
  'send-message': 'send',

  share: 'share2',

  photo: 'image',
  picture: 'image',

  envelope: 'mail',
  email: 'mail',

  poll: 'chartbar',
  poll2: 'chartbar',
  graph: 'chartbar',
  chart: 'chartbar',

  sidebar: 'panelleft',
  sidebarclose: 'panelleftclose',
  sidebaropen: 'panelleftopen',

  sortasc: 'arrowupnarrowwide',
  sortdesc: 'arrowdownwidenarrow',

  subtitles: 'captions',
  stars: 'sparkles',

  cog: 'settings',
  gear: 'settings',
};

function getLucideIconComponent(name: string): React.ComponentType<LucideIconProps> | null {
  if (!name) return null;
  const raw = name.trim();
  const norm = raw.toLowerCase().replace(/^lucide:/, '').replace(/^feather:/, '').trim();
  const clean = norm.replace(/[^a-z0-9]/g, '');

   if (LUCIDE_INDEX.has(clean)) {
    return LUCIDE_INDEX.get(clean)!;
  }

   const targetAlias = LUCIDE_ALIASES[norm] || LUCIDE_ALIASES[clean];
  if (targetAlias) {
    const aliasClean = targetAlias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (LUCIDE_INDEX.has(aliasClean)) {
      return LUCIDE_INDEX.get(aliasClean)!;
    }
  }

   const pascal = norm
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const iconsMap = icons as unknown as Record<string, React.ComponentType<LucideIconProps>>;
  if (iconsMap && iconsMap[pascal]) {
    return iconsMap[pascal];
  }

   for (const [key, comp] of LUCIDE_INDEX.entries()) {
    if (key.startsWith(clean) || clean.startsWith(key)) {
      return comp;
    }
  }

  return null;
}

function isRawSvgMarkup(content?: string): boolean {
  if (!content) return false;
  return (
    content.includes('<path') ||
    content.includes('<line') ||
    content.includes('<polyline') ||
    content.includes('<polygon') ||
    content.includes('<circle') ||
    content.includes('<rect') ||
    content.includes('<svg')
  );
}

export interface VitraArtboardShapeContext {
  store: InMemorySceneStore | null;
  layouts: Record<string, LayoutNodeResult>;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  editingText: string;
  getZoomLevel?: () => number;
  onSelectNode: (id: string) => void;
  onStartEditText: (id: string, text: string) => void;
  onChangeEditText: (text: string) => void;
  onFinishEditText: (id: string, text: string) => void;
  onCancelEditText: () => void;
  onMoveNode?: (nodeId: string, newParentId: string, index?: number) => void;
}

export const shapeContextRef: { current: VitraArtboardShapeContext | null } = {
  current: null,
};

type ShapeContextListener = () => void;
const shapeContextListeners = new Set<ShapeContextListener>();

export function setShapeContext(newCtx: VitraArtboardShapeContext) {
  shapeContextRef.current = newCtx;
  shapeContextListeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

export class VitraArtboardShapeUtil extends ShapeUtil<VitraArtboardShape> {
  static override type = 'vitra-artboard' as const;

  static override props = {
    w: T.number,
    h: T.number,
    artboardId: T.string,
    title: T.string,
    stateLabel: T.optional(T.string),
    preset: T.string,
    version: T.optional(T.number),
  };

  getDefaultProps(): VitraArtboardShape['props'] {
    return {
      w: 1440,
      h: 900,
      artboardId: '',
      title: 'Artboard',
      stateLabel: 'Default',
      preset: 'desktop',
    };
  }

  getGeometry(shape: VitraArtboardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override canResize() {
    return true;
  }

  override isFrameLike() {
    return true;
  }

  component(shape: VitraArtboardShape) {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    React.useEffect(() => {
      shapeContextListeners.add(forceUpdate);
      return () => {
        shapeContextListeners.delete(forceUpdate);
      };
    }, []);

    const ctx = shapeContextRef.current;
    const { artboardId, title, stateLabel } = shape.props;
    const store = ctx?.store;
    const layout = ctx?.layouts[artboardId];
    const artboardNode = store ? store.getNode(artboardId) : null;

    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'visible',
          pointerEvents: 'all',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-32px',
            left: '0px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: '#A5ADCB',
          }}
        >
          <span style={{ color: '#CAD3F5' }}>{title}</span>
          {stateLabel && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: '#363A4F',
                color: '#89B4FA',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {stateLabel}
            </span>
          )}
          <span style={{ fontSize: '11px', color: '#6E738D' }}>
            {shape.props.w} × {shape.props.h}
          </span>
        </div>

        <div
          style={{
            width: '100%',
            height: '100%',
            background: (artboardNode && 'fill' in artboardNode && artboardNode.fill) || '#0F111A',
            borderRadius: (artboardNode && 'cornerRadius' in artboardNode ? artboardNode.cornerRadius : 0) || 8,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {store && layout ? (
            <ArtboardChildren
              store={store}
              layout={layout}
              ctx={ctx}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6E738D',
                fontSize: '13px',
              }}
            >
              Computing artboard layout...
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: VitraArtboardShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}

export interface DragInfo {
  nodeId: string;
  parentId: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  isDragging: boolean;
  targetIndex: number;
  originalIndex: number;
}

function findNodeLayout(layout: LayoutNodeResult | null | undefined, nodeId: string): LayoutNodeResult | null {
  if (!layout) return null;
  if (layout.nodeId === nodeId) return layout;
  if (layout.children) {
    for (const child of layout.children) {
      const found = findNodeLayout(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function renderDropIndicator(
  isHorizontal: boolean,
  targetIndex: number,
  siblings: SceneNode[],
  layout: LayoutNodeResult
): React.ReactNode {
  if (siblings.length === 0) return null;

  let lineX = 0;
  let lineY = 0;
  let lineWidth = 0;
  let lineHeight = 0;

  if (isHorizontal) {
    if (targetIndex <= 0) {
      const firstId = siblings[0]?.id;
      if (!firstId) return null;
      const firstL = findNodeLayout(layout, firstId);
      if (!firstL) return null;
      lineX = Math.max(0, firstL.bounds.x - 4);
      lineY = firstL.bounds.y;
      lineHeight = firstL.bounds.height;
    } else if (targetIndex >= siblings.length) {
      const lastId = siblings[siblings.length - 1]?.id;
      if (!lastId) return null;
      const lastL = findNodeLayout(layout, lastId);
      if (!lastL) return null;
      lineX = lastL.bounds.x + lastL.bounds.width + 2;
      lineY = lastL.bounds.y;
      lineHeight = lastL.bounds.height;
    } else {
      const prevId = siblings[targetIndex - 1]?.id;
      const nextId = siblings[targetIndex]?.id;
      if (!prevId || !nextId) return null;
      const prevL = findNodeLayout(layout, prevId);
      const nextL = findNodeLayout(layout, nextId);
      if (!prevL || !nextL) return null;
      lineX = Math.round((prevL.bounds.x + prevL.bounds.width + nextL.bounds.x) / 2) - 1;
      lineY = Math.min(prevL.bounds.y, nextL.bounds.y);
      lineHeight = Math.max(prevL.bounds.height, nextL.bounds.height);
    }
  } else {
    // Vertical
    if (targetIndex <= 0) {
      const firstId = siblings[0]?.id;
      if (!firstId) return null;
      const firstL = findNodeLayout(layout, firstId);
      if (!firstL) return null;
      lineY = Math.max(0, firstL.bounds.y - 4);
      lineX = firstL.bounds.x;
      lineWidth = firstL.bounds.width;
    } else if (targetIndex >= siblings.length) {
      const lastId = siblings[siblings.length - 1]?.id;
      if (!lastId) return null;
      const lastL = findNodeLayout(layout, lastId);
      if (!lastL) return null;
      lineY = lastL.bounds.y + lastL.bounds.height + 2;
      lineX = lastL.bounds.x;
      lineWidth = lastL.bounds.width;
    } else {
      const prevId = siblings[targetIndex - 1]?.id;
      const nextId = siblings[targetIndex]?.id;
      if (!prevId || !nextId) return null;
      const prevL = findNodeLayout(layout, prevId);
      const nextL = findNodeLayout(layout, nextId);
      if (!prevL || !nextL) return null;
      lineY = Math.round((prevL.bounds.y + prevL.bounds.height + nextL.bounds.y) / 2) - 1;
      lineX = Math.min(prevL.bounds.x, nextL.bounds.x);
      lineWidth = Math.max(prevL.bounds.width, nextL.bounds.width);
    }
  }

  return (
    <div
      key="__drop_indicator__"
      style={{
        position: 'absolute',
        left: `${lineX}px`,
        top: `${lineY}px`,
        width: isHorizontal ? '3px' : `${Math.max(20, lineWidth)}px`,
        height: isHorizontal ? `${Math.max(20, lineHeight)}px` : '3px',
        backgroundColor: '#89B4FA',
        boxShadow: '0 0 10px #89B4FA, 0 0 18px rgba(137, 180, 250, 0.7)',
        borderRadius: '3px',
        zIndex: 99999,
        pointerEvents: 'none',
        transition: 'left 0.08s ease, top 0.08s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: '#89B4FA',
          boxShadow: '0 0 8px #89B4FA',
          ...(isHorizontal
            ? { top: '-3px', left: '-2px' }
            : { left: '-3px', top: '-2px' }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: '#89B4FA',
          boxShadow: '0 0 8px #89B4FA',
          ...(isHorizontal
            ? { bottom: '-3px', left: '-2px' }
            : { right: '-3px', top: '-2px' }),
        }}
      />
    </div>
  );
}

function ArtboardChildren({
  store,
  layout,
  ctx,
}: {
  store: InMemorySceneStore;
  layout: LayoutNodeResult;
  ctx: VitraArtboardShapeContext | null;
}) {
  const rootNode = store.getNode(layout.nodeId);
  if (!rootNode) return null;

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  const startDrag = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const node = store.getNode(nodeId);
      if (!node || !node.parentId) return;
      const parentNode = store.getNode(node.parentId);
      if (!parentNode) return;

      const siblings = store.getChildren(parentNode.id);
      const origIndex = siblings.findIndex((s) => s.id === nodeId);
      if (origIndex < 0) return;

      const startX = e.clientX;
      const startY = e.clientY;
      let hasDragged = false;

      const onPointerMove = (moveEv: PointerEvent) => {
        const rawDx = moveEv.clientX - startX;
        const rawDy = moveEv.clientY - startY;
        const dist = Math.hypot(rawDx, rawDy);

        if (!hasDragged) {
          if (dist < 4) return;
          hasDragged = true;
        }

        const zoom = ctx?.getZoomLevel ? ctx.getZoomLevel() : 1;
        const dx = rawDx / zoom;
        const dy = rawDy / zoom;

        const isHorizontal =
          (parentNode.type === 'frame' || parentNode.type === 'artboard') &&
          parentNode.layout?.direction === 'horizontal';

        const otherSiblings = siblings.filter((s) => s.id !== nodeId);

         const nodeLayout = findNodeLayout(layout, nodeId);
        const origBounds = nodeLayout?.bounds ?? { x: 0, y: 0, width: 40, height: 40 };
        const currentCenterX = origBounds.x + dx + origBounds.width / 2;
        const currentCenterY = origBounds.y + dy + origBounds.height / 2;

        let targetIdx = 0;
        if (isHorizontal) {
          for (let i = 0; i < otherSiblings.length; i++) {
            const sib = otherSiblings[i];
            if (!sib) continue;
            const sLayout = findNodeLayout(layout, sib.id);
            const sMidX = sLayout ? sLayout.bounds.x + sLayout.bounds.width / 2 : 0;
            if (currentCenterX > sMidX) {
              targetIdx = i + 1;
            }
          }
        } else {
          for (let i = 0; i < otherSiblings.length; i++) {
            const sib = otherSiblings[i];
            if (!sib) continue;
            const sLayout = findNodeLayout(layout, sib.id);
            const sMidY = sLayout ? sLayout.bounds.y + sLayout.bounds.height / 2 : 0;
            if (currentCenterY > sMidY) {
              targetIdx = i + 1;
            }
          }
        }

        setDragInfo({
          nodeId,
          parentId: parentNode.id,
          startX,
          startY,
          deltaX: dx,
          deltaY: dy,
          isDragging: true,
          targetIndex: targetIdx,
          originalIndex: origIndex,
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        setDragInfo((curr) => {
          if (curr && curr.isDragging && curr.nodeId === nodeId) {
            if (curr.targetIndex !== curr.originalIndex) {
              ctx?.onMoveNode?.(nodeId, curr.parentId, curr.targetIndex);
            }
          }
          return null;
        });
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [store, layout, ctx]
  );

  const children = store.getChildren(rootNode.id);
  const isRootParentOfDragged = dragInfo?.isDragging && dragInfo.parentId === rootNode.id;
  const isHorizontal =
    (rootNode.type === 'frame' || rootNode.type === 'artboard') &&
    rootNode.layout?.direction === 'horizontal';
  const rootOtherSiblings = isRootParentOfDragged ? children.filter((c) => c.id !== dragInfo.nodeId) : [];

  return (
    <>
      {children.map((child) => {
        const childLayout = layout.children.find((c) => c.nodeId === child.id);
        if (!childLayout) return null;
        return renderSubtree(child, childLayout, store, ctx, dragInfo, startDrag, layout);
      })}
      {isRootParentOfDragged && renderDropIndicator(isHorizontal, dragInfo.targetIndex, rootOtherSiblings, layout)}
    </>
  );
}

function renderSubtree(
  node: SceneNode,
  layout: LayoutNodeResult,
  store: InMemorySceneStore,
  ctx: VitraArtboardShapeContext | null,
  dragInfo: DragInfo | null,
  startDrag: (nodeId: string, e: React.PointerEvent) => void,
  artboardLayout: LayoutNodeResult
): React.ReactNode {
  const { x, y, width: w, height: h } = layout.bounds;
  const isSelected = ctx?.selectedNodeId === node.id;
  const isBeingDragged = dragInfo?.isDragging && dragInfo.nodeId === node.id;

  const dragTransformStyle: React.CSSProperties = isBeingDragged
    ? {
        transform: `translate3d(${dragInfo.deltaX}px, ${dragInfo.deltaY}px, 0) scale(1.02)`,
        zIndex: 9999,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 2px #89B4FA, 0 0 24px rgba(137, 180, 250, 0.5)',
        opacity: 0.95,
        cursor: 'grabbing',
        pointerEvents: 'none',
      }
    : {
        cursor: isSelected ? 'grab' : 'pointer',
      };

  if (node.type === 'frame') {
    const children = store.getChildren(node.id);
    const isParentOfDragged = dragInfo?.isDragging && dragInfo.parentId === node.id;
    const isHorizontal = node.layout?.direction === 'horizontal';
    const otherSiblings = isParentOfDragged ? children.filter((c) => c.id !== dragInfo.nodeId) : [];

    return (
      <div
        key={node.id}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
          startDrag(node.id, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
          boxSizing: 'border-box',
          backgroundColor: node.fill?.startsWith('$') ? '#1E1E2E' : node.fill || 'transparent',
          borderRadius: `${node.cornerRadius ?? 0}px`,
          border: node.stroke ? `${node.strokeWidth ?? 1}px solid ${node.stroke}` : undefined,
          outline: isSelected ? '2px solid #89B4FA' : undefined,
          outlineOffset: isSelected ? '1px' : undefined,
          boxShadow: isBeingDragged
            ? dragTransformStyle.boxShadow
            : isSelected
            ? '0 0 0 1px #11111B, 0 0 12px rgba(137, 180, 250, 0.5)'
            : node.effects?.find((e) => e.type === 'drop-shadow')
            ? `0px 10px 20px rgba(0,0,0,0.3)`
            : undefined,
          overflow: isBeingDragged ? 'visible' : 'hidden',
          transition: isBeingDragged ? 'none' : 'outline 0.1s, box-shadow 0.1s',
          ...dragTransformStyle,
        }}
      >
        {children.map((child) => {
          const childLayout = layout.children.find((c) => c.nodeId === child.id);
          if (!childLayout) return null;
          return renderSubtree(child, childLayout, store, ctx, dragInfo, startDrag, artboardLayout);
        })}
        {isParentOfDragged && renderDropIndicator(isHorizontal, dragInfo.targetIndex, otherSiblings, layout)}
      </div>
    );
  }

  if (node.type === 'shape') {
    const isEllipse = node.shapeType === 'ellipse';
    return (
      <div
        key={node.id}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
          startDrag(node.id, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
          boxSizing: 'border-box',
          backgroundColor: node.fill || '#89B4FA',
          borderRadius: isEllipse ? '50%' : `${node.cornerRadius ?? 0}px`,
          border: node.stroke ? `${node.strokeWidth ?? 1}px solid ${node.stroke}` : undefined,
          outline: isSelected ? '2px solid #89B4FA' : undefined,
          outlineOffset: isSelected ? '1px' : undefined,
          boxShadow: isBeingDragged
            ? dragTransformStyle.boxShadow
            : isSelected
            ? '0 0 0 1px #11111B, 0 0 12px rgba(137, 180, 250, 0.5)'
            : undefined,
          transition: isBeingDragged ? 'none' : 'outline 0.1s, box-shadow 0.1s',
          ...dragTransformStyle,
        }}
      />
    );
  }

  if (node.type === 'text') {
    const isEditing = ctx?.editingNodeId === node.id;
    const isWrap = node.wrap;

    return (
      <div
        key={node.id}
        onPointerDown={(e) => {
          if (isEditing) return;
          if (e.button !== 0) return;
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
          startDrag(node.id, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          ctx?.onStartEditText(node.id, node.text);
        }}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: isWrap ? `${w}px` : undefined,
          maxWidth: isWrap ? `${w}px` : undefined,
          height: isWrap ? 'auto' : `${h}px`,
          minHeight: `${h}px`,
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: `${node.fontSize ?? 16}px`,
          fontWeight: node.fontWeight ?? 400,
          color: node.fill?.startsWith('$') ? '#CDD6F4' : node.fill || '#FFFFFF',
          whiteSpace: isWrap ? 'normal' : 'nowrap',
          wordBreak: isWrap ? 'break-word' : undefined,
          lineHeight: 1.35,
          outline: isSelected ? '2px solid #89B4FA' : undefined,
          outlineOffset: isSelected ? '2px' : undefined,
          boxShadow: isBeingDragged
            ? dragTransformStyle.boxShadow
            : isSelected
            ? '0 0 0 1px #11111B, 0 0 12px rgba(137, 180, 250, 0.5)'
            : undefined,
          transition: isBeingDragged ? 'none' : 'outline 0.1s, box-shadow 0.1s',
          ...dragTransformStyle,
          cursor: isEditing ? 'text' : dragTransformStyle.cursor,
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={ctx.editingText}
            onChange={(e) => ctx.onChangeEditText(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                ctx.onFinishEditText(node.id, ctx.editingText);
              } else if (e.key === 'Escape') {
                ctx.onCancelEditText();
              }
            }}
            onBlur={() => ctx.onFinishEditText(node.id, ctx.editingText)}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
              background: '#1E2030',
              border: '1px solid #89B4FA',
              borderRadius: '4px',
              padding: '2px 4px',
              outline: 'none',
              width: '100%',
              minWidth: '60px',
            }}
          />
        ) : (
          node.text
        )}
      </div>
    );
  }

  if (node.type === 'icon') {
    const stroke = node.color || '#FFFFFF';
    const fill = node.fill || 'none';
    const strokeW = node.strokeWidth ?? 2;
    const isRaw = isRawSvgMarkup(node.icon);
    const IconComponent = isRaw ? null : getLucideIconComponent(node.icon);
    const iconRenderSize = Math.min(w, h) || node.size || 20;

    return (
      <div
        key={node.id}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
          startDrag(node.id, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          ctx?.onSelectNode(node.id);
        }}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          outline: isSelected ? '2px solid #89B4FA' : undefined,
          outlineOffset: isSelected ? '1px' : undefined,
          boxShadow: isBeingDragged
            ? dragTransformStyle.boxShadow
            : isSelected
            ? '0 0 0 1px #11111B, 0 0 12px rgba(137, 180, 250, 0.5)'
            : undefined,
          transition: isBeingDragged ? 'none' : 'outline 0.1s, box-shadow 0.1s',
          ...dragTransformStyle,
        }}
      >
        {IconComponent ? (
          <IconComponent
            size={iconRenderSize}
            color={stroke}
            strokeWidth={strokeW}
            fill={fill === 'none' ? 'none' : fill}
            style={{ pointerEvents: 'none' }}
          />
        ) : isRaw ? (
          <svg
            width={w}
            height={h}
            viewBox="0 0 24 24"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
            dangerouslySetInnerHTML={{ __html: node.icon }}
          />
        ) : (
          <svg
            width={iconRenderSize}
            height={iconRenderSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          >
            <circle cx="12" cy="12" r="8" />
          </svg>
        )}
      </div>
    );
  }

  return null;
}

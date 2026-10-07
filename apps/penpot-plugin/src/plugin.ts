
import type { SceneNode as VitraNode, DocumentNode as VitraDocNode, PenpotShape } from '@vitra/core';
import {
  mapVitraLayoutToPenpot,
  mapVitraSizingToPenpot,
} from './penpot-adapter.js';
import { getSvgForIcon } from './icons.js';
import type { UiToPenpotMessage, PenpotPluginApi, PenpotNativeShape } from './types.js';

declare const penpot: PenpotPluginApi;

try {
  penpot.ui.open('Vitra Live Sync', '', {
    width: 340,
    height: 580,
  });
} catch (err) {
  console.error('[Vitra] Error opening Penpot UI:', err);
}

let liveModeEnabled = false;

function normalizePenpotFontWeight(weight?: number | string): string {
  if (!weight) return '400';
  const num = typeof weight === 'string' ? parseInt(weight, 10) : Number(weight);
  if (isNaN(num)) return '400';
  if (num <= 250) return '200';
  if (num <= 350) return '300';
  if (num <= 550) return '400';  
  if (num <= 650) return '600';
  if (num <= 800) return '700';
  return '900';
}

 const dimCache = new Map<string, { w: number; h: number }>();

 let renderOpsCount = 0;
async function yieldIfNeeded(): Promise<void> {
  renderOpsCount++;
  if (renderOpsCount % 16 === 0) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function getMemoizedNodeDimensions(node: VitraNode, allNodes: Record<string, VitraNode>): { w: number; h: number } {
  if (!node) return { w: 40, h: 20 };
  const cached = dimCache.get(node.id);
  if (cached) return cached;

  const w = estimateNodeWidth(node, allNodes);
  const h = estimateNodeHeight(node, allNodes);
  const res = { w, h };
  if (node.id) dimCache.set(node.id, res);
  return res;
}

function estimateNodeHeight(node: VitraNode, allNodes: Record<string, VitraNode>): number {
  if ('height' in node && node.height !== undefined && node.height > 0) return node.height;
  if (node.type === 'artboard') return 900;

  const childIds = 'childIds' in node ? node.childIds : [];
  if (!Array.isArray(childIds) || childIds.length === 0) {
    return 20;
  }

  const layout = 'layout' in node ? node.layout : undefined;
  const isVertical = layout?.direction === 'vertical';
  const gap = layout?.gap || 0;
  const paddingTop = layout?.padding?.top || 0;
  const paddingBottom = layout?.padding?.bottom || 0;

  let totalH = paddingTop + paddingBottom;
  let maxChildH = 0;

  for (let i = 0; i < childIds.length; i++) {
    const c = allNodes[childIds[i]];
    if (!c) continue;
    let h = 20;
    if ('height' in c && c.height !== undefined && c.height > 0) {
      h = c.height;
    } else if (c.type === 'text') {
      h = Math.round((c.fontSize || 14) * 1.35);
    } else if (c.type === 'icon') {
      h = c.size || 20;
    } else if ('childIds' in c && c.childIds && c.childIds.length > 0) {
      h = getMemoizedNodeDimensions(c, allNodes).h;
    }

    if (isVertical) {
      totalH += h + (i > 0 ? gap : 0);
    } else {
      maxChildH = Math.max(maxChildH, h);
    }
  }

  return isVertical ? Math.max(20, totalH) : Math.max(20, maxChildH + paddingTop + paddingBottom);
}

function estimateNodeWidth(node: VitraNode, allNodes: Record<string, VitraNode>, depth = 0): number {
  if (depth > 10) return 40;
  if ('width' in node && node.width !== undefined && node.width > 0) return node.width;
  if (node.type === 'artboard') return 1440;

  const parent = node.parentId ? allNodes[node.parentId] : null;
  const layout = 'layout' in node ? node.layout : undefined;
  const paddingLeft = layout?.padding?.left || 0;
  const paddingRight = layout?.padding?.right || 0;

   const isHug = 'sizingHorizontal' in node && node.sizingHorizontal === 'hug';
  const parentLayout = parent && 'layout' in parent ? parent.layout : undefined;
  if (
    !isHug &&
    'sizingHorizontal' in node &&
    node.sizingHorizontal === 'fill' &&
    parent &&
    parentLayout?.direction === 'vertical'
  ) {
    const parentW = getMemoizedNodeDimensions(parent, allNodes).w;
    const pLeft = parentLayout?.padding?.left || 0;
    const pRight = parentLayout?.padding?.right || 0;
    return Math.max(40, parentW - pLeft - pRight);
  }

   const childIds = 'childIds' in node ? node.childIds : [];
  if (Array.isArray(childIds) && childIds.length > 0) {
    const isHorizontal = layout?.direction === 'horizontal';
    const gap = layout?.gap || 0;
    let totalW = paddingLeft + paddingRight;
    let maxChildW = 0;

    for (let i = 0; i < childIds.length; i++) {
      const c = allNodes[childIds[i]];
      if (!c) continue;
      let w = 24;
      if ('width' in c && c.width !== undefined && c.width > 0) {
        w = c.width;
      } else if (c.type === 'text') {
        w = Math.round((c.text || '').length * (c.fontSize || 14) * 0.6) + 4;
      } else if (c.type === 'icon') {
        w = c.size || 20;
      } else if ('childIds' in c && c.childIds && c.childIds.length > 0) {
        w = getMemoizedNodeDimensions(c, allNodes).w;
      }
      if (isHorizontal) {
        totalW += w + (i > 0 ? gap : 0);
      } else {
        maxChildW = Math.max(maxChildW, w);
      }
    }

    return isHorizontal ? Math.max(16, totalW) : Math.max(16, maxChildW + paddingLeft + paddingRight);
  }

  if (node.type === 'icon') return node.size || 20;
  if (node.type === 'text') return Math.round((node.text || '').length * (node.fontSize || 14) * 0.6) + 4;

  return 40;
}

 async function applySnapshot(root: VitraDocNode, nodes: Record<string, VitraNode>): Promise<number> {
  dimCache.clear();
  renderOpsCount = 0;
  let count = 0;
  let offsetX = 0;

   let childIds = root?.childIds || [];
  if (!childIds || childIds.length === 0) {
    childIds = Object.keys(nodes).filter((id) => {
      const n = nodes[id];
      return n && (n.parentId === 'root' || n.type === 'artboard');
    });
  }

   try {
    const existingShapes = penpot.currentPage?.shapes || [];
    for (const s of existingShapes) {
      if (s.type === 'board' && typeof s.remove === 'function') {
        try { s.remove(); } catch {}
      }
    }
  } catch {}

  for (const childId of childIds) {
    const node = nodes[childId];
    if (!node) continue;

    try {
      const shape = await renderVitraNode(node, nodes);
      if (shape) {
        count++;
        if (node.type === 'artboard') {
          shape.x = offsetX;
          shape.y = 0;
          const artboardW = 'width' in node && typeof node.width === 'number' ? node.width : 400;
          offsetX += artboardW + 60;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Vitra] Error rendering root node:', childId, msg);
    }
  }

  return count;
}

async function renderVitraNode(node: VitraNode, allNodes: Record<string, VitraNode>): Promise<PenpotNativeShape | null> {
  try {
    await yieldIfNeeded();
    let shape: PenpotNativeShape | undefined;

    if (node.type === 'artboard' || node.type === 'frame') {
       shape = penpot.createBoard();

      shape.name = node.name || (node.type === 'artboard' ? 'Artboard' : 'Frame');
      const { w: defaultW, h: defaultH } = getMemoizedNodeDimensions(node, allNodes);
      const targetW = 'width' in node && typeof node.width === 'number' ? node.width : defaultW;
      const targetH = 'height' in node && typeof node.height === 'number' ? node.height : defaultH;
      shape.resize?.(Math.max(1, targetW), Math.max(1, targetH));

      
      if (node.fill && node.fill !== 'none' && node.fill !== 'transparent') {
        try { shape.fills = [{ fillColor: node.fill }]; } catch {}
      } else if (node.type === 'artboard') {
        try { shape.fills = [{ fillColor: '#0E1621' }]; } catch {}
      } else {
        try { shape.fills = []; } catch {}
      }

      if (node.stroke && node.stroke !== 'none' && node.stroke !== 'transparent') {
        try { shape.strokes = [{ strokeColor: node.stroke, strokeWidth: node.strokeWidth || 1 }]; } catch {}
      } else {
        try { shape.strokes = []; } catch {}
      }

      if (node.cornerRadius !== undefined) {
        try { shape.borderRadius = node.cornerRadius; } catch {}
      }

      const flex = mapVitraLayoutToPenpot('layout' in node ? node.layout : undefined);
      if (flex && typeof shape.addFlexLayout === 'function') {
        try {
          const flexOpts: Record<string, unknown> = {
            dir: flex.flexDirection === 'column' ? 'column' : 'row',
            alignItems: flex.alignItems || 'start',
            justifyContent: flex.justifyContent || 'start',
            rowGap: flex.rowGap || 0,
            columnGap: flex.columnGap || 0,
          };
          let flexLayout: Record<string, unknown> | undefined;
          try {
            flexLayout = shape.addFlexLayout(flexOpts);
          } catch {
            try { flexLayout = shape.addFlexLayout(); } catch {}
          }
          if (flexLayout) {
            try { flexLayout.dir = flexOpts.dir; } catch {}
            try { flexLayout.rowGap = flexOpts.rowGap; } catch {}
            try { flexLayout.columnGap = flexOpts.columnGap; } catch {}
            try { flexLayout.alignItems = flexOpts.alignItems; } catch {}
            try { flexLayout.justifyContent = flexOpts.justifyContent; } catch {}
            try { if (flex.paddingLeft) flexLayout.horizontalPadding = flex.paddingLeft; } catch {}
            try { if (flex.paddingTop) flexLayout.verticalPadding = flex.paddingTop; } catch {}
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[Vitra] addFlexLayout error:', msg);
        }
      }

       const childIds = 'childIds' in node ? node.childIds : [];
      if (Array.isArray(childIds) && childIds.length > 0) {
        for (const childId of childIds) {
          const childNode = allNodes[childId];
          if (childNode) {
            const childShape = await renderVitraNode(childNode, allNodes);
            if (childShape && typeof shape.appendChild === 'function') {
              try {
                shape.appendChild(childShape);
                if (flex && childShape.layoutChild) {
                  const sizing = mapVitraSizingToPenpot(childNode, flex);
                  try { childShape.layoutChild.horizontalSizing = sizing.horizontalSizing; } catch {}
                  try { childShape.layoutChild.verticalSizing = sizing.verticalSizing; } catch {}
                }

              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn('[Vitra] appendChild failed for node', childId, msg);
              }
            }
          }
        }
      }
    } else if (node.type === 'text') {
      try {
        shape = penpot.createText(node.text || ' ');
        if (shape) {
          shape.name = node.name || 'Text';
          if (node.fontSize) {
            try {
              shape.fontSize = typeof node.fontSize === 'number' ? `${node.fontSize}` : node.fontSize;
            } catch {
              try { shape.fontSize = node.fontSize; } catch {}
            }
          }
          if (node.fontWeight) {
            try {
              shape.fontWeight = normalizePenpotFontWeight(node.fontWeight);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              console.warn('[Vitra] Failed setting fontWeight:', msg);
            }
          }
          if (node.lineHeight) {
            try {
              shape.lineHeight = node.lineHeight;
            } catch {}
          }
          if (node.wrap) {
            try {
              shape.growType = 'auto-height';
              let wrapW: number | undefined = 'width' in node && typeof node.width === 'number' ? node.width : undefined;
              if (!wrapW && node.parentId && allNodes[node.parentId]) {
                const parent = allNodes[node.parentId];
                const pW = estimateNodeWidth(parent, allNodes);
                const parentLayout = 'layout' in parent ? parent.layout : undefined;
                const pL = parentLayout?.padding?.left || 0;
                const pR = parentLayout?.padding?.right || 0;
                wrapW = Math.max(100, pW - pL - pR);
              }
              if (typeof wrapW === 'number' && typeof shape.resize === 'function') {
                try { shape.resize(wrapW, shape.height || 24); } catch {}
              }
            } catch {}
          } else {
            try {
              shape.growType = 'auto-width';
            } catch {}
          }
          if (node.fill && node.fill !== 'none' && node.fill !== 'transparent') {
            try { shape.fills = [{ fillColor: node.fill }]; } catch {}
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[Vitra] Failed creating text shape:', msg);
      }
    } else if (node.type === 'icon') {
      const iconSize = node.size || 20;
      const iconColor = node.color || node.fill || '#708499';
      const rawSvg = 'svg' in node ? (node as { svg?: string }).svg : undefined;
      const svgStr = getSvgForIcon(node.icon, iconColor, iconSize, rawSvg);

      if (svgStr && typeof penpot.createShapeFromSvg === 'function') {
        try {
          shape = penpot.createShapeFromSvg(svgStr);
          if (shape) {
            shape.name = node.name || `icon-${node.icon || 'unknown'}`;
            try { shape.resize?.(iconSize, iconSize); } catch {}
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[Vitra] createShapeFromSvg failed, falling back to placeholder shape:', msg);
        }
      }

      if (!shape) {
        try {
          shape = penpot.createRectangle();
          shape.name = node.name || `icon-${node.icon || 'unknown'}`;
          shape.resize?.(iconSize, iconSize);
          if (iconColor) {
            try { shape.fills = [{ fillColor: iconColor }]; } catch {}
          }
        } catch {}
      }
    } else if (node.type === 'shape') {
      try {
        if (node.shapeType === 'ellipse' && typeof penpot.createEllipse === 'function') {
          shape = penpot.createEllipse();
        } else {
          shape = penpot.createRectangle();
        }
        if (shape) {
          shape.name = node.name || 'Shape';
          shape.resize?.(Math.max(1, node.width || 40), Math.max(1, node.height || 40));
          if (node.fill && node.fill !== 'none' && node.fill !== 'transparent') {
            try { shape.fills = [{ fillColor: node.fill }]; } catch {}
          } else {
            try { shape.fills = []; } catch {}
          }
          if (node.stroke && node.stroke !== 'none' && node.stroke !== 'transparent') {
            try { shape.strokes = [{ strokeColor: node.stroke, strokeWidth: node.strokeWidth || 1 }]; } catch {}
          } else {
            try { shape.strokes = []; } catch {}
          }
          if (node.cornerRadius !== undefined && 'borderRadius' in shape) {
            try { shape.borderRadius = node.cornerRadius; } catch {}
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[Vitra] Failed creating shape:', msg);
      }
    }

    return shape ?? null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Vitra] renderVitraNode unexpected error:', node?.id, msg);
    return null;
  }
}

function serializePenpotShape(shape: PenpotNativeShape): PenpotShape {
  return {
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x || 0,
    y: shape.y || 0,
    width: shape.width || 100,
    height: shape.height || 100,
    fillColor: shape.fills?.[0]?.fillColor,
    strokeColor: shape.strokes?.[0]?.strokeColor,
    strokeWidth: shape.strokes?.[0]?.strokeWidth,
    borderRadius: shape.borderRadius,
    layout: shape.layout as 'flex' | 'grid' | 'none' | undefined,
    flexDirection: shape.flexDirection as 'column' | 'row' | 'vertical' | 'horizontal' | undefined,
    rowGap: shape.rowGap,
    columnGap: shape.columnGap,
    alignItems: shape.alignItems as 'start' | 'center' | 'end' | 'stretch' | undefined,
    justifyContent: shape.justifyContent as 'start' | 'center' | 'end' | 'space-between' | undefined,
    padding: shape.padding,
    characters: shape.characters || shape.text,
    fontSize: typeof shape.fontSize === 'number' ? shape.fontSize : undefined,
    children: shape.children ? shape.children.map((c) => serializePenpotShape(c)) : undefined,
  };
}

// Handle messages from the UI iframe
async function handleMessage(msg: UiToPenpotMessage) {
  try {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'APPLY_SNAPSHOT': {
        const count = await applySnapshot(msg.root, msg.nodes || {});
        penpot.ui.sendMessage({
          type: 'PULL_SUCCESS',
          message: `Synced ${count} artboards from Vitra.`,
          count,
        });
        break;
      }

      case 'REQUEST_PUSH_SELECTION': {
        const selection = penpot.selection;
        if (!selection || selection.length === 0) {
          penpot.ui.sendMessage({
            type: 'ERROR',
            error: 'No elements selected in Penpot.',
          });
          return;
        }

        const serialized = selection.map((s) => serializePenpotShape(s));
        penpot.ui.sendMessage({
          type: 'SELECTION_SERIALIZED',
          penpotJson: {
            name: 'Penpot Selection Export',
            pages: [{ id: 'page-1', name: 'Selection', shapes: serialized }],
          },
        });
        break;
      }

      case 'REQUEST_PUSH_ALL': {
        const currentPage = penpot.currentPage;
        const shapes = (currentPage?.shapes || []).map((s) => serializePenpotShape(s));
        if (shapes.length === 0) {
          penpot.ui.sendMessage({
            type: 'ERROR',
            error: 'Current Penpot page is empty. Pull or create artboards first before pushing.',
          });
          return;
        }
        penpot.ui.sendMessage({
          type: 'SELECTION_SERIALIZED',
          penpotJson: {
            name: 'Penpot Page Export',
            pages: [{ id: currentPage?.id || 'page-1', name: currentPage?.name || 'Page 1', shapes }],
          },
        });
        break;
      }

      case 'SET_LIVE_MODE': {
        liveModeEnabled = msg.enabled;
        break;
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    penpot.ui.sendMessage({
      type: 'ERROR',
      error: errorMsg,
    });
  }
}

 if (typeof penpot.ui?.onMessage === 'function') {
  penpot.ui.onMessage(handleMessage);
} else if (typeof penpot.on === 'function') {
  penpot.on('message', handleMessage);
} else if (typeof penpot.ui?.on === 'function') {
  penpot.ui.on('message', handleMessage);
}

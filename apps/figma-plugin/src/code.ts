import type {
  SceneNode as VitraNode,
  DocumentNode as VitraDocNode,
  FigmaNode,
} from '@vitra/core';
import {
  mapVitraLayoutToFigma,
  mapVitraFillsToFigma,
  mapVitraStrokesToFigma,
  mapVitraEffectsToFigma,
  figmaColorToHex,
} from './figma-adapter.js';
import { getSvgForIcon } from './icons.js';
import type {
  UiToPluginMessage,
  FigmaPluginApi,
  FigmaPluginNode,
  FigmaPluginParentNode,
  FigmaPaint,
  FigmaColor,
  FigmaVariableCollection,
} from './types.js';

declare const figma: FigmaPluginApi;
declare const __html__: string;

 figma.showUI(__html__, {
  width: 340,
  height: 580,
  title: 'Vitra Live Sync',
  themeColors: true,
});

let liveModeEnabled = false;
const nodeMap = new Map<string, FigmaPluginNode>(); // vitra_id -> figmaNode

async function loadDefaultFont(family = 'Inter', style = 'Regular'): Promise<void> {
  try {
    await figma.loadFontAsync({ family, style });
  } catch {
    try {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
    } catch {
      // Fallback
    }
  }
}

 function findFigmaNodeByVitraId(vitraId: string): FigmaPluginNode | undefined {
  if (nodeMap.has(vitraId)) {
    const cached = nodeMap.get(vitraId);
    if (cached && !cached.removed) return cached;
    nodeMap.delete(vitraId);
  }
  const found = figma.currentPage.findOne((n: FigmaPluginNode) => n.getPluginData('vitra_id') === vitraId);
  if (found) {
    nodeMap.set(vitraId, found);
  }
  return found ?? undefined;
}

 async function applySnapshot(root: VitraDocNode | Record<string, unknown>, nodes: Record<string, VitraNode>): Promise<number> {
  await loadDefaultFont();

  let count = 0;
  let artboardOffsetX = 0;

   const docRoot = root as { childIds?: string[]; children?: string[] } | undefined;
  let childIds = docRoot?.childIds || docRoot?.children || [];
  if (!childIds || childIds.length === 0) {
    childIds = Object.keys(nodes).filter((id) => {
      const n = nodes[id];
      return n && (n.parentId === 'root' || n.type === 'artboard');
    });
  }
  for (const childId of childIds) {
    const node = nodes[childId];
    if (!node) continue;

    const figmaNode = await renderVitraNode(node, nodes, figma.currentPage);
    if (figmaNode) {
      count++;
       if (node.type === 'artboard') {
        figmaNode.x = artboardOffsetX;
        figmaNode.y = 0;
        artboardOffsetX += (node.width || 400) + 80;
      }
    }
  }

   if (figma.currentPage.children.length > 0) {
    figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);
  }

  return count;
}

async function renderVitraNode(
  node: VitraNode,
  allNodes: Record<string, VitraNode>,
  parent: FigmaPluginParentNode
): Promise<FigmaPluginNode | null> {
  let figmaNode = findFigmaNodeByVitraId(node.id);

  if (node.type === 'artboard' || node.type === 'frame') {
    if (!figmaNode) {
      figmaNode = figma.createFrame();
      figmaNode.setPluginData('vitra_id', node.id);
      parent.appendChild(figmaNode);
    }
    nodeMap.set(node.id, figmaNode);

    figmaNode.name = node.name || (node.type === 'artboard' ? 'Artboard' : 'Frame');
    figmaNode.resize(Math.max(1, node.width || 200), Math.max(1, node.height || 200));

     figmaNode.fills = mapVitraFillsToFigma(node.fill);
    const strokeProps = mapVitraStrokesToFigma(node.stroke, node.strokeWidth);
    figmaNode.strokes = strokeProps.strokes;
    figmaNode.strokeWeight = strokeProps.strokeWeight;

    if (node.cornerRadius !== undefined) {
      figmaNode.cornerRadius = node.cornerRadius;
    }

     const layout = mapVitraLayoutToFigma(node.layout);
    if (layout) {
      figmaNode.layoutMode = layout.layoutMode;
      figmaNode.itemSpacing = layout.itemSpacing;
      figmaNode.paddingTop = layout.paddingTop;
      figmaNode.paddingRight = layout.paddingRight;
      figmaNode.paddingBottom = layout.paddingBottom;
      figmaNode.paddingLeft = layout.paddingLeft;
      figmaNode.primaryAxisAlignItems = layout.primaryAxisAlignItems;
      figmaNode.counterAxisAlignItems = layout.counterAxisAlignItems;
    } else {
      figmaNode.layoutMode = 'NONE';
    }

     figmaNode.effects = mapVitraEffectsToFigma(node.effects);

     const childIds = ('childIds' in node ? node.childIds : undefined) || ('children' in node ? (node as unknown as { children?: string[] }).children : undefined) || [];
    if (Array.isArray(childIds) && childIds.length > 0) {
      for (const childId of childIds) {
        const childNode = allNodes[childId];
        if (childNode) {
          await renderVitraNode(childNode, allNodes, figmaNode);
        }
      }
    }
  } else if (node.type === 'text') {
    if (!figmaNode) {
      figmaNode = figma.createText();
      figmaNode.setPluginData('vitra_id', node.id);
      parent.appendChild(figmaNode);
    }
    nodeMap.set(node.id, figmaNode);

    figmaNode.name = node.name || 'Text';
    await loadDefaultFont('Inter', node.fontWeight && node.fontWeight >= 600 ? 'Bold' : 'Regular');
    
    figmaNode.characters = node.text || '';
    if (node.fontSize) figmaNode.fontSize = node.fontSize;
    if (node.lineHeight) figmaNode.lineHeight = { value: node.lineHeight, unit: 'PIXELS' };
    figmaNode.fills = mapVitraFillsToFigma(node.fill || '#000000');
  } else if (node.type === 'shape') {
    if (!figmaNode) {
      figmaNode = node.shapeType === 'ellipse' ? figma.createEllipse() : figma.createRectangle();
      figmaNode.setPluginData('vitra_id', node.id);
      parent.appendChild(figmaNode);
    }
    nodeMap.set(node.id, figmaNode);

    figmaNode.name = node.name || (node.shapeType === 'ellipse' ? 'Ellipse' : 'Rectangle');
    figmaNode.resize(Math.max(1, node.width || 40), Math.max(1, node.height || 40));
    figmaNode.fills = mapVitraFillsToFigma(node.fill || '#CCCCCC');

    const strokeProps = mapVitraStrokesToFigma(node.stroke, node.strokeWidth);
    figmaNode.strokes = strokeProps.strokes;
    figmaNode.strokeWeight = strokeProps.strokeWeight;

    if (node.cornerRadius !== undefined && figmaNode.cornerRadius !== undefined) {
      figmaNode.cornerRadius = node.cornerRadius;
    }
  } else if (node.type === 'icon') {
    if (!figmaNode) {
      const iconSize = node.size || 20;
      const iconColor = node.color || node.fill || '#708499';
      const iconWithSvg = node as VitraNode & { svg?: string; path?: string; svgContent?: string };
      const rawSvg = iconWithSvg.svg || iconWithSvg.path || iconWithSvg.svgContent;
      const svgStr = getSvgForIcon(node.icon, iconColor, iconSize, rawSvg);

      if (svgStr && typeof figma.createNodeFromSvg === 'function') {
        try {
          figmaNode = figma.createNodeFromSvg(svgStr);
          figmaNode.name = node.name || `icon-${node.icon || 'unknown'}`;
          figmaNode.resize(iconSize, iconSize);
          figmaNode.setPluginData('vitra_id', node.id);
          parent.appendChild(figmaNode);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn('[Vitra] Figma createNodeFromSvg failed:', errorMsg);
        }
      }

      if (!figmaNode) {
        figmaNode = figma.createRectangle();
        figmaNode.name = node.name || `icon-${node.icon || 'unknown'}`;
        figmaNode.resize(iconSize, iconSize);
        figmaNode.setPluginData('vitra_id', node.id);
        parent.appendChild(figmaNode);
      }
    }
    nodeMap.set(node.id, figmaNode);
  }

  return figmaNode ?? null;
}

 function serializeFigmaNode(node: FigmaPluginNode): FigmaNode {
  const result: FigmaNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible !== false,
  };

  if (node.absoluteBoundingBox) {
    result.absoluteBoundingBox = {
      x: node.absoluteBoundingBox.x,
      y: node.absoluteBoundingBox.y,
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height,
    };
  } else {
    result.absoluteBoundingBox = {
      x: node.x || 0,
      y: node.y || 0,
      width: node.width || 100,
      height: node.height || 100,
    };
  }

  if (node.fills && Array.isArray(node.fills)) {
    result.fills = node.fills.map((f: FigmaPaint) => ({
      type: f.type,
      visible: f.visible,
      opacity: f.opacity,
      color: f.color ? { r: f.color.r, g: f.color.g, b: f.color.b } : undefined,
    }));
  }

  if (node.strokes && Array.isArray(node.strokes)) {
    result.strokes = node.strokes.map((s: FigmaPaint) => ({
      type: s.type,
      color: s.color ? { r: s.color.r, g: s.color.g, b: s.color.b } : undefined,
    }));
    result.strokeWeight = node.strokeWeight;
  }

  if (node.cornerRadius !== undefined) {
    result.cornerRadius = node.cornerRadius;
  }

  if (node.layoutMode && node.layoutMode !== 'NONE') {
    result.layoutMode = node.layoutMode;
    result.itemSpacing = node.itemSpacing;
    result.paddingTop = node.paddingTop;
    result.paddingRight = node.paddingRight;
    result.paddingBottom = node.paddingBottom;
    result.paddingLeft = node.paddingLeft;
    result.primaryAxisAlignItems = node.primaryAxisAlignItems;
    result.counterAxisAlignItems = node.counterAxisAlignItems;
  }

  if (node.type === 'TEXT') {
    result.characters = node.characters;
    result.style = {
      fontSize: typeof node.fontSize === 'number' ? node.fontSize : 16,
    };
  }

  if (node.children && Array.isArray(node.children)) {
    result.children = node.children.map((c: FigmaPluginNode) => serializeFigmaNode(c));
  }

  return result;
}

 figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  try {
    switch (msg.type) {
      case 'APPLY_SNAPSHOT': {
        const count = await applySnapshot(msg.root, msg.nodes);
        figma.ui.postMessage({
          type: 'PULL_SUCCESS',
          message: `Synced ${count} artboards/frames from Vitra.`,
          count,
        });
        break;
      }

      case 'REQUEST_PUSH_SELECTION': {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
          figma.ui.postMessage({
            type: 'ERROR',
            error: 'No nodes selected in Figma to push. Select a frame or artboard first.',
          });
          return;
        }

        const serialized = selection.map((node: FigmaPluginNode) => serializeFigmaNode(node));
        figma.ui.postMessage({
          type: 'SELECTION_SERIALIZED',
          figmaJson: {
            name: 'Figma Selection Export',
            document: {
              id: '0:0',
              name: 'Figma Selection',
              type: 'DOCUMENT',
              children: [
                {
                  id: '0:1',
                  name: figma.currentPage.name,
                  type: 'CANVAS',
                  children: serialized,
                },
              ],
            },
          },
        });
        break;
      }

      case 'REQUEST_PUSH_ALL': {
        const pageChildren = figma.currentPage.children;
        if (pageChildren.length === 0) {
          figma.ui.postMessage({
            type: 'ERROR',
            error: 'Current Figma page is empty.',
          });
          return;
        }

        const serialized = pageChildren.map((node: FigmaPluginNode) => serializeFigmaNode(node));
        figma.ui.postMessage({
          type: 'SELECTION_SERIALIZED',
          figmaJson: {
            name: figma.root.name || 'Figma Page Export',
            document: {
              id: '0:0',
              name: figma.root.name || 'Document',
              type: 'DOCUMENT',
              children: [
                {
                  id: '0:1',
                  name: figma.currentPage.name,
                  type: 'CANVAS',
                  children: serialized,
                },
              ],
            },
          },
        });
        break;
      }

      case 'REQUEST_EXPORT_VARIABLES': {
        const { base, themes, count } = await extractFigmaVariablesAndStyles();
        figma.ui.postMessage({
          type: 'VARIABLES_SERIALIZED',
          tokens: base,
          themes,
          count,
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
    figma.ui.postMessage({
      type: 'ERROR',
      error: errorMsg,
    });
  }
};

async function extractFigmaVariablesAndStyles(): Promise<{
  base: Record<string, unknown>;
  themes: Record<string, Record<string, unknown>>;
  count: number;
}> {
  const baseTokens: Record<string, unknown> = {};
  const themes: Record<string, Record<string, unknown>> = {};
  let count = 0;

  function setNested(target: Record<string, unknown>, path: string[], value: unknown, type: string) {
    let curr = target;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i];
      if (!curr[seg] || typeof curr[seg] !== 'object' || '$value' in (curr[seg] as Record<string, unknown>)) {
        curr[seg] = {};
      }
      curr = curr[seg] as Record<string, unknown>;
    }
    const last = path[path.length - 1];
    curr[last] = { $value: value, $type: type };
  }

   if (figma.variables && typeof figma.variables.getLocalVariablesAsync === 'function') {
    try {
      const collections = figma.variables.getLocalVariableCollectionsAsync
        ? await figma.variables.getLocalVariableCollectionsAsync()
        : [];
      const collectionMap = new Map<string, FigmaVariableCollection>();
      for (const col of collections) {
        collectionMap.set(col.id, col);
      }

      const variables = await figma.variables.getLocalVariablesAsync();
      for (const v of variables) {
        const col = collectionMap.get(v.variableCollectionId);
        const modes: Array<{ modeId: string; name: string }> =
          col && col.modes && col.modes.length > 0 ? col.modes : [{ modeId: 'default', name: 'Default' }];

        const rawParts = v.name.split(/[\/\._-]/).filter(Boolean);
        const pathSegments = rawParts.length > 0 ? rawParts : ['misc', v.name];

        for (const mode of modes) {
          const modeVal = v.valuesByMode ? v.valuesByMode[mode.modeId] : undefined;
          if (modeVal === undefined) continue;

          let cleanVal: unknown;
          let tokenType = 'other';

          if (v.resolvedType === 'COLOR') {
            tokenType = 'color';
            cleanVal = figmaColorToHex(modeVal as FigmaColor);
          } else if (v.resolvedType === 'FLOAT') {
            tokenType = 'dimension';
            cleanVal = modeVal;
          } else {
            cleanVal = modeVal;
          }

          if (cleanVal === undefined) continue;

          const modeLower = (mode.name || '').toLowerCase();
          const isBase = modeLower === 'default' || modeLower === 'mode 1' || modeLower === 'light';
          const targetTree = isBase ? baseTokens : (themes[modeLower] = themes[modeLower] || {});

          setNested(targetTree, pathSegments, cleanVal, tokenType);
          count++;
        }
      }
    } catch (e) {
      console.warn('Could not extract native Figma variables:', e);
    }
  }

   if (figma.getLocalPaintStylesAsync) {
    try {
      const paintStyles = await figma.getLocalPaintStylesAsync();
      for (const style of paintStyles) {
        if (!style.paints || style.paints.length === 0) continue;
        const solid = style.paints.find((p) => p.type === 'SOLID' && p.visible !== false);
        if (solid && solid.color) {
          const hex = figmaColorToHex(solid.color, solid.opacity);
          if (hex) {
            const rawParts = style.name.split(/[\/\._-]/).filter(Boolean);
            const pathSegments = rawParts.length > 0 ? rawParts : ['colors', style.name];
            setNested(baseTokens, pathSegments, hex, 'color');
            count++;
          }
        }
      }
    } catch (e) {
      console.warn('Could not extract paint styles:', e);
    }
  }

  return { base: baseTokens, themes, count };
}

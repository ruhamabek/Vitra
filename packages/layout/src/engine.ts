import Yoga, { type Node as YogaNode } from 'yoga-layout';
import { ISceneStore, SceneNode, TextNode } from '@vitra/core';

export interface ComputedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutNodeResult {
  nodeId: string;
  bounds: ComputedBounds;
  children: LayoutNodeResult[];
}

export type TextMeasurer = (node: TextNode) => { width: number; height: number };

export interface LayoutOptions {
  textMeasurer?: TextMeasurer;
}

export const defaultTextMeasurer: TextMeasurer = (node: TextNode) => {
  const fontSize = node.fontSize ?? 16;
  const weightMultiplier = (node.fontWeight ?? 400) >= 600 ? 1.15 : 1.0;

  let totalWidth = 0;
  for (const char of node.text) {
    if (char === ' ') {
      totalWidth += fontSize * 0.28;
    } else if (
      char === 'i' ||
      char === 'l' ||
      char === 'I' ||
      char === '|' ||
      char === '.' ||
      char === ':' ||
      char === ';' ||
      char === '!' ||
      char === "'"
    ) {
      totalWidth += fontSize * 0.32;
    } else if (char >= 'A' && char <= 'Z') {
      totalWidth += fontSize * 0.72;
    } else if (char === 'm' || char === 'w' || char === 'M' || char === 'W') {
      totalWidth += fontSize * 0.88;
    } else if (char.charCodeAt(0) > 127) {
       totalWidth += fontSize * 0.88;
    } else {
      totalWidth += fontSize * 0.54;
    }
  }

  const rawWidth = Math.max(10, Math.round(totalWidth * weightMultiplier));
  const baseLineHeight = Math.round(node.lineHeight ?? fontSize * 1.35);

  const wrapLimit = node.maxWidth && node.maxWidth > 0 ? node.maxWidth : (node.wrap ? 260 : undefined);
  if (node.wrap && wrapLimit && rawWidth > wrapLimit) {
    const lineCount = Math.max(1, Math.ceil(rawWidth / wrapLimit));
    return {
      width: wrapLimit,
      height: lineCount * baseLineHeight,
    };
  }

  return { width: rawWidth, height: baseLineHeight };
};

export async function computeLayout(
  store: ISceneStore,
  targetNodeId: string,
  options?: LayoutOptions
): Promise<LayoutNodeResult> {
  const targetNode = store.getNode(targetNodeId);
  if (!targetNode) {
    throw new Error(`Target node "${targetNodeId}" not found in store.`);
  }

  const measurer = options?.textMeasurer ?? defaultTextMeasurer;

   function buildYogaTree(node: SceneNode, parentNode?: SceneNode): { yogaNode: YogaNode; cleanup: () => void } {
    const yNode = Yoga.Node.create();
    const cleanupFns: Array<() => void> = [() => yNode.free()];

    const parentDirection = (parentNode?.type === 'frame' || parentNode?.type === 'artboard') && parentNode.layout?.direction
      ? parentNode.layout.direction
      : 'vertical';

    if (node.type === 'frame' || node.type === 'artboard') {
      if (node.width !== undefined) {
        yNode.setWidth(node.width);
      }
      if (node.height !== undefined) {
        yNode.setHeight(node.height);
      }

      if ('sizingVertical' in node && node.sizingVertical === 'fill') {
        if (parentDirection === 'vertical') {
          yNode.setFlexGrow(1);
          yNode.setFlexShrink(1);
        } else {
          yNode.setAlignSelf(Yoga.ALIGN_STRETCH);
          yNode.setHeightPercent(100);
        }
      }
      if ('sizingHorizontal' in node && node.sizingHorizontal === 'fill') {
        if (parentDirection === 'horizontal') {
          yNode.setFlexGrow(1);
          yNode.setFlexShrink(1);
        } else {
          yNode.setAlignSelf(Yoga.ALIGN_STRETCH);
          yNode.setWidthPercent(100);
        }
      }

      if (node.layout) {
        const { direction, padding, alignItems, justifyContent } = node.layout;
        
        yNode.setFlexDirection(
          direction === 'horizontal' ? Yoga.FLEX_DIRECTION_ROW : Yoga.FLEX_DIRECTION_COLUMN
        );
        
        if (padding) {
          yNode.setPadding(Yoga.EDGE_TOP, padding.top);
          yNode.setPadding(Yoga.EDGE_RIGHT, padding.right);
          yNode.setPadding(Yoga.EDGE_BOTTOM, padding.bottom);
          yNode.setPadding(Yoga.EDGE_LEFT, padding.left);
        }

        switch (alignItems) {
          case 'center':
            yNode.setAlignItems(Yoga.ALIGN_CENTER);
            break;
          case 'end':
            yNode.setAlignItems(Yoga.ALIGN_FLEX_END);
            break;
          case 'stretch':
            yNode.setAlignItems(Yoga.ALIGN_STRETCH);
            break;
          default:
            yNode.setAlignItems(Yoga.ALIGN_FLEX_START);
        }

        switch (justifyContent) {
          case 'center':
            yNode.setJustifyContent(Yoga.JUSTIFY_CENTER);
            break;
          case 'end':
            yNode.setJustifyContent(Yoga.JUSTIFY_FLEX_END);
            break;
          case 'space-between':
            yNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
            break;
          default:
            yNode.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
        }
      }

       const children = store.getChildren(node.id);
      children.forEach((child, index) => {
        const childRes = buildYogaTree(child, node);
        cleanupFns.push(childRes.cleanup);

        if (index > 0 && node.layout?.gap) {
          if (node.layout.direction === 'horizontal') {
            childRes.yogaNode.setMargin(Yoga.EDGE_LEFT, node.layout.gap);
          } else {
            childRes.yogaNode.setMargin(Yoga.EDGE_TOP, node.layout.gap);
          }
        }

        yNode.insertChild(childRes.yogaNode, index);
      });
    } else if (node.type === 'text') {
      const dimensions = measurer(node);
      yNode.setWidth(dimensions.width);
      yNode.setHeight(dimensions.height);
      if (node.maxWidth) {
        yNode.setMaxWidth(node.maxWidth);
      }
    } else if (node.type === 'shape') {
      yNode.setWidth(node.width ?? 100);
      yNode.setHeight(node.height ?? 100);
    } else if (node.type === 'icon') {
      const size = node.size ?? 20;
      yNode.setWidth(size);
      yNode.setHeight(size);
    }

    return {
      yogaNode: yNode,
      cleanup: () => {
        for (let i = cleanupFns.length - 1; i >= 0; i--) {
          cleanupFns[i]!();
        }
      },
    };
  }

  const rootYogaTree = buildYogaTree(targetNode);

  try {
     rootYogaTree.yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

     function extractResults(node: SceneNode, yNode: YogaNode): LayoutNodeResult {
      const bounds: ComputedBounds = {
        x: yNode.getComputedLeft(),
        y: yNode.getComputedTop(),
        width: yNode.getComputedWidth(),
        height: yNode.getComputedHeight(),
      };

      const childrenResults: LayoutNodeResult[] = [];
      if (node.type === 'frame' || node.type === 'artboard') {
        const children = store.getChildren(node.id);
        children.forEach((child, index) => {
          const childYogaNode = yNode.getChild(index);
          childrenResults.push(extractResults(child, childYogaNode));
        });
      }

      return {
        nodeId: node.id,
        bounds,
        children: childrenResults,
      };
    }

    return extractResults(targetNode, rootYogaTree.yogaNode);
  } finally {
     rootYogaTree.cleanup();
  }
}
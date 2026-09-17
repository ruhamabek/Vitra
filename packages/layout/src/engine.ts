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

const defaultTextMeasurer: TextMeasurer = (node: TextNode) => {
  const charWidth = (node.fontSize ?? 16) * 0.55;
  const width = Math.max(10, Math.round(node.text.length * charWidth));
  const height = Math.round((node.lineHeight ?? (node.fontSize ?? 16) * 1.25));
  return { width, height };
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

   function buildYogaTree(node: SceneNode): { yogaNode: YogaNode; cleanup: () => void } {
    const yNode = Yoga.Node.create();
    const cleanupFns: Array<() => void> = [() => yNode.free()];

    if (node.type === 'frame') {
      if (node.width !== undefined) {
        yNode.setWidth(node.width);
      }
      if (node.height !== undefined) {
        yNode.setHeight(node.height);
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
        const childRes = buildYogaTree(child);
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
      if (node.type === 'frame') {
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
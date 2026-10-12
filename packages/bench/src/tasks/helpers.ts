import type { ISceneStore, SceneNode, SceneSnapshot, TextNode } from '@vitra/core';
import { computeLayout, type LayoutNodeResult } from '@vitra/layout';
import type { CheckOutcome } from '../types.js';

/**
 * Returns every descendant of `rootId` (excluding the root) in depth-first order.
 */
export function descendants(store: ISceneStore, rootId: string): SceneNode[] {
  const out: SceneNode[] = [];
  const visit = (id: string): void => {
    for (const child of store.getChildren(id)) {
      out.push(child);
      visit(child.id);
    }
  };
  visit(rootId);
  return out;
}

/**
 * Returns every text node under `rootId`.
 */
export function textsUnder(store: ISceneStore, rootId: string): TextNode[] {
  return descendants(store, rootId).filter((n): n is TextNode => n.type === 'text');
}

/**
 * Finds the first text node under `rootId` whose content matches `pattern`
 * after trimming. Strings are compared case-insensitively.
 */
export function findText(store: ISceneStore, rootId: string, pattern: string | RegExp): TextNode | undefined {
  return textsUnder(store, rootId).find((t) => {
    const text = t.text.trim();
    return typeof pattern === 'string' ? text.toLowerCase() === pattern.toLowerCase() : pattern.test(text);
  });
}

/**
 * Absolute bounds of a laid-out node relative to the layout root.
 */
export interface AbsoluteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes layout for `rootId` and returns absolute bounds for every node in it.
 */
export async function absoluteBounds(store: ISceneStore, rootId: string): Promise<Map<string, AbsoluteBounds>> {
  const layout = await computeLayout(store, rootId);
  const map = new Map<string, AbsoluteBounds>();
  const visit = (node: LayoutNodeResult, offsetX: number, offsetY: number): void => {
    const x = offsetX + node.bounds.x;
    const y = offsetY + node.bounds.y;
    map.set(node.nodeId, { x, y, width: node.bounds.width, height: node.bounds.height });
    for (const child of node.children) {
      visit(child, x, y);
    }
  };
  visit(layout, -layout.bounds.x, -layout.bounds.y);
  return map;
}

/**
 * Whether `nodeId` lies under `ancestorId` in the scene graph.
 */
export function isDescendantOf(store: ISceneStore, nodeId: string, ancestorId: string): boolean {
  let current = store.getNode(nodeId);
  while (current && current.parentId) {
    if (current.parentId === ancestorId) return true;
    current = store.getNode(current.parentId);
  }
  return false;
}

/**
 * Collects the ids of `rootId` and its descendants from a snapshot.
 */
export function snapshotSubtree(snapshot: SceneSnapshot, rootId: string): Record<string, SceneNode> {
  const out: Record<string, SceneNode> = {};
  const visit = (id: string): void => {
    const node = snapshot.nodes[id];
    if (!node) return;
    out[id] = node;
    if ('childIds' in node && Array.isArray(node.childIds)) {
      for (const child of node.childIds) visit(child);
    }
  };
  visit(rootId);
  return out;
}

/**
 * Shorthand for a passing check outcome.
 */
export function pass(detail: string): CheckOutcome {
  return { passed: true, detail };
}

/**
 * Shorthand for a failing check outcome.
 */
export function fail(detail: string): CheckOutcome {
  return { passed: false, detail };
}

import { ISceneStore, SceneNode, FrameNode, TextNode, ShapeNode } from '@vitra/core';
import { CodegenOptions, CodegenResult } from './types.js';
import { mapFrameToTailwind, mapTextToTailwind, mapShapeToTailwind } from './tailwind-mapper.js';

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function escapeJsxText(text: string): string {
  return text.replace(/[{}]/g, (m) => `{'${m}'}`);
}

export function generateReactTailwind(
  store: ISceneStore,
  targetNodeId: string,
  options?: CodegenOptions
): CodegenResult {
  const rootNode = store.getNode(targetNodeId);
  if (!rootNode) {
    throw new Error(`Target node "${targetNodeId}" not found in store.`);
  }

  const tokensUsed = new Set<string>();

  function collectTokens(node: SceneNode) {
    if ('fill' in node && typeof node.fill === 'string' && node.fill.startsWith('$')) {
      tokensUsed.add(node.fill);
    }
    if ('stroke' in node && typeof node.stroke === 'string' && node.stroke.startsWith('$')) {
      tokensUsed.add(node.stroke);
    }
    if (node.type === 'frame' || node.type === 'artboard') {
      for (const childId of node.childIds) {
        const child = store.getNode(childId);
        if (child) collectTokens(child);
      }
    }
  }

  collectTokens(rootNode);

  function renderNode(node: SceneNode, depth: number): string {
    const indent = '  '.repeat(depth);

    if (node.type === 'frame' || node.type === 'artboard') {
      const frame = node as FrameNode;
      const classes = mapFrameToTailwind(frame).join(' ');
      const children = store.getChildren(frame.id);

      if (children.length === 0) {
        return `${indent}<div className="${classes}" />`;
      }

      const renderedChildren = children.map((c) => renderNode(c, depth + 1)).join('\n');
      return `${indent}<div className="${classes}">\n${renderedChildren}\n${indent}</div>`;
    }

    if (node.type === 'text') {
      const textNode = node as TextNode;
      const classes = mapTextToTailwind(textNode).join(' ');
      const escaped = escapeJsxText(textNode.text);
      return `${indent}<span className="${classes}">${escaped}</span>`;
    }

    if (node.type === 'shape') {
      const shapeNode = node as ShapeNode;
      const classes = mapShapeToTailwind(shapeNode).join(' ');
      return `${indent}<div className="${classes}" />`;
    }

    if (node.type === 'icon') {
      const iconNode = node as import('@vitra/core').IconNode;
      const iconName = toPascalCase(iconNode.icon);
      return `${indent}<Lucide.${iconName}Icon size={${iconNode.size}} color="${iconNode.color}" />`;
    }

    return '';
  }

  const rawJsx = renderNode(rootNode, 2);
  const componentName = options?.componentName
    ? toPascalCase(options.componentName)
    : toPascalCase(rootNode.name || rootNode.id || 'DesignComponent');

  const includeWrapper = options?.includeWrapper ?? true;

  let code: string;
  if (includeWrapper) {
    code = `import React from 'react';

export function ${componentName}() {
  return (
${rawJsx}
  );
}
`;
  } else {
    code = rawJsx.trim();
  }

  return {
    target: 'react-tailwind',
    code,
    componentName,
    tokensUsed: Array.from(tokensUsed),
  };
}

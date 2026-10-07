import { ISceneStore, SceneNode, FrameNode, TextNode, ShapeNode } from '@vitra/core';
import { CodegenOptions, CodegenResult } from './types.js';

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function hexToSwiftUIColor(hex: string): string {
  if (hex.startsWith('#')) {
    const clean = hex.slice(1);
    if (clean.length === 6) {
      const r = (parseInt(clean.slice(0, 2), 16) / 255).toFixed(2);
      const g = (parseInt(clean.slice(2, 4), 16) / 255).toFixed(2);
      const b = (parseInt(clean.slice(4, 6), 16) / 255).toFixed(2);
      return `Color(red: ${r}, green: ${g}, blue: ${b})`;
    }
  }
  if (hex === 'transparent') {
    return 'Color.clear';
  }
  return `Color("${hex}")`;
}

function swiftUIFont(fontSize?: number, fontWeight?: number): string {
  const size = fontSize ?? 16;
  let weight = '.regular';
  if (fontWeight) {
    if (fontWeight >= 800) weight = '.black';
    else if (fontWeight >= 700) weight = '.bold';
    else if (fontWeight >= 600) weight = '.semibold';
    else if (fontWeight >= 500) weight = '.medium';
    else if (fontWeight <= 300) weight = '.light';
  }
  return `.system(size: ${size}, weight: ${weight})`;
}

export function generateSwiftUI(
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
    const indent = '    '.repeat(depth);

    if (node.type === 'frame' || node.type === 'artboard') {
      const frame = node as FrameNode;
      const children = store.getChildren(frame.id);
      const isHorizontal = frame.layout?.direction === 'horizontal';
      const stackType = isHorizontal ? 'HStack' : 'VStack';
      const gap = frame.layout?.gap ? `spacing: ${frame.layout.gap}` : '';

      const renderedChildren = children.map((c) => renderNode(c, depth + 1)).join('\n');

      let code = `${indent}${stackType}(${gap}) {\n${renderedChildren}\n${indent}}`;

       const p = frame.layout?.padding;
      if (p) {
        code += `\n${indent}    .padding(EdgeInsets(top: ${p.top ?? 0}, leading: ${p.left ?? 0}, bottom: ${p.bottom ?? 0}, trailing: ${p.right ?? 0}))`;
      }

       if (frame.width !== undefined && frame.height !== undefined) {
        code += `\n${indent}    .frame(width: ${frame.width}, height: ${frame.height})`;
      } else if (frame.width !== undefined) {
        code += `\n${indent}    .frame(width: ${frame.width})`;
      } else if (frame.height !== undefined) {
        code += `\n${indent}    .frame(height: ${frame.height})`;
      }

       if (frame.fill && frame.fill !== 'transparent') {
        code += `\n${indent}    .background(${hexToSwiftUIColor(frame.fill)})`;
      }

      if (frame.cornerRadius) {
        code += `\n${indent}    .cornerRadius(${frame.cornerRadius})`;
      }

       if (frame.stroke) {
        code += `\n${indent}    .overlay(\n${indent}        RoundedRectangle(cornerRadius: ${frame.cornerRadius ?? 0})\n${indent}            .stroke(${hexToSwiftUIColor(frame.stroke)}, lineWidth: ${frame.strokeWidth ?? 1})\n${indent}    )`;
      }

      return code;
    }

    if (node.type === 'text') {
      const textNode = node as TextNode;
      const fontModifier = swiftUIFont(textNode.fontSize, textNode.fontWeight);
      const colorModifier = textNode.fill ? `\n${indent}    .foregroundColor(${hexToSwiftUIColor(textNode.fill)})` : '';
      return `${indent}Text("${textNode.text}")\n${indent}    .font(${fontModifier})${colorModifier}`;
    }

    if (node.type === 'shape') {
      const shapeNode = node as ShapeNode;
      const isEllipse = shapeNode.shapeType === 'ellipse';
      const shapeType = isEllipse ? 'Circle()' : `RoundedRectangle(cornerRadius: ${shapeNode.cornerRadius ?? 0})`;
      let code = `${indent}${shapeType}`;

      if (shapeNode.fill) {
        code += `\n${indent}    .fill(${hexToSwiftUIColor(shapeNode.fill)})`;
      }

      if (shapeNode.width !== undefined && shapeNode.height !== undefined) {
        code += `\n${indent}    .frame(width: ${shapeNode.width}, height: ${shapeNode.height})`;
      }

      return code;
    }

    return '';
  }

  const rawSwift = renderNode(rootNode, 2);
  const componentName = options?.componentName
    ? toPascalCase(options.componentName)
    : toPascalCase(rootNode.name || rootNode.id || 'DesignView');

  const includeWrapper = options?.includeWrapper ?? true;

  let code: string;
  if (includeWrapper) {
    code = `import SwiftUI

struct ${componentName}: View {
    var body: some View {
${rawSwift}
    }
}
`;
  } else {
    code = rawSwift.trim();
  }

  return {
    target: 'swiftui',
    code,
    componentName,
    tokensUsed: Array.from(tokensUsed),
  };
}

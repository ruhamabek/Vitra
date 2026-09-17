import { ISceneStore, SceneNode } from '@vitra/core';
import { LayoutNodeResult } from '@vitra/layout';
import { Resvg } from '@resvg/resvg-js';

export interface RenderPngOptions {
  scale?: number;
}

export function renderToSvg(
  store: ISceneStore,
  targetNodeId: string,
  layout: LayoutNodeResult
): string {
  const targetNode = store.getNode(targetNodeId);
  if (!targetNode) {
    throw new Error(`Target node "${targetNodeId}" not found in store.`);
  }

  const { width, height } = layout.bounds;

   function renderElement(node: SceneNode, nodeLayout: LayoutNodeResult): string {
    const { x, y, width: w, height: h } = nodeLayout.bounds;

    if (node.type === 'frame') {
      const fillAttr = node.fill ? `fill="${node.fill}"` : 'fill="none"';
      const rxAttr = node.cornerRadius ? `rx="${node.cornerRadius}" ry="${node.cornerRadius}"` : '';
      
      const children = store.getChildren(node.id);
      const renderedChildren = children
        .map(child => {
          const childLayout = nodeLayout.children.find(c => c.nodeId === child.id);
          if (!childLayout) return '';
          return renderElement(child, childLayout);
        })
        .join('\n');

      return `
        <g transform="translate(${x}, ${y})">
          <rect width="${w}" height="${h}" ${fillAttr} ${rxAttr} />
          ${renderedChildren}
        </g>
      `;
    }

    if (node.type === 'text') {
      const textBaselineY = (node.fontSize ?? 16) * 0.85;
      const fill = node.fill ?? '#000000';
      const fontSize = node.fontSize ?? 16;
      const fontWeight = node.fontWeight ?? 400;

       const escapedText = node.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `
        <g transform="translate(${x}, ${y})">
          <text
            x="0"
            y="${textBaselineY}"
            fill="${fill}"
            font-size="${fontSize}"
            font-weight="${fontWeight}"
            font-family="system-ui, -apple-system, sans-serif"
          >${escapedText}</text>
        </g>
      `;
    }

    return '';
  }

  const content = renderElement(targetNode, {
    ...layout,
    bounds: { ...layout.bounds, x: 0, y: 0 }, // Root renders at (0, 0) in SVG viewport
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${content}
</svg>`;
}

export async function renderToPng(
  svg: string,
  options?: RenderPngOptions
): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    fitTo: options?.scale ? { mode: 'zoom', value: options.scale } : { mode: 'original' },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
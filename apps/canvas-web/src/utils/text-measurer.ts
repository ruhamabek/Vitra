import { TextNode } from '@vitra/core';

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

export function measureBrowserText(node: TextNode): { width: number; height: number } {
  const text = typeof node?.text === 'string' ? node.text : '';
  const weight = node.fontWeight ?? 400;
  const size = node.fontSize ?? 16;
  const baseLineHeight = Math.round(node.lineHeight ?? size * 1.35);

  let rawWidth = Math.max(10, text.length * 9);

  if (typeof document !== 'undefined') {
    if (!measureCanvas) {
      measureCanvas = document.createElement('canvas');
      measureCtx = measureCanvas.getContext('2d');
    }
    if (measureCtx) {
      measureCtx.font = `${weight} ${size}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const metrics = measureCtx.measureText(text);
      rawWidth = Math.ceil(metrics.width);
    }
  }

  if (node.wrap && node.maxWidth && node.maxWidth > 0 && rawWidth > node.maxWidth) {
    const lineCount = Math.max(1, Math.ceil(rawWidth / node.maxWidth));
    return {
      width: node.maxWidth,
      height: lineCount * baseLineHeight,
    };
  }

  return {
    width: rawWidth,
    height: baseLineHeight,
  };
}

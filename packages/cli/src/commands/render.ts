import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadVitraProject } from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '@vitra/renderer';
import { TokenRegistry } from '@vitra/tokens';

export interface RenderCliOptions {
  node?: string;
  out?: string;
  format?: 'png' | 'svg';
  scale?: number;
  theme?: string;
}

export interface RenderResult {
  nodeId: string;
  outFile: string;
  format: 'png' | 'svg';
  width: number;
  height: number;
  byteSize: number;
}

export async function runRenderCommand(
  targetDir: string,
  options: RenderCliOptions = {}
): Promise<RenderResult> {
  const resolvedDir = path.resolve(process.cwd(), targetDir);
  const project = await loadVitraProject(resolvedDir);

  let nodeId = options.node;
  if (!nodeId) {
    const root = project.store.getRoot();
    if (root.childIds && root.childIds.length > 0) {
      nodeId = root.childIds[0];
    } else {
      nodeId = root.id;
    }
  }

  if (!nodeId) {
    throw new Error('No valid nodes found to render in project canvas.');
  }

  const format = options.format || (options.out?.endsWith('.svg') ? 'svg' : 'png');
  const outFile = options.out || path.join(resolvedDir, `${nodeId}.${format}`);
  const resolvedOut = path.resolve(process.cwd(), outFile);

  const registry = new TokenRegistry();
  const tokenCandidatePaths = [
    path.join(resolvedDir, 'tokens.json'),
    path.join(resolvedDir, 'tokens', 'tokens.json'),
  ];
  for (const tPath of tokenCandidatePaths) {
    if (fs.existsSync(tPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(tPath, 'utf-8'));
        if (data.tokens) registry.registerTokens(data.tokens);
        else registry.registerTokens(data);
        if (data.themes && typeof data.themes === 'object') {
          for (const [theme, t] of Object.entries(data.themes)) {
            registry.registerTheme(theme, t as any);
          }
        }
      } catch {}
      break;
    }
  }

  if (options.theme) {
    registry.setTheme(options.theme);
  }

  const layout = await computeLayout(project.store, nodeId);
  const svg = renderToSvg(project.store, nodeId, layout, { tokenRegistry: registry });

  let byteSize = 0;
  if (format === 'svg') {
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, svg, 'utf-8');
    byteSize = Buffer.byteLength(svg, 'utf-8');
  } else {
    const pngBuffer = await renderToPng(svg, { scale: options.scale || 1 });
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, pngBuffer);
    byteSize = pngBuffer.length;
  }

  return {
    nodeId,
    outFile: resolvedOut,
    format,
    width: Math.round(layout.bounds.width),
    height: Math.round(layout.bounds.height),
    byteSize,
  };
}

export function formatRenderSummary(result: RenderResult): string {
  const sizeKb = (result.byteSize / 1024).toFixed(1);
  return [
    `  Rendered node "${result.nodeId}" to ${result.format.toUpperCase()}`,
    `   Dimensions: ${result.width}x${result.height}px`,
    `   Output File: ${result.outFile} (${sizeKb} KB)`,
  ].join('\n');
}

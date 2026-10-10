import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { loadVitraProject } from '@vitra/core';
import { exportCode } from '@vitra/codegen';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '@vitra/renderer';

export interface ExportOptions {
  target: 'react' | 'swiftui' | 'html' | 'svg' | 'png';
  outDir: string;
  artboardId?: string;
}

export async function exportProject(targetDir: string, options: ExportOptions): Promise<string[]> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const outPath = path.resolve(process.cwd(), options.outDir);
  await fs.mkdir(outPath, { recursive: true });

  const project = await loadVitraProject(dirPath);
  const root = project.store.getRoot();
  const rootChildren = project.store.getChildren(root.id);
  const artboards = rootChildren.filter((n) => n.type === 'artboard');

  const targets = options.artboardId
    ? artboards.filter((ab) => ab.id === options.artboardId)
    : artboards.length > 0
    ? artboards
    : [root];

  const generatedFiles: string[] = [];

  for (const target of targets) {
    const safeName = (target.name ?? target.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (options.target === 'react' || options.target === 'html') {
      const codegenTarget = options.target === 'html' ? 'html-tailwind' : 'react-tailwind';
      const result = exportCode(project.store, target.id, {
        target: codegenTarget,
        componentName: safeName,
      });

      const ext = options.target === 'html' ? 'html' : 'tsx';
      const filePath = path.join(outPath, `${safeName}.${ext}`);
      await fs.writeFile(filePath, result.code, 'utf-8');
      generatedFiles.push(filePath);
    } else if (options.target === 'swiftui') {
      const result = exportCode(project.store, target.id, {
        target: 'swiftui',
        componentName: safeName,
      });

      const filePath = path.join(outPath, `${safeName}.swift`);
      await fs.writeFile(filePath, result.code, 'utf-8');
      generatedFiles.push(filePath);
    } else if (options.target === 'svg' || options.target === 'png') {
      const layout = await computeLayout(project.store, target.id);
      const svg = renderToSvg(project.store, target.id, layout);

      if (options.target === 'svg') {
        const filePath = path.join(outPath, `${safeName}.svg`);
        await fs.writeFile(filePath, svg, 'utf-8');
        generatedFiles.push(filePath);
      } else {
        const pngBuf = await renderToPng({
          store: project.store,
          targetNodeId: target.id,
          layout,
          tokenRegistry: project.tokens as any,
        });
        const filePath = path.join(outPath, `${safeName}.png`);
        await fs.writeFile(filePath, pngBuf);
        generatedFiles.push(filePath);
      }
    }
  }

  return generatedFiles;
}

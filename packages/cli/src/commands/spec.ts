import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadVitraProject, exportToDesignMarkdown } from '@vitra/core';

export interface SpecCliOptions {
  out?: string;
  node?: string;
}

export interface SpecResult {
  markdown: string;
  targetNodeId: string;
  outFile?: string;
}

export async function runSpecCommand(
  targetDir: string,
  options: SpecCliOptions = {}
): Promise<SpecResult> {
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
    throw new Error('No valid nodes found in project canvas.');
  }

  const markdown = exportToDesignMarkdown(project.store, nodeId);

  if (options.out) {
    const resolvedOut = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, markdown, 'utf-8');
    return { markdown, targetNodeId: nodeId, outFile: resolvedOut };
  }

  return { markdown, targetNodeId: nodeId };
}

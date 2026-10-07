import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadVitraProject,
  saveVitraProject,
  insertDeclarativeTree,
  instantiateNode,
  parseDesignMarkdown,
  DeclarativeNode,
} from '@vitra/core';

export { insertDeclarativeTree, instantiateNode };

export interface ApplyCliOptions {
  parent?: string;
  index?: number;
}

export interface ApplyResult {
  projectName: string;
  appliedCount: number;
  rootNodeId: string;
  parentTargetId: string;
}

/**
 * Ingests and applies a declarative component JSON or design.md tree into a .vitra project.
 */
export async function applyComponentToProject(
  targetDir: string,
  filePath: string,
  options: ApplyCliOptions = {}
): Promise<ApplyResult> {
  const resolvedDir = path.resolve(process.cwd(), targetDir);
  const resolvedPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Component file not found at: ${resolvedPath}`);
  }

  const project = await loadVitraProject(resolvedDir);
  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const isMarkdown = resolvedPath.endsWith('.md') || content.trim().startsWith('#') || content.trim().startsWith('-');
  const parsed = isMarkdown ? parseDesignMarkdown(content) : JSON.parse(content);

   let parentId = options.parent;
  if (!parentId) {
    const root = project.store.getRoot();
    if (root.childIds && root.childIds.length > 0) {
      parentId = root.childIds[0]; // first artboard
    } else {
      parentId = root.id;
    }
  }

  if (!parentId) {
    throw new Error('Could not find a valid parent node to insert component into.');
  }

  let totalInserted = 0;
  let rootNodeId = '';

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const res = insertDeclarativeTree(project.store, item, parentId);
      totalInserted += res.totalInserted;
      if (!rootNodeId) rootNodeId = res.rootId;
    }
  } else if (parsed.nodes && typeof parsed.nodes === 'object') {
     const nodes = parsed.nodes as Record<string, DeclarativeNode>;
    for (const [id, raw] of Object.entries(nodes)) {
      const targetParent = raw.parentId || parentId;
      const node = instantiateNode({ ...raw, id });
      project.store.insertNode(node, targetParent);
      totalInserted++;
      if (!rootNodeId) rootNodeId = id;
    }
  } else {
     const res = insertDeclarativeTree(project.store, parsed, parentId, options.index);
    totalInserted = res.totalInserted;
    rootNodeId = res.rootId;
  }

   await saveVitraProject(resolvedDir, { store: project.store, manifest: project.manifest });

  return {
    projectName: project.manifest.name,
    appliedCount: totalInserted,
    rootNodeId,
    parentTargetId: parentId,
  };
}

export function formatApplySummary(result: ApplyResult): string {
  return [
    `✨ Successfully applied declarative component to "${result.projectName}"`,
    `   Inserted: ${result.appliedCount} node(s)`,
    `   Component Root: "${result.rootNodeId}"`,
    `   Parent Container: "${result.parentTargetId}"`,
  ].join('\n');
}

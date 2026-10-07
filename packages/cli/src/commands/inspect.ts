import * as path from 'node:path';
import { loadVitraProject, SceneNode, ArtboardNode } from '@vitra/core';

export interface ProjectInspection {
  name: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  defaultTheme: string;
  artboards: Array<{
    id: string;
    name: string;
    preset?: string;
    width: number;
    height: number;
    childCount: number;
  }>;
  totalNodeCount: number;
  tokenCategories: string[];
  totalCommits: number;
  latestCommit?: {
    id: string;
    intent: string;
    author: string;
    timestamp: string;
  };
}

export async function inspectProject(targetDir: string): Promise<ProjectInspection> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const project = await loadVitraProject(dirPath);

  const root = project.store.getRoot();
  const rootChildren = project.store.getChildren(root.id);
  const artboards = rootChildren.filter((n): n is ArtboardNode => n.type === 'artboard');

  let totalNodeCount = 0;
  function count(node: SceneNode) {
    totalNodeCount++;
    const children = project.store.getChildren(node.id);
    for (const c of children) {
      count(c);
    }
  }
  count(root);

  const artboardDetails = artboards.map((ab) => ({
    id: ab.id,
    name: ab.name,
    preset: ab.preset,
    width: ab.width,
    height: ab.height,
    childCount: project.store.getChildren(ab.id).length,
  }));

  const tokenCategories = project.tokens ? Object.keys(project.tokens) : [];
  const latestCommit = project.history.length > 0 ? project.history[project.history.length - 1] : undefined;

  return {
    name: project.manifest.name,
    schemaVersion: project.manifest.schemaVersion,
    createdAt: project.manifest.createdAt,
    updatedAt: project.manifest.updatedAt,
    defaultTheme: project.manifest.defaultTheme,
    artboards: artboardDetails,
    totalNodeCount,
    tokenCategories,
    totalCommits: project.history.length,
    latestCommit: latestCommit
      ? {
          id: latestCommit.id,
          intent: latestCommit.intent,
          author: latestCommit.author.name ?? latestCommit.author.model ?? latestCommit.author.type,
          timestamp: latestCommit.timestamp,
        }
      : undefined,
  };
}

export function formatInspection(inspection: ProjectInspection): string {
  const lines: string[] = [];
  lines.push(`========================================================`);
  lines.push(`  VITRA PROJECT: ${inspection.name}`);
  lines.push(`========================================================`);
  lines.push(`  Schema Version: ${inspection.schemaVersion}`);
  lines.push(`  Default Theme:  ${inspection.defaultTheme}`);
  lines.push(`  Updated:        ${inspection.updatedAt}`);
  lines.push(`  Total Layers:   ${inspection.totalNodeCount} nodes`);
  lines.push(`  Tokens:         ${inspection.tokenCategories.join(', ') || 'none'}`);
  lines.push(`--------------------------------------------------------`);
  lines.push(`  Artboards (${inspection.artboards.length}):`);
  for (const ab of inspection.artboards) {
    lines.push(`    • [${ab.preset ?? 'custom'}] ${ab.name} (${ab.width}x${ab.height}) - ${ab.childCount} direct children`);
  }
  lines.push(`--------------------------------------------------------`);
  lines.push(`  History (${inspection.totalCommits} commits):`);
  if (inspection.latestCommit) {
    lines.push(`    HEAD: ${inspection.latestCommit.id} by ${inspection.latestCommit.author}`);
    lines.push(`    Intent: "${inspection.latestCommit.intent}" (${inspection.latestCommit.timestamp})`);
  } else {
    lines.push(`    No commits recorded yet.`);
  }
  lines.push(`========================================================`);
  return lines.join('\n');
}

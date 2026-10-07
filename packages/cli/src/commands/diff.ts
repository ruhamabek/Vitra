import * as path from 'node:path';
import {
  loadVitraProject,
  computeSceneDiff,
  formatSceneDiff,
  diffProjectCommits,
  SceneDiff,
  IntraDiffOptions,
  DiffResult,
} from '@vitra/core';

export async function diffProjects(dirPathA: string, dirPathB: string): Promise<SceneDiff> {
  const pathA = path.resolve(process.cwd(), dirPathA);
  const pathB = path.resolve(process.cwd(), dirPathB);

  const projA = await loadVitraProject(pathA);
  const projB = await loadVitraProject(pathB);

  return computeSceneDiff(projA.store, projB.store);
}

export { formatSceneDiff, diffProjectCommits };
export type { IntraDiffOptions, DiffResult };



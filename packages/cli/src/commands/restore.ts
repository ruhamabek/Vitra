import * as path from 'node:path';
import { restoreWorkingCanvas, removeFromIndex } from '@vitra/core';

export async function restoreProject(
  targetDir: string,
  targets: string[],
  options: { staged?: boolean } = {}
): Promise<void> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const normalizedTargets = targets.length === 0 ? ['.'] : targets;
  await restoreWorkingCanvas(dirPath, normalizedTargets, options);
}

export async function resetProject(
  targetDir: string,
  targets: string[]
): Promise<void> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const normalizedTargets = targets.length === 0 ? ['.'] : targets;
  await removeFromIndex(dirPath, normalizedTargets);
}

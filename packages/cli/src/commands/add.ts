import * as path from 'node:path';
import { addToIndex } from '@vitra/core';

export async function addProject(targetDir: string, targets: string[]): Promise<void> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const normalizedTargets = targets.length === 0 ? ['.'] : targets;
  await addToIndex(dirPath, normalizedTargets);
}

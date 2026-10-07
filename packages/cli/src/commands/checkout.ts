import * as path from 'node:path';
import {
  checkoutRef,
  createBranch,
  CheckoutResult,
} from '@vitra/core';

export interface CheckoutOptions {
  target: string;
  createBranch?: boolean;
}

export async function checkoutProject(
  targetDir: string,
  options: CheckoutOptions
): Promise<CheckoutResult> {
  const dirPath = path.resolve(process.cwd(), targetDir);

  if (!options.target) {
    throw new Error('Target branch name or commit ID is required for checkout.');
  }

  if (options.createBranch) {
     await createBranch(dirPath, options.target);
  }

  return checkoutRef(dirPath, options.target);
}

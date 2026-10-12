import type { BenchTask } from '../types.js';
import type { ScriptedCall } from '../agents/scripted.js';
import { pricingCardSolution, pricingCardTask } from './pricing-card.js';
import { responsiveMobileSolution, responsiveMobileTask } from './responsive-mobile.js';
import { tokenizeColorsSolution, tokenizeColorsTask } from './tokenize-colors.js';

export { pricingCardTask, responsiveMobileTask, tokenizeColorsTask };
export * from './helpers.js';

/**
 * The built-in VitraBench task suite, in run order.
 */
export const BUILTIN_TASKS: readonly BenchTask[] = [pricingCardTask, responsiveMobileTask, tokenizeColorsTask];

/**
 * Reference tool-call scripts for each built-in task, keyed by task id. Used
 * by the oracle agent to validate that every task is solvable at full score.
 */
export const REFERENCE_SOLUTIONS: Readonly<Record<string, ScriptedCall[]>> = {
  [pricingCardTask.id]: pricingCardSolution,
  [responsiveMobileTask.id]: responsiveMobileSolution,
  [tokenizeColorsTask.id]: tokenizeColorsSolution,
};

/**
 * Resolves task ids to built-in tasks.
 *
 * @throws Error naming the unknown id and the available ids.
 */
export function selectTasks(ids?: string[]): BenchTask[] {
  if (!ids || ids.length === 0) return [...BUILTIN_TASKS];
  return ids.map((id) => {
    const task = BUILTIN_TASKS.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Unknown bench task "${id}". Available tasks: ${BUILTIN_TASKS.map((t) => t.id).join(', ')}.`);
    }
    return task;
  });
}

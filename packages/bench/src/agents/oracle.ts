import { REFERENCE_SOLUTIONS } from '../tasks/index.js';
import { ScriptedAgent } from './scripted.js';

/**
 * Creates the oracle agent, which replays each built-in task's reference
 * solution. Its scores are the ceiling the harness can award and serve as a
 * self-test that every task is solvable.
 */
export function createOracleAgent(): ScriptedAgent {
  return new ScriptedAgent('oracle', REFERENCE_SOLUTIONS);
}

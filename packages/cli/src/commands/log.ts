import * as path from 'node:path';
import { loadVitraProject, AgentCommit } from '@vitra/core';

export async function getProjectLog(targetDir: string): Promise<AgentCommit[]> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const project = await loadVitraProject(dirPath);
  return project.history;
}

export function formatLog(history: AgentCommit[]): string {
  if (history.length === 0) {
    return 'No commits found in this Vitra project.';
  }

  const lines: string[] = [];
   const reversed = [...history].reverse();

  for (let i = 0; i < reversed.length; i++) {
    const c = reversed[i];
    if (!c) continue;
    const isHead = i === 0;
    lines.push(`commit ${c.id}${isHead ? ' (HEAD)' : ''}${c.parentId ? ` -> parent ${c.parentId}` : ''}`);
    const authorStr = c.author.name
      ? `${c.author.name}${c.author.model ? ` [${c.author.model}]` : ` <${c.author.type}>`}`
      : `[${c.author.type.toUpperCase()}] ${c.author.model ?? 'agent'}`;
    lines.push(`Author:    ${authorStr}`);
    lines.push(`Date:      ${c.timestamp}`);
    lines.push(``);
    lines.push(`    Intent: ${c.intent}`);
    if (c.rationale) {
      lines.push(`    Rationale: ${c.rationale}`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}

import * as path from 'node:path';
import { startStdioMcpServer } from '@vitra/mcp-server';

export async function runMcpCommand(targetDir?: string): Promise<void> {
  const projectPath = targetDir ? path.resolve(process.cwd(), targetDir) : undefined;
  await startStdioMcpServer(projectPath);
}

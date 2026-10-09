import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function runMcpCommand(targetDir?: string): Promise<void> {
  if (targetDir) {
    process.env.VITRA_PROJECT_PATH = path.resolve(process.cwd(), targetDir);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(__dirname, '../../mcp-server/dist/cli.js'),
    path.resolve(__dirname, '../../../mcp-server/dist/cli.js'),
    path.resolve(__dirname, '../mcp-server/dist/cli.js'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      await import(pathToFileURL(candidate).href);
      return;
    }
  }

  console.error('Error: Could not locate @vitra/mcp-server runtime.');
  process.exit(1);
}

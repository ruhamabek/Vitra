import { startStdioMcpServer } from './server.js';
startStdioMcpServer().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error('Fatal Vitra MCP Server error:', message);
  process.exit(1);
});
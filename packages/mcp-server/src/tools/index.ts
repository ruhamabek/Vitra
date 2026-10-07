import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpToolContext } from './context.js';
import { registerCanvasTools } from './canvas.js';
import { registerPrimitiveTools } from './primitives.js';
import { registerTokenTools } from './tokens.js';
import { registerAuditTools } from './audit.js';
import { registerCodeTools } from './code.js';
import { registerProjectTools } from './project.js';

export * from './context.js';

export function registerAllTools(server: McpServer, ctx: McpToolContext): void {
  registerCanvasTools(server, ctx);
  registerPrimitiveTools(server, ctx);
  registerTokenTools(server, ctx);
  registerAuditTools(server, ctx);
  registerCodeTools(server, ctx);
  registerProjectTools(server, ctx);
}

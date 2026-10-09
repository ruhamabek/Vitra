import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { auditDesign } from '@vitra/eval';
import { McpToolContext } from './context.js';

export function registerAuditTools(server: McpServer, ctx: McpToolContext): void {
  const { store, tokenRegistry } = ctx;

  server.registerTool(
    'audit_design',
    {
      description: 'Audits a component or frame for visual defects, layout overflows, clipping, and WCAG accessibility contrast compliance. Returns detected issues with actionable remediation recommendations.',
      inputSchema: {
        nodeId: z.string().optional().describe('The frame or root node id to audit (defaults to root)'),
        strictWcagAAA: z.boolean().optional().describe('Whether to require strict WCAG AAA contrast (default false)'),
      },
    },
    async (args) => {
      try {
        const root = store.getRoot();
        const targetNodeId: string = (args.nodeId) || (root.childIds && root.childIds.length > 0 && root.childIds[0]) || root.id;
        const result = await auditDesign(store, targetNodeId, {
          tokenRegistry,
          strictWcagAAA: args.strictWcagAAA,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    }
  );
}

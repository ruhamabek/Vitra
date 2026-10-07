import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { exportCode } from '@vitra/codegen';
import { McpToolContext } from './context.js';

export function registerCodeTools(server: McpServer, ctx: McpToolContext): void {
  const { store, syncServer } = ctx;

  server.registerTool(
    'export_code',
    {
      description: 'Exports any frame or component in the scene into production-ready React + Tailwind CSS or SwiftUI code.',
      inputSchema: {
        nodeId: z.string().describe('The root frame or node id to export'),
        target: z.enum(['react-tailwind', 'html-tailwind', 'swiftui']).optional().describe('Target export format (default: react-tailwind)'),
        componentName: z.string().optional().describe('Optional custom component name (e.g. MyCard)'),
        includeWrapper: z.boolean().optional().describe('Whether to include component function wrapper and imports (default: true)'),
      },
    },
    async (args) => {
      try {
        const result = exportCode(store, args.nodeId, {
          target: args.target,
          componentName: args.componentName,
          includeWrapper: args.includeWrapper,
        });

        const tokenNote = result.tokensUsed.length > 0
          ? `\nDesign tokens used: ${result.tokensUsed.join(', ')}`
          : '';

        return {
          content: [
            {
              type: 'text',
              text: `Successfully exported "${result.componentName}" to ${result.target}:${tokenNote}\n\n\`\`\`${result.target === 'swiftui' ? 'swift' : 'tsx'}\n${result.code}\n\`\`\``,
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

  server.registerTool(
    'get_user_edits',
    {
      description: 'Queries recent human mutations made on the live canvas (e.g. text changes, color tweaks, padding adjustments).',
      inputSchema: {
        limit: z.number().optional().describe('Maximum number of edits to return (default: 10)'),
      },
    },
    async (args) => {
      try {
        const edits = syncServer ? syncServer.getUserEdits() : [];
        const limit = args.limit ?? 10;
        const recent = edits.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalEdits: edits.length,
                  recentEdits: recent.map((r) => ({
                    id: r.id,
                    nodeId: r.nodeId,
                    eventType: r.eventType,
                    details: r.details,
                    timestamp: new Date(r.timestamp).toISOString(),
                  })),
                },
                null,
                2
              ),
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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TokenTree } from '@vitra/tokens';
import { McpToolContext } from './context.js';

export function registerTokenTools(server: McpServer, ctx: McpToolContext): void {
  const { tokenRegistry } = ctx;

  server.registerTool(
    'register_tokens',
    {
      description: 'Registers design tokens (colors, typography, spacing, radii) or a theme override.',
      inputSchema: {
        tokens: z.record(z.unknown()).describe('The token tree in W3C format'),
        theme: z.string().optional().describe('Optional theme name to register for (e.g. "light", "dark")'),
      },
    },
    async (args) => {
      try {
        if (args.theme) {
          tokenRegistry.registerTheme(args.theme, args.tokens as TokenTree);
        } else {
          tokenRegistry.registerTokens(args.tokens as TokenTree);
        }
        return {
          content: [
            {
              type: 'text',
              text: `Tokens registered successfully${args.theme ? ` for theme "${args.theme}"` : ''}.`,
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
    'set_theme',
    {
      description: 'Switches the active theme (e.g. "dark", "light", or null for default).',
      inputSchema: {
        theme: z.string().nullable().describe('Theme name to activate, or null to reset'),
      },
    },
    async (args) => {
      try {
        tokenRegistry.setTheme(args.theme);
        return {
          content: [
            {
              type: 'text',
              text: `Active theme set to "${args.theme ?? 'default'}".`,
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

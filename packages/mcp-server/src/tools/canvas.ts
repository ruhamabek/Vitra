import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createArtboardNode, ArtboardNode } from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '@vitra/renderer';
import { auditDesign } from '@vitra/eval';
import { McpToolContext } from './context.js';

export function registerCanvasTools(server: McpServer, ctx: McpToolContext): void {
  const { store, tokenRegistry } = ctx;

  server.registerTool(
    'spawn_artboard',
    {
      description:
        'Spawns a responsive viewport or state artboard on the infinite canvas (e.g. Desktop 1440px, Mobile 375px, Tablet 768px, or custom state variations like "Empty State" or "Dark Mode"). Places artboards side-by-side automatically.',
      inputSchema: {
        id: z.string().describe('Unique artboard identifier, e.g. "board-desktop" or "board-mobile"'),
        name: z.string().optional().describe('Artboard name'),
        preset: z
          .enum(['desktop', 'mobile', 'tablet', 'custom'])
          .optional()
          .describe('Viewport preset (desktop: 1440x900, mobile: 375x812, tablet: 768x1024)'),
        stateLabel: z.string().optional().describe('State description, e.g. "Mobile (375px)" or "Hover State"'),
        width: z.number().optional(),
        height: z.number().optional(),
        x: z
          .number()
          .optional()
          .describe('Custom X coordinate on canvas. If omitted, automatically places to the right of existing artboards with an 80px gap.'),
        y: z.number().optional().describe('Custom Y coordinate on canvas (default: 0)'),
        fill: z.string().optional().describe('Background color, e.g. #0F111A'),
      },
    },
    async (args) => {
      try {
        const root = store.getRoot();
        let targetX = args.x;

        if (typeof targetX !== 'number') {
          const rootChildren = store.getChildren(root.id);
          const existingArtboards = rootChildren.filter((n) => n.type === 'artboard') as ArtboardNode[];
          targetX = existingArtboards.reduce((maxX, b) => {
            const rightEdge = (b.x ?? 0) + (b.width ?? 1440) + 80;
            return Math.max(maxX, rightEdge);
          }, 0);
        }

        const artboard = createArtboardNode({
          id: args.id,
          name: args.name,
          preset: args.preset,
          x: targetX,
          y: args.y ?? 0,
          width: args.width,
          height: args.height,
          stateLabel: args.stateLabel,
          fill: args.fill,
        });

        store.insertNode(artboard, root.id);
        return {
          content: [
            {
              type: 'text',
              text: `Artboard "${artboard.id}" (${artboard.preset}) spawned at x: ${artboard.x}, y: ${artboard.y} (${artboard.width}x${artboard.height}).`,
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
    'render_viewport',
    {
      description: 'Renders any frame or the entire canvas to PNG and returns the image for visual verification.',
      inputSchema: {
        nodeId: z.string().describe('The frame node id to render'),
        scale: z.number().optional().describe('Zoom scale factor (default 1)'),
      },
    },
    async (args) => {
      try {
        const layout = await computeLayout(store, args.nodeId);
        const svg = renderToSvg(store, args.nodeId, layout, { tokenRegistry });
        const pngBuffer = await renderToPng(svg, { scale: args.scale });

        const audit = await auditDesign(store, args.nodeId, { tokenRegistry }).catch(() => null);
        const qualityWarning = audit && !audit.valid
          ? `\n⚠️ Quality Warning: Detected ${audit.issues.length} issue(s) (e.g. ${audit.issues[0]?.message}). Call tool 'audit_design' for suggested fixes.`
          : '';

        const base64Png = pngBuffer.toString('base64');
        return {
          content: [
            {
              type: 'image',
              data: base64Png,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: `Rendered node "${args.nodeId}" (${layout.bounds.width}x${layout.bounds.height}px).${qualityWarning}`,
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

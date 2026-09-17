import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  ISceneStore,
  createFrameNode,
  createTextNode,
} from '@vitra/core';
import { computeLayout } from '@vitra/layout';
import { renderToSvg, renderToPng } from '@vitra/renderer';

export function createVitraServer(store: ISceneStore): McpServer {
  const server = new McpServer({
    name: 'vitra-design-runtime',
    version: '0.1.0',
  });

   server.registerTool(
    'create_frame',
    {
      description: 'Creates a container frame with optional auto-layout, fill, and corner radius.',
      inputSchema: {
        id: z.string().describe('Unique node identifier'),
        parentId: z.string().describe('Parent container or root id'),
        name: z.string().optional().describe('Human-readable name'),
        width: z.number().optional(),
        height: z.number().optional(),
        fill: z.string().optional().describe('Hex background color, e.g. #1E1E2E'),
        cornerRadius: z.number().optional(),
        layout: z
          .object({
            direction: z.enum(['horizontal', 'vertical']).optional(),
            gap: z.number().optional(),
            padding: z
              .object({
                top: z.number().optional(),
                right: z.number().optional(),
                bottom: z.number().optional(),
                left: z.number().optional(),
              })
              .optional(),
            alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional(),
            justifyContent: z.enum(['start', 'center', 'end', 'space-between']).optional(),
          })
          .optional(),
      },
    },
    async (args) => {
      try {
        const layout = args.layout
          ? {
              ...args.layout,
              padding: args.layout.padding
                ? {
                    top: args.layout.padding.top ?? 0,
                    right: args.layout.padding.right ?? 0,
                    bottom: args.layout.padding.bottom ?? 0,
                    left: args.layout.padding.left ?? 0,
                  }
                : undefined,
            }
          : undefined;

        const frame = createFrameNode({
          id: args.id,
          name: args.name,
          width: args.width,
          height: args.height,
          fill: args.fill,
          cornerRadius: args.cornerRadius,
          layout,
        });

        store.insertNode(frame, args.parentId);
        return {
          content: [{ type: 'text', text: `Frame "${args.id}" created successfully.` }],
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
    'create_text',
    {
      description: 'Creates a text element inside a container frame.',
      inputSchema: {
        id: z.string().describe('Unique node identifier'),
        parentId: z.string().describe('Parent frame id'),
        text: z.string().describe('Text content'),
        fontSize: z.number().optional(),
        fontWeight: z.number().optional(),
        fill: z.string().optional().describe('Hex text color, e.g. #CDD6F4'),
      },
    },
    async (args) => {
      try {
        const textNode = createTextNode({
          id: args.id,
          text: args.text,
          fontSize: args.fontSize,
          fontWeight: args.fontWeight,
          fill: args.fill,
        });

        store.insertNode(textNode, args.parentId);
        return {
          content: [{ type: 'text', text: `Text node "${args.id}" created successfully.` }],
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
        const svg = renderToSvg(store, args.nodeId, layout);
        const pngBuffer = await renderToPng(svg, { scale: args.scale });

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
              text: `Rendered node "${args.nodeId}" (${layout.bounds.width}x${layout.bounds.height}px).`,
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

  return server;
}

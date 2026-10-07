import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createFrameNode,
  createTextNode,
  createShapeNode,
  createIconNode,
  ShapeType,
  LayoutSizing,
  insertDeclarativeTree,
} from '@vitra/core';
import { McpToolContext } from './context.js';

export function registerPrimitiveTools(server: McpServer, ctx: McpToolContext): void {
  const { store } = ctx;

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
        stroke: z.string().optional().describe('Hex border color, e.g. #313244'),
        strokeWidth: z.number().optional().describe('Border width in pixels'),
        cornerRadius: z.number().optional(),
        effects: z
          .array(
            z.object({
              type: z.literal('drop-shadow'),
              color: z.string().optional(),
              offsetX: z.number().optional(),
              offsetY: z.number().optional(),
              blur: z.number().optional(),
            })
          )
          .optional(),
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
        sizingHorizontal: z.enum(['fixed', 'hug', 'fill']).optional().describe('Horizontal layout sizing (fixed, hug, or fill)'),
        sizingVertical: z.enum(['fixed', 'hug', 'fill']).optional().describe('Vertical layout sizing (fixed, hug, or fill)'),
      },
    },
    async (args) => {
      try {
        const frame = createFrameNode({
          id: args.id,
          name: args.name,
          width: args.width,
          height: args.height,
          fill: args.fill,
          stroke: args.stroke,
          strokeWidth: args.strokeWidth,
          cornerRadius: args.cornerRadius,
          effects: args.effects?.map((eff) => ({
            type: 'drop-shadow',
            color: eff.color ?? 'rgba(0, 0, 0, 0.25)',
            offsetX: eff.offsetX ?? 0,
            offsetY: eff.offsetY ?? 4,
            blur: eff.blur ?? 8,
          })),
          layout: args.layout
            ? {
                direction: args.layout.direction,
                gap: args.layout.gap,
                alignItems: args.layout.alignItems,
                justifyContent: args.layout.justifyContent,
                padding: args.layout.padding
                  ? {
                      top: args.layout.padding.top ?? 0,
                      right: args.layout.padding.right ?? 0,
                      bottom: args.layout.padding.bottom ?? 0,
                      left: args.layout.padding.left ?? 0,
                    }
                  : undefined,
              }
            : undefined,
          sizingHorizontal: args.sizingHorizontal as LayoutSizing | undefined,
          sizingVertical: args.sizingVertical as LayoutSizing | undefined,
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
      description: 'Creates a text element inside a container frame with optional multi-line wrapping.',
      inputSchema: {
        id: z.string().describe('Unique node identifier'),
        parentId: z.string().describe('Parent frame id'),
        text: z.string().describe('Text content'),
        fontSize: z.number().optional(),
        fontWeight: z.number().optional(),
        fill: z.string().optional().describe('Hex text color, e.g. #CDD6F4'),
        lineHeight: z.number().optional(),
        wrap: z.boolean().optional().describe('Enable multi-line text wrapping'),
        maxWidth: z.number().optional().describe('Maximum text width before wrapping (pixels)'),
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
          lineHeight: args.lineHeight,
          wrap: args.wrap,
          maxWidth: args.maxWidth,
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
    'create_icon',
    {
      description: 'Creates a crisp vector icon (e.g. "home", "search", "paperclip", "send", "shield", "users", "arrow-up-right", "pin") with customizable size, color, and stroke.',
      inputSchema: {
        id: z.string().describe('Unique node identifier'),
        parentId: z.string().describe('Parent frame id'),
        iconName: z.string().describe('Icon identifier (e.g. "home", "search", "send", "shield", "users", "arrow-up-right")'),
        name: z.string().optional().describe('Human-readable layer name'),
        size: z.number().optional().describe('Square bounding size in pixels (default 24)'),
        color: z.string().optional().describe('Hex color string, e.g. #89B4FA or #CDD6F4 (default: current/fill)'),
        strokeWidth: z.number().optional().describe('Vector stroke line width (default: 2)'),
      },
    },
    async (args) => {
      try {
        const iconNode = createIconNode({
          id: args.id,
          name: args.name,
          icon: args.iconName,
          size: args.size,
          color: args.color,
          strokeWidth: args.strokeWidth,
        });

        store.insertNode(iconNode, args.parentId);
        return {
          content: [{ type: 'text', text: `Icon node "${args.id}" (${iconNode.icon}) created successfully.` }],
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
    'create_shape',
    {
      description: 'Creates a shape element (rectangle, ellipse/avatar, or divider line) inside a container frame.',
      inputSchema: {
        id: z.string().describe('Unique node identifier'),
        parentId: z.string().describe('Parent frame id'),
        name: z.string().optional().describe('Human-readable name'),
        shapeType: z.enum(['rectangle', 'ellipse', 'divider']).optional().describe('Type of shape (default: rectangle)'),
        width: z.number().optional().describe('Width in pixels'),
        height: z.number().optional().describe('Height in pixels'),
        fill: z.string().optional().describe('Hex fill color, e.g. #89B4FA'),
        stroke: z.string().optional().describe('Hex border color, e.g. #B4BEFE'),
        strokeWidth: z.number().optional().describe('Border width in pixels'),
        cornerRadius: z.number().optional().describe('Corner radius for rectangles'),
      },
    },
    async (args) => {
      try {
        const shape = createShapeNode({
          id: args.id,
          name: args.name,
          shapeType: args.shapeType as ShapeType | undefined,
          width: args.width,
          height: args.height,
          fill: args.fill,
          stroke: args.stroke,
          strokeWidth: args.strokeWidth,
          cornerRadius: args.cornerRadius,
        });

        store.insertNode(shape, args.parentId);
        return {
          content: [{ type: 'text', text: `Shape "${args.id}" (${shape.shapeType}) created successfully.` }],
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
    'insert_component',
    {
      description:
        'Atomically inserts an entire declarative component tree (e.g. Card, Modal, Navigation Bar with nested frames, text, shapes, icons, and autolayout) in a single tool call without roundtrip micro-operations.',
      inputSchema: {
        parentId: z.string().describe('Target parent node ID where the component should be inserted'),
        component: z.record(z.unknown()).describe('Declarative component node object with optional nested "children" array'),
        index: z.number().optional().describe('Insertion index among parent\'s children (defaults to appending at end)'),
      },
    },
    async (args) => {
      try {
        const { rootId, totalInserted } = insertDeclarativeTree(
          store,
          args.component,
          args.parentId,
          args.index
        );
        return {
          content: [
            {
              type: 'text',
              text: `Inserted component "${rootId}" with ${totalInserted} nodes into parent "${args.parentId}".`,
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
    'update_node',
    {
      description: 'Updates properties of an existing node (frame, text, or shape). Only specified fields are changed.',
      inputSchema: {
        nodeId: z.string().describe('The id of the node to update'),
        patch: z.record(z.unknown()).describe('Object with properties to update, e.g. { fill: "#FF0000", width: 300 }'),
      },
    },
    async (args) => {
      try {
        store.updateNode(args.nodeId, args.patch as Record<string, unknown>);
        return {
          content: [{ type: 'text', text: `Node "${args.nodeId}" updated successfully.` }],
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
    'delete_node',
    {
      description: 'Deletes an existing node and all its children from the scene.',
      inputSchema: {
        nodeId: z.string().describe('The id of the node to delete'),
      },
    },
    async (args) => {
      try {
        store.deleteNode(args.nodeId);
        return {
          content: [{ type: 'text', text: `Node "${args.nodeId}" deleted successfully.` }],
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
    'move_node',
    {
      description:
        'Moves a node to a new parent frame or changes its child index/order among siblings. In horizontal auto-layout, index 0 is on the left; in vertical auto-layout, index 0 is at the top.',
      inputSchema: {
        nodeId: z.string().describe('ID of the node to move or reorder'),
        newParentId: z.string().describe('Target parent frame ID (use existing parent ID to reorder siblings)'),
        index: z.number().optional().describe('0-based child index (0 = leftmost or topmost)'),
      },
    },
    async (args) => {
      try {
        store.moveNode(args.nodeId, args.newParentId, args.index);
        return {
          content: [
            {
              type: 'text',
              text: `Node "${args.nodeId}" moved to "${args.newParentId}" at index ${args.index ?? 'end'} successfully.`,
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

import { z } from 'zod';

export const LayoutSizingSchema = z.enum(['fixed', 'hug', 'fill']);
export type LayoutSizing = z.infer<typeof LayoutSizingSchema>;

export const PaddingSchema = z.object({
  top: z.number().default(0),
  right: z.number().default(0),
  bottom: z.number().default(0),
  left: z.number().default(0),
});
export type Padding = z.infer<typeof PaddingSchema>;

export const AutoLayoutSchema = z.object({
  direction: z.enum(['horizontal', 'vertical']).default('vertical'),
  gap: z.number().default(0),
  padding: PaddingSchema.default({ top: 0, right: 0, bottom: 0, left: 0 }),
  alignItems: z.enum(['start', 'center', 'end', 'stretch']).default('start'),
  justifyContent: z.enum(['start', 'center', 'end', 'space-between']).default('start'),
});
export type AutoLayout = z.infer<typeof AutoLayoutSchema>;

export const BaseNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable().default(null),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});

export const DocumentNodeSchema = BaseNodeSchema.extend({
  type: z.literal('document'),
  childIds: z.array(z.string()).default([]),
});
export type DocumentNode = z.infer<typeof DocumentNodeSchema>;

export const FrameNodeSchema = BaseNodeSchema.extend({
  type: z.literal('frame'),
  childIds: z.array(z.string()).default([]),
  width: z.number().optional(),
  height: z.number().optional(),
  layout: AutoLayoutSchema.optional(),
  fill: z.string().optional(),  
  cornerRadius: z.number().default(0),
  sizingHorizontal: LayoutSizingSchema.default('fixed'),
  sizingVertical: LayoutSizingSchema.default('fixed'),
});
export type FrameNode = z.infer<typeof FrameNodeSchema>;

export const TextNodeSchema = BaseNodeSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().default(16),
  fontWeight: z.number().default(400),
  fill: z.string().default('#000000'),
  lineHeight: z.number().optional(),
  sizingHorizontal: LayoutSizingSchema.default('hug'),
  sizingVertical: LayoutSizingSchema.default('hug'),
});
export type TextNode = z.infer<typeof TextNodeSchema>;

export const SceneNodeSchema = z.discriminatedUnion('type', [
  DocumentNodeSchema,
  FrameNodeSchema,
  TextNodeSchema,
]);
export type SceneNode = z.infer<typeof SceneNodeSchema>;

 export function createDocumentNode(props: { id: string; name?: string }): DocumentNode {
  return DocumentNodeSchema.parse({
    id: props.id,
    name: props.name ?? 'Document',
    type: 'document',
  });
}

export function createFrameNode(props: {
  id: string;
  name?: string;
  width?: number;
  height?: number;
  layout?: Partial<AutoLayout>;
  fill?: string;
  cornerRadius?: number;
}): FrameNode {
  return FrameNodeSchema.parse({
    id: props.id,
    name: props.name ?? 'Frame',
    type: 'frame',
    width: props.width,
    height: props.height,
    layout: props.layout ? AutoLayoutSchema.parse(props.layout) : undefined,
    fill: props.fill,
    cornerRadius: props.cornerRadius ?? 0,
  });
}

export function createTextNode(props: {
  id: string;
  text: string;
  name?: string;
  fontSize?: number;
  fontWeight?: number;
  fill?: string;
  lineHeight?: number;
}): TextNode {
  return TextNodeSchema.parse({
    id: props.id,
    name: props.name ?? props.text.slice(0, 16),
    type: 'text',
    text: props.text,
    fontSize: props.fontSize ?? 16,
    fontWeight: props.fontWeight ?? 400,
    fill: props.fill ?? '#000000',
    lineHeight: props.lineHeight,
  });
}
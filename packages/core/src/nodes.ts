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
  padding: PaddingSchema.default({ top: 0, right: 0, bottom: 0, left: 0 }).optional(),
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

export const EffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('drop-shadow'),
    color: z.string().default('rgba(0, 0, 0, 0.25)'),
    offsetX: z.number().default(0),
    offsetY: z.number().default(4),
    blur: z.number().default(8),
  }),
]);
export type Effect = z.infer<typeof EffectSchema>;

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
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  effects: z.array(EffectSchema).optional(),
  cornerRadius: z.number().default(0),
  sizingHorizontal: LayoutSizingSchema.default('fixed'),
  sizingVertical: LayoutSizingSchema.default('fixed'),
});
export type FrameNode = z.infer<typeof FrameNodeSchema>;

export const ShapeTypeSchema = z.enum(['rectangle', 'ellipse', 'divider']);
export type ShapeType = z.infer<typeof ShapeTypeSchema>;

export const ShapeNodeSchema = BaseNodeSchema.extend({
  type: z.literal('shape'),
  shapeType: ShapeTypeSchema.default('rectangle'),
  width: z.number().default(100),
  height: z.number().default(100),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  cornerRadius: z.number().default(0),
  effects: z.array(EffectSchema).optional(),
  sizingHorizontal: LayoutSizingSchema.default('fixed'),
  sizingVertical: LayoutSizingSchema.default('fixed'),
});
export type ShapeNode = z.infer<typeof ShapeNodeSchema>;

export const TextNodeSchema = BaseNodeSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().default(16),
  fontWeight: z.number().default(400),
  fill: z.string().default('#000000'),
  lineHeight: z.number().optional(),
  wrap: z.boolean().default(false),
  maxWidth: z.number().optional(),
  sizingHorizontal: LayoutSizingSchema.default('hug'),
  sizingVertical: LayoutSizingSchema.default('hug'),
});
export type TextNode = z.infer<typeof TextNodeSchema>;

export const IconNodeSchema = BaseNodeSchema.extend({
  type: z.literal('icon'),
  icon: z.string(),
  size: z.number().default(20),
  color: z.string().default('#FFFFFF'),
  fill: z.string().default('none'),
  strokeWidth: z.number().default(2),
  sizingHorizontal: LayoutSizingSchema.default('fixed'),
  sizingVertical: LayoutSizingSchema.default('fixed'),
});
export type IconNode = z.infer<typeof IconNodeSchema>;

export const ArtboardPresetSchema = z.enum(['desktop', 'mobile', 'tablet', 'custom']);
export type ArtboardPreset = z.infer<typeof ArtboardPresetSchema>;

export const ArtboardNodeSchema = BaseNodeSchema.extend({
  type: z.literal('artboard'),
  childIds: z.array(z.string()).default([]),
  preset: ArtboardPresetSchema.default('desktop'),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(1440),
  height: z.number().default(900),
  stateLabel: z.string().optional(),
  layout: AutoLayoutSchema.optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  effects: z.array(EffectSchema).optional(),
  cornerRadius: z.number().default(0),
});
export type ArtboardNode = z.infer<typeof ArtboardNodeSchema>;

export const SceneNodeSchema = z.discriminatedUnion('type', [
  DocumentNodeSchema,
  ArtboardNodeSchema,
  FrameNodeSchema,
  TextNodeSchema,
  ShapeNodeSchema,
  IconNodeSchema,
]);
export type SceneNode = z.infer<typeof SceneNodeSchema>;

export function createArtboardNode(props: {
  id: string;
  name?: string;
  preset?: ArtboardPreset;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  stateLabel?: string;
  layout?: Partial<AutoLayout>;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  effects?: Effect[];
  cornerRadius?: number;
}): ArtboardNode {
  return ArtboardNodeSchema.parse({
    id: props.id,
    name: props.name ?? props.stateLabel ?? 'Artboard',
    type: 'artboard',
    preset: props.preset ?? 'desktop',
    x: props.x ?? 0,
    y: props.y ?? 0,
    width: props.width ?? (props.preset === 'mobile' ? 375 : props.preset === 'tablet' ? 768 : 1440),
    height: props.height ?? (props.preset === 'mobile' ? 812 : props.preset === 'tablet' ? 1024 : 900),
    stateLabel: props.stateLabel,
    layout: props.layout,
    fill: props.fill ?? '#0F111A',
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    effects: props.effects,
    cornerRadius: props.cornerRadius ?? 0,
  });
}

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
  stroke?: string;
  strokeWidth?: number;
  effects?: Effect[];
  cornerRadius?: number;
  sizingHorizontal?: LayoutSizing;
  sizingVertical?: LayoutSizing;
  childIds?: string[];
}): FrameNode {
  return FrameNodeSchema.parse({
    id: props.id,
    name: props.name ?? 'Frame',
    type: 'frame',
    width: props.width,
    height: props.height,
    layout: props.layout ? AutoLayoutSchema.parse(props.layout) : undefined,
    fill: props.fill,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    effects: props.effects,
    cornerRadius: props.cornerRadius ?? 0,
    sizingHorizontal: props.sizingHorizontal ?? 'fixed',
    sizingVertical: props.sizingVertical ?? 'fixed',
    childIds: props.childIds ?? [],
  });
}

export function createShapeNode(props: {
  id: string;
  shapeType?: ShapeType;
  name?: string;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  effects?: Effect[];
}): ShapeNode {
  return ShapeNodeSchema.parse({
    id: props.id,
    name: props.name ?? 'Shape',
    type: 'shape',
    shapeType: props.shapeType ?? 'rectangle',
    width: props.width ?? 100,
    height: props.height ?? 100,
    fill: props.fill,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    cornerRadius: props.cornerRadius ?? 0,
    effects: props.effects,
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
  wrap?: boolean;
  maxWidth?: number;
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
    wrap: props.wrap ?? false,
    maxWidth: props.maxWidth,
  });
}

export function createIconNode(props: {
  id: string;
  icon: string;
  name?: string;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
}): IconNode {
  return IconNodeSchema.parse({
    id: props.id,
    name: props.name ?? props.icon,
    type: 'icon',
    icon: props.icon,
    size: props.size ?? 20,
    color: props.color ?? '#FFFFFF',
    fill: props.fill ?? 'none',
    strokeWidth: props.strokeWidth ?? 2,
  });
}
import { ISceneStore } from './store.js';
import { SceneNode, ShapeType } from './nodes.js';
import { DeclarativeNode } from './declarative.js';

type AttributeValue = string | number | boolean | null;

/**
 * Parses key-value pairs inside bracket notation: [key: val, key2: "val with spaces"]
 */
function parseBracketAttributes(attrStr: string): Record<string, AttributeValue> {
  const result: Record<string, AttributeValue> = {};
  if (!attrStr || !attrStr.trim()) return result;

  const regex = /([a-zA-Z0-9_]+)\s*:\s*(?:"([^"]*)"|'([^']*)'|([^,\]]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(attrStr)) !== null) {
    const rawKey = match[1];
    if (!rawKey) continue;
    const key = rawKey.trim();
    const rawVal = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4];
    let val: AttributeValue = (rawVal || '').trim();

    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val === 'null') val = null;
    else if (!isNaN(Number(val)) && val !== '') val = Number(val);

    result[key] = val;
  }

  return result;
}

/**
 * Parses an indented design.md format into a DeclarativeNode tree.
 */
export function parseDesignMarkdown(markdown: string): DeclarativeNode {
  const lines = markdown.split('\n');
  const stack: { indent: number; node: DeclarativeNode }[] = [];
  let rootNode: DeclarativeNode | null = null;
  let autoIdCounter = 1;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//') || (trimmed.startsWith('#') && !trimmed.includes(':'))) {
      continue;
    }

    const indent = rawLine.search(/\S|$/);
    const cleanLine = trimmed.replace(/^([-*#]+\s*)/, '');

    const match = cleanLine.match(/^([A-Za-z0-9_-]+)(?:\s*:\s*([A-Za-z0-9_-]+))?\s*(?:\[(.*)\])?$/);
    if (!match || !match[1]) continue;

    const rawType = match[1].toLowerCase();
    const explicitId = match[2];
    const attrString = match[3] || '';
    const attrs = parseBracketAttributes(attrString);

    let type: DeclarativeNode['type'] = 'frame';
    if (rawType.includes('artboard')) type = 'artboard';
    else if (rawType.includes('text')) type = 'text';
    else if (rawType.includes('shape')) type = 'shape';
    else if (rawType.includes('icon')) type = 'icon';
    else if (rawType.includes('frame') || rawType.includes('card') || rawType.includes('box')) type = 'frame';

    const id = explicitId || (attrs.id !== undefined ? String(attrs.id) : `${type}-${autoIdCounter++}`);

    const node: DeclarativeNode = {
      id,
      type,
      name: attrs.name !== undefined ? String(attrs.name) : id,
      children: [],
    };

    if (attrs.w !== undefined) {
      if (attrs.w === 'fill') node.sizingHorizontal = 'fill';
      else if (attrs.w === 'hug') node.sizingHorizontal = 'hug';
      else node.width = Number(attrs.w);
    }
    if (attrs.h !== undefined) {
      if (attrs.h === 'fill') node.sizingVertical = 'fill';
      else if (attrs.h === 'hug') node.sizingVertical = 'hug';
      else node.height = Number(attrs.h);
    }

    if (attrs.fill) node.fill = String(attrs.fill);
    if (attrs.stroke) node.stroke = String(attrs.stroke);
    if (attrs.strokeWidth !== undefined) node.strokeWidth = Number(attrs.strokeWidth);
    if (attrs.r !== undefined) node.cornerRadius = Number(attrs.r);
    if (attrs.cornerRadius !== undefined) node.cornerRadius = Number(attrs.cornerRadius);

    if (attrs.shadow !== undefined) {
      const offset = typeof attrs.shadow === 'number' ? attrs.shadow : Number(attrs.shadow) || 4;
      node.effects = [
        {
          type: 'drop-shadow',
          color: '#000000',
          offsetX: offset,
          offsetY: offset,
          blur: 0,
        },
      ];
    }

    if (attrs.dir || attrs.gap !== undefined || attrs.pad !== undefined || attrs.align || attrs.justify) {
      const pad = attrs.pad !== undefined ? Number(attrs.pad) : undefined;
      const alignStr = String(attrs.align || '');
      const justifyStr = String(attrs.justify || '');
      const alignItems = alignStr === 'center' || alignStr === 'end' || alignStr === 'stretch' ? alignStr : 'start';
      const justifyContent = justifyStr === 'center' || justifyStr === 'end' || justifyStr === 'space-between' ? justifyStr : 'start';
      node.layout = {
        direction: attrs.dir === 'horizontal' ? 'horizontal' : 'vertical',
        gap: attrs.gap !== undefined ? Number(attrs.gap) : 0,
        alignItems,
        justifyContent,
        padding: pad !== undefined ? { top: pad, right: pad, bottom: pad, left: pad } : undefined,
      };
    }

    if (attrs.text !== undefined) node.text = String(attrs.text);
    if (attrs.size !== undefined) node.fontSize = Number(attrs.size);
    if (attrs.fontSize !== undefined) node.fontSize = Number(attrs.fontSize);
    if (attrs.weight !== undefined) node.fontWeight = Number(attrs.weight);
    if (attrs.fontWeight !== undefined) node.fontWeight = Number(attrs.fontWeight);
    if (attrs.wrap !== undefined) node.wrap = Boolean(attrs.wrap);
    if (attrs.maxW !== undefined) node.maxWidth = Number(attrs.maxW);
    if (attrs.maxWidth !== undefined) node.maxWidth = Number(attrs.maxWidth);

    if (attrs.icon) node.icon = String(attrs.icon);
    if (attrs.color) node.color = String(attrs.color);

    if (attrs.shape) node.shapeType = String(attrs.shape) as ShapeType;
    if (attrs.shapeType) node.shapeType = String(attrs.shapeType) as ShapeType;

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1]!.node;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      if (!rootNode) rootNode = node;
    }

    stack.push({ indent, node });
  }

  if (!rootNode) {
    throw new Error('Failed to parse design markdown: no root node found.');
  }

  return rootNode;
}

/**
 * Serializes any SceneNode in the store to a clean, indented design.md format.
 */
export function exportToDesignMarkdown(store: ISceneStore, rootId: string): string {
  const root = store.getNode(rootId);
  if (!root) {
    throw new Error(`Node "${rootId}" not found in store.`);
  }

  const lines: string[] = [];

  function serializeNode(node: SceneNode, depth: number) {
    const indent = '  '.repeat(depth);
    const attrs: string[] = [];

    if (node.type === 'frame') {
      if (node.sizingHorizontal === 'fill') attrs.push('w: fill');
      else if (node.sizingHorizontal === 'hug') attrs.push('w: hug');
      else if (node.width) attrs.push(`w: ${node.width}`);

      if (node.sizingVertical === 'fill') attrs.push('h: fill');
      else if (node.sizingVertical === 'hug') attrs.push('h: hug');
      else if (node.height) attrs.push(`h: ${node.height}`);

      if (node.layout) {
        attrs.push(`dir: ${node.layout.direction}`);
        if (node.layout.gap) attrs.push(`gap: ${node.layout.gap}`);
        if (node.layout.padding?.top) attrs.push(`pad: ${node.layout.padding.top}`);
        if (node.layout.alignItems && node.layout.alignItems !== 'start') attrs.push(`align: ${node.layout.alignItems}`);
        if (node.layout.justifyContent && node.layout.justifyContent !== 'start') attrs.push(`justify: ${node.layout.justifyContent}`);
      }
    } else if (node.type === 'artboard') {
      if (node.width) attrs.push(`w: ${node.width}`);
      if (node.height) attrs.push(`h: ${node.height}`);

      if (node.layout) {
        attrs.push(`dir: ${node.layout.direction}`);
        if (node.layout.gap) attrs.push(`gap: ${node.layout.gap}`);
        if (node.layout.padding?.top) attrs.push(`pad: ${node.layout.padding.top}`);
        if (node.layout.alignItems && node.layout.alignItems !== 'start') attrs.push(`align: ${node.layout.alignItems}`);
        if (node.layout.justifyContent && node.layout.justifyContent !== 'start') attrs.push(`justify: ${node.layout.justifyContent}`);
      }
    } else if (node.type === 'shape') {
      if (node.width) attrs.push(`w: ${node.width}`);
      if (node.height) attrs.push(`h: ${node.height}`);
      if (node.shapeType) attrs.push(`shape: ${node.shapeType}`);
    }

    if ('fill' in node && node.fill) attrs.push(`fill: ${node.fill}`);
    if ('stroke' in node && node.stroke) attrs.push(`stroke: ${node.stroke}`);
    if ('strokeWidth' in node && node.strokeWidth) attrs.push(`strokeWidth: ${node.strokeWidth}`);
    if ('cornerRadius' in node && node.cornerRadius) attrs.push(`r: ${node.cornerRadius}`);

    if (node.type === 'text') {
      attrs.push(`text: "${node.text.replace(/"/g, '\\"')}"`);
      if (node.fontSize) attrs.push(`size: ${node.fontSize}`);
      if (node.fontWeight) attrs.push(`weight: ${node.fontWeight}`);
      if (node.wrap) attrs.push('wrap: true');
      if (node.maxWidth) attrs.push(`maxW: ${node.maxWidth}`);
    }

    if (node.type === 'icon') {
      attrs.push(`icon: "${node.icon}"`);
      if (node.size) attrs.push(`size: ${node.size}`);
      if (node.color) attrs.push(`color: ${node.color}`);
    }

    const typeCapitalized = node.type.charAt(0).toUpperCase() + node.type.slice(1);
    const attrString = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
    lines.push(`${indent}- ${typeCapitalized}: ${node.id}${attrString}`);

    if ('childIds' in node && Array.isArray(node.childIds)) {
      for (const childId of node.childIds) {
        const childNode = store.getNode(childId);
        if (childNode) {
          serializeNode(childNode, depth + 1);
        }
      }
    }
  }

  serializeNode(root, 0);
  return lines.join('\n');
}

import { FrameNode, TextNode, ShapeNode } from '@vitra/core';

 const TAILWIND_SPACING_MAP: Record<number, string> = {
  0: '0',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  48: '12',
  56: '14',
  64: '16',
};

function mapSpacingValue(prefix: string, px?: number): string | null {
  if (px === undefined) return null;
  if (px in TAILWIND_SPACING_MAP) {
    return `${prefix}-${TAILWIND_SPACING_MAP[px]}`;
  }
  return `${prefix}-[${px}px]`;
}

function mapRadius(radius?: number): string | null {
  if (radius === undefined || radius === 0) return null;
  switch (radius) {
    case 2:
      return 'rounded-sm';
    case 4:
      return 'rounded';
    case 6:
      return 'rounded-md';
    case 8:
      return 'rounded-lg';
    case 12:
      return 'rounded-xl';
    case 16:
      return 'rounded-2xl';
    case 24:
      return 'rounded-3xl';
    case 9999:
      return 'rounded-full';
    default:
      return `rounded-[${radius}px]`;
  }
}

function mapFontSize(size?: number): string {
  if (!size) return 'text-base';
  switch (size) {
    case 12:
      return 'text-xs';
    case 14:
      return 'text-sm';
    case 16:
      return 'text-base';
    case 18:
      return 'text-lg';
    case 20:
      return 'text-xl';
    case 24:
      return 'text-2xl';
    case 30:
      return 'text-3xl';
    case 36:
      return 'text-4xl';
    case 48:
      return 'text-5xl';
    default:
      return `text-[${size}px]`;
  }
}

function mapFontWeight(weight?: number): string | null {
  if (!weight || weight === 400) return null;
  switch (weight) {
    case 100:
      return 'font-thin';
    case 200:
      return 'font-extralight';
    case 300:
      return 'font-light';
    case 500:
      return 'font-medium';
    case 600:
      return 'font-semibold';
    case 700:
      return 'font-bold';
    case 800:
      return 'font-extrabold';
    case 900:
      return 'font-black';
    default:
      return `font-[${weight}]`;
  }
}

function formatColorClass(prefix: string, color?: string): string | null {
  if (!color || color === 'transparent') {
    return `${prefix}-transparent`;
  }

   if (color.startsWith('$')) {
    const varName = color.slice(1).replace(/\./g, '-');
    return `${prefix}-[var(--${varName})]`;
  }

   const rgbaMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

    if (alpha < 1) {
      const alphaPercent = Math.round(alpha * 100);
      return `${prefix}-[${hex}]/${alphaPercent}`;
    }
    return `${prefix}-[${hex}]`;
  }

   if (color.startsWith('#')) {
    return `${prefix}-[${color}]`;
  }

  return `${prefix}-[${color}]`;
}

export function mapFrameToTailwind(frame: FrameNode): string[] {
  const classes: string[] = [];

   if (frame.layout) {
    classes.push('flex');
    classes.push(frame.layout.direction === 'horizontal' ? 'flex-row' : 'flex-col');

    if (frame.layout.alignItems && frame.layout.alignItems !== 'start') {
      switch (frame.layout.alignItems) {
        case 'center':
          classes.push('items-center');
          break;
        case 'end':
          classes.push('items-end');
          break;
        case 'stretch':
          classes.push('items-stretch');
          break;
      }
    }

    if (frame.layout.justifyContent && frame.layout.justifyContent !== 'start') {
      switch (frame.layout.justifyContent) {
        case 'center':
          classes.push('justify-center');
          break;
        case 'end':
          classes.push('justify-end');
          break;
        case 'space-between':
          classes.push('justify-between');
          break;
      }
    }

     if (frame.layout.gap) {
      const gapClass = mapSpacingValue('gap', frame.layout.gap);
      if (gapClass) classes.push(gapClass);
    }

     const p = frame.layout.padding;
    if (p) {
      const { top = 0, right = 0, bottom = 0, left = 0 } = p;
      const hasPadding = top > 0 || right > 0 || bottom > 0 || left > 0;
      if (hasPadding) {
        if (top === bottom && right === left && top === right) {
          const pClass = mapSpacingValue('p', top);
          if (pClass) classes.push(pClass);
        } else if (top === bottom && right === left) {
          const pyClass = mapSpacingValue('py', top);
          const pxClass = mapSpacingValue('px', right);
          if (pyClass) classes.push(pyClass);
          if (pxClass) classes.push(pxClass);
        } else {
          if (top) classes.push(mapSpacingValue('pt', top)!);
          if (right) classes.push(mapSpacingValue('pr', right)!);
          if (bottom) classes.push(mapSpacingValue('pb', bottom)!);
          if (left) classes.push(mapSpacingValue('pl', left)!);
        }
      }
    }
  }

   if (frame.width !== undefined) {
    classes.push(`w-[${frame.width}px]`);
  }
  if (frame.height !== undefined) {
    classes.push(`h-[${frame.height}px]`);
  }

   const bgClass = formatColorClass('bg', frame.fill);
  if (bgClass) classes.push(bgClass);

   if (frame.stroke) {
    classes.push(frame.strokeWidth && frame.strokeWidth > 1 ? `border-${frame.strokeWidth}` : 'border');
    const borderCol = formatColorClass('border', frame.stroke);
    if (borderCol) classes.push(borderCol);
  }

   const radiusClass = mapRadius(frame.cornerRadius);
  if (radiusClass) classes.push(radiusClass);

   if (frame.effects && frame.effects.some((e) => e.type === 'drop-shadow')) {
    classes.push('shadow-xl');
  }

  return classes;
}

export function mapTextToTailwind(text: TextNode): string[] {
  const classes: string[] = [];

  classes.push(mapFontSize(text.fontSize));

  const weightClass = mapFontWeight(text.fontWeight);
  if (weightClass) classes.push(weightClass);

  const textCol = formatColorClass('text', text.fill);
  if (textCol) classes.push(textCol);

  if (text.wrap) {
    classes.push('whitespace-normal', 'break-words');
  } else {
    classes.push('whitespace-nowrap');
  }

  return classes;
}

export function mapShapeToTailwind(shape: ShapeNode): string[] {
  const classes: string[] = [];

  if (shape.width !== undefined) {
    classes.push(`w-[${shape.width}px]`);
  }
  if (shape.height !== undefined) {
    classes.push(`h-[${shape.height}px]`);
  }

  if (shape.shapeType === 'ellipse') {
    classes.push('rounded-full');
  } else {
    const radiusClass = mapRadius(shape.cornerRadius);
    if (radiusClass) classes.push(radiusClass);
  }

  const bgClass = formatColorClass('bg', shape.fill);
  if (bgClass) classes.push(bgClass);

  if (shape.stroke) {
    classes.push(shape.strokeWidth && shape.strokeWidth > 1 ? `border-${shape.strokeWidth}` : 'border');
    const borderCol = formatColorClass('border', shape.stroke);
    if (borderCol) classes.push(borderCol);
  }

  return classes;
}

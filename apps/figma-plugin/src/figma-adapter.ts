import type {
  FrameNode as VitraFrameNode,
  AutoLayout,
} from '@vitra/core';
import type { FigmaColor, FigmaPaint, FigmaEffect } from './types.js';

export function hexToFigmaColor(hex: string): FigmaColor {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = clean.length >= 8 ? parseInt(clean.substring(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function figmaColorToHex(color?: FigmaColor, opacity?: number): string | undefined {
  if (!color) return undefined;
  const r = Math.round(Math.min(1, Math.max(0, color.r)) * 255);
  const g = Math.round(Math.min(1, Math.max(0, color.g)) * 255);
  const b = Math.round(Math.min(1, Math.max(0, color.b)) * 255);
  const a = opacity !== undefined ? opacity : color.a !== undefined ? color.a : 1;

  const hexR = r.toString(16).padStart(2, '0').toUpperCase();
  const hexG = g.toString(16).padStart(2, '0').toUpperCase();
  const hexB = b.toString(16).padStart(2, '0').toUpperCase();

  if (a < 0.999) {
    const hexA = Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0').toUpperCase();
    return `#${hexR}${hexG}${hexB}${hexA}`;
  }

  return `#${hexR}${hexG}${hexB}`;
}

export interface FigmaAutoLayoutProps {
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX';
}

export function mapVitraLayoutToFigma(layout?: Partial<AutoLayout>): FigmaAutoLayoutProps | undefined {
  if (!layout) return undefined;

  const layoutMode = layout.direction === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
  let primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' = 'MIN';
  if (layout.justifyContent === 'center') primaryAxisAlignItems = 'CENTER';
  else if (layout.justifyContent === 'end') primaryAxisAlignItems = 'MAX';
  else if (layout.justifyContent === 'space-between') primaryAxisAlignItems = 'SPACE_BETWEEN';

  let counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' = 'MIN';
  if (layout.alignItems === 'center') counterAxisAlignItems = 'CENTER';
  else if (layout.alignItems === 'end') counterAxisAlignItems = 'MAX';

  return {
    layoutMode,
    itemSpacing: layout.gap ?? 0,
    paddingTop: layout.padding?.top ?? 0,
    paddingRight: layout.padding?.right ?? 0,
    paddingBottom: layout.padding?.bottom ?? 0,
    paddingLeft: layout.padding?.left ?? 0,
    primaryAxisAlignItems,
    counterAxisAlignItems,
  };
}

export function mapVitraFillsToFigma(fill?: string): FigmaPaint[] {
  if (!fill || fill === 'transparent') return [];
  return [
    {
      type: 'SOLID',
      color: hexToFigmaColor(fill),
    },
  ];
}

export function mapVitraStrokesToFigma(stroke?: string, strokeWidth?: number): { strokes: FigmaPaint[]; strokeWeight: number } {
  if (!stroke) return { strokes: [], strokeWeight: 0 };
  return {
    strokes: [
      {
        type: 'SOLID',
        color: hexToFigmaColor(stroke),
      },
    ],
    strokeWeight: strokeWidth ?? 1,
  };
}

export function mapVitraEffectsToFigma(effects?: VitraFrameNode['effects']): FigmaEffect[] {
  if (!effects || effects.length === 0) return [];
  const result: FigmaEffect[] = [];
  for (const eff of effects) {
    if (eff.type === 'drop-shadow') {
      result.push({
        type: 'DROP_SHADOW',
        color: eff.color ? hexToFigmaColor(eff.color) : { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: eff.offsetX ?? 0, y: eff.offsetY ?? 4 },
        radius: eff.blur ?? 8,
      });
    }
  }
  return result;
}

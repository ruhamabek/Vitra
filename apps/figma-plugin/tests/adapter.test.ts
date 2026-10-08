import { describe, it, expect } from 'vitest';
import {
  hexToFigmaColor,
  figmaColorToHex,
  mapVitraLayoutToFigma,
  mapVitraFillsToFigma,
  mapVitraStrokesToFigma,
  mapVitraEffectsToFigma,
} from '../src/figma-adapter.js';

describe('Figma Adapter', () => {
  it('converts hex colors to Figma RGBA floats and back', () => {
    const figmaColor = hexToFigmaColor('#FF5500');
    expect(figmaColor.r).toBeCloseTo(1, 2);
    expect(figmaColor.g).toBeCloseTo(0.333, 2);
    expect(figmaColor.b).toBeCloseTo(0, 2);
    expect(figmaColor.a).toBe(1);

    const hexBack = figmaColorToHex(figmaColor);
    expect(hexBack).toBe('#FF5500');
  });

  it('handles 8-character hex colors with alpha', () => {
    const figmaColor = hexToFigmaColor('#0066FF80');
    expect(figmaColor.r).toBeCloseTo(0, 2);
    expect(figmaColor.g).toBeCloseTo(0.4, 2);
    expect(figmaColor.b).toBeCloseTo(1, 2);
    expect(figmaColor.a).toBeCloseTo(0.5, 1);

    const hexBack = figmaColorToHex(figmaColor);
    expect(hexBack?.toUpperCase()).toBe('#0066FF80');
  });

  it('maps Vitra AutoLayout to Figma AutoLayout', () => {
    const figmaLayout = mapVitraLayoutToFigma({
      direction: 'vertical',
      gap: 16,
      padding: { top: 12, right: 24, bottom: 12, left: 24 },
      alignItems: 'center',
      justifyContent: 'space-between',
    });

    expect(figmaLayout).toEqual({
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 12,
      paddingRight: 24,
      paddingBottom: 12,
      paddingLeft: 24,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'CENTER',
    });
  });

  it('maps horizontal layout with end alignment', () => {
    const figmaLayout = mapVitraLayoutToFigma({
      direction: 'horizontal',
      gap: 8,
      alignItems: 'end',
      justifyContent: 'end',
    });

    expect(figmaLayout?.layoutMode).toBe('HORIZONTAL');
    expect(figmaLayout?.primaryAxisAlignItems).toBe('MAX');
    expect(figmaLayout?.counterAxisAlignItems).toBe('MAX');
    expect(figmaLayout?.itemSpacing).toBe(8);
  });

  it('maps fills and strokes to Figma paint structures', () => {
    const fills = mapVitraFillsToFigma('#1E1E1E');
    expect(fills.length).toBe(1);
    expect(fills[0].type).toBe('SOLID');

    const strokeProps = mapVitraStrokesToFigma('#FFFFFF', 2);
    expect(strokeProps.strokes.length).toBe(1);
    expect(strokeProps.strokeWeight).toBe(2);
  });

  it('maps drop shadow effects', () => {
    const effects = mapVitraEffectsToFigma([
      {
        type: 'drop-shadow',
        color: '#000000',
        offsetX: 0,
        offsetY: 4,
        blur: 12,
      },
    ]);

    expect(effects.length).toBe(1);
    expect(effects[0].type).toBe('DROP_SHADOW');
    expect(effects[0].offset).toEqual({ x: 0, y: 4 });
    expect(effects[0].radius).toBe(12);
  });
});

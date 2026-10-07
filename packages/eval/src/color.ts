export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(color: string): RGBA {
  const trimmed = color.trim().toLowerCase();

   if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      const a = hex.length === 4 ? parseInt(hex[3]! + hex[3]!, 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

   const rgbMatch = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    return { r, g, b, a };
  }

  // Fallback to black
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Linearize an 8-bit sRGB channel to CIE XYZ linear space.
 */
function linearizeChannel(val: number): number {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Calculates relative luminance (0.0 to 1.0) according to WCAG 2.1 specifications.
 */
export function calculateLuminance(color: string | RGBA): number {
  const rgba = typeof color === 'string' ? parseColor(color) : color;
  const R = linearizeChannel(rgba.r);
  const G = linearizeChannel(rgba.g);
  const B = linearizeChannel(rgba.b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Composite a foreground color with alpha transparency over a solid background color.
 */
export function compositeColor(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };

  const r = Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a);
  const g = Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a);
  const b = Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a);

  return { r, g, b, a };
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two colors (ranging from 1.0 to 21.0).
 */
export function calculateContrastRatio(fgColor: string | RGBA, bgColor: string | RGBA): number {
  let fg = typeof fgColor === 'string' ? parseColor(fgColor) : fgColor;
  let bg = typeof bgColor === 'string' ? parseColor(bgColor) : bgColor;

  if (bg.a < 1) {
    bg = compositeColor(bg, { r: 15, g: 17, b: 26, a: 1 });
  }

   if (fg.a < 1) {
    fg = compositeColor(fg, bg);
  }

  const l1 = calculateLuminance(fg);
  const l2 = calculateLuminance(bg);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastEvaluation {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  level: 'AAA' | 'AA' | 'fail';
}

export function evaluateTextContrast(
  fgColor: string | RGBA,
  bgColor: string | RGBA,
  fontSize = 16,
  fontWeight = 400
): ContrastEvaluation {
  const ratio = calculateContrastRatio(fgColor, bgColor);
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);

  const minAARatio = isLargeText ? 3.0 : 4.5;
  const minAAARatio = isLargeText ? 4.5 : 7.0;

  const passesAA = ratio >= minAARatio;
  const passesAAA = ratio >= minAAARatio;

  let level: 'AAA' | 'AA' | 'fail' = 'fail';
  if (passesAAA) level = 'AAA';
  else if (passesAA) level = 'AA';

  return { ratio, passesAA, passesAAA, level };
}

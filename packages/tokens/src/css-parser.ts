import { TokenDefinition, TokenTree, TokenRegistry } from './registry.js';

export interface ParsedTokenResult {
  base: TokenTree;
  themes: Record<string, TokenTree>;
  totalParsed: number;
}

/**
 * Standard CSS length units conversion to px.
 */
function parseCssDimension(val: string): number | null {
  const trimmed = val.trim();
  const match = trimmed.match(/^(-?\d*\.?\d+)(px|rem|em|pt)?$/);
  if (!match || !match[1]) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  const unit = match[2] || 'px';
  if (unit === 'px') return num;
  if (unit === 'rem' || unit === 'em') return Math.round(num * 16 * 100) / 100;
  if (unit === 'pt') return Math.round(num * 1.333 * 100) / 100;

  return num;
}

/**
 * Checks if a CSS value represents a color.
 */
function isColorValue(val: string): boolean {
  const trimmed = val.trim().toLowerCase();
  if (trimmed.startsWith('#')) return true;
  if (
    trimmed.startsWith('rgb(') ||
    trimmed.startsWith('rgba(') ||
    trimmed.startsWith('hsl(') ||
    trimmed.startsWith('hsla(') ||
    trimmed.startsWith('oklch(') ||
    trimmed.startsWith('color(')
  ) {
    return true;
  }
 
  const namedColors = new Set([
    'transparent', 'currentcolor', 'black', 'white', 'red', 'green', 'blue',
    'yellow', 'purple', 'gray', 'grey', 'cyan', 'magenta', 'orange', 'pink'
  ]);
  return namedColors.has(trimmed);
}

/**
 * Determines token type from variable name and value.
 */
function inferTokenType(name: string, value: string): { type: string; cleanValue: string | number } {
  const lowerName = name.toLowerCase();

   if (
    lowerName.includes('color') ||
    lowerName.includes('bg') ||
    lowerName.includes('surface') ||
    lowerName.includes('border') ||
    lowerName.includes('text') ||
    lowerName.includes('fill') ||
    lowerName.includes('stroke') ||
    isColorValue(value)
  ) {
    return { type: 'color', cleanValue: value.trim() };
  }

   const dim = parseCssDimension(value);
  if (
    dim !== null &&
    (lowerName.includes('space') ||
      lowerName.includes('spacing') ||
      lowerName.includes('gap') ||
      lowerName.includes('pad') ||
      lowerName.includes('margin') ||
      lowerName.includes('radius') ||
      lowerName.includes('radii') ||
      lowerName.includes('size') ||
      lowerName.includes('width') ||
      lowerName.includes('height'))
  ) {
    return { type: 'dimension', cleanValue: dim };
  }

   if (
    lowerName.includes('font') ||
    lowerName.includes('family') ||
    value.includes('sans-serif') ||
    value.includes('serif') ||
    value.includes('monospace')
  ) {
    return { type: 'fontFamily', cleanValue: value.trim() };
  }

   if (dim !== null) {
    return { type: 'number', cleanValue: dim };
  }

  return { type: 'other', cleanValue: value.trim() };
}

/**
 * Splits a CSS variable name like `--color-brand-primary` into structured path segments:
 * ['colors', 'brand', 'primary']
 */
function variableNameToPath(varName: string): string[] {
   const raw = varName.replace(/^--/, '').trim();
  const parts = raw.split(/[-_]/).filter(Boolean);

  if (parts.length === 0 || !parts[0]) return ['misc'];

   const first = parts[0].toLowerCase();
  if (first === 'color' || first === 'colors') {
    parts[0] = 'colors';
  } else if (first === 'space' || first === 'spacing') {
    parts[0] = 'spacing';
  } else if (first === 'radius' || first === 'radii') {
    parts[0] = 'radii';
  } else if (first === 'font' || first === 'fonts') {
    parts[0] = 'fonts';
  } else if (first === 'shadow' || first === 'shadows') {
    parts[0] = 'shadows';
  }

  return parts;
}

/**
 * Sets a value at a nested path inside a TokenTree.
 */
function setNestedToken(tree: TokenTree, path: string[], token: TokenDefinition): void {
  if (path.length === 0) return;
  let curr: TokenTree = tree;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (!segment) continue;
    if (!curr[segment] || typeof curr[segment] !== 'object' || '$value' in curr[segment]) {
      curr[segment] = {};
    }
    curr = curr[segment];
  }

  const last = path[path.length - 1];
  if (last) {
    curr[last] = token;
  }
}

/**
 * Detects if a CSS selector represents a theme override (e.g. .dark, [data-theme="dark"]).
 */
function detectThemeName(selector: string): string | null {
  const clean = selector.toLowerCase();
  if (clean.includes(':root') || clean.includes(':host') || clean === 'html' || clean === 'body') {
    return null; // base theme
  }

   const darkMatch = clean.match(/\.dark|\[data-theme=["']?dark["']?\]|\[data-mode=["']?dark["']?\]|\.theme-dark/);
  if (darkMatch) return 'dark';

  const lightMatch = clean.match(/\.light|\[data-theme=["']?light["']?\]|\[data-mode=["']?light["']?\]|\.theme-light/);
  if (lightMatch) return 'light';

   const customThemeMatch = clean.match(/\[data-theme=["']?([a-z0-9_-]+)["']?\]|\.theme-([a-z0-9_-]+)/);
  if (customThemeMatch) {
    return customThemeMatch[1] || customThemeMatch[2] || null;
  }

  return null;
}

/**
 * Parses CSS content (e.g. from globals.css) and extracts CSS variables into
 * W3C DTCG TokenTrees, separating base tokens from theme overrides.
 */
export function parseCssVariables(cssContent: string): ParsedTokenResult {
  const baseTree: TokenTree = {};
  const themeTrees: Record<string, TokenTree> = {};
  let count = 0;

   const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');

   const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(cleanCss)) !== null) {
    const rawSelector = match[1];
    const rawBody = match[2];
    if (!rawSelector || !rawBody) continue;

    const selector = rawSelector.trim();
    const body = rawBody.trim();
    const themeName = detectThemeName(selector);

     let targetTree: TokenTree;
    if (themeName) {
      if (!themeTrees[themeName]) themeTrees[themeName] = {};
      targetTree = themeTrees[themeName]!;
    } else {
      targetTree = baseTree;
    }

     const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);?/g;
    let declMatch: RegExpExecArray | null;

    while ((declMatch = declRegex.exec(body)) !== null) {
      const rawVar = declMatch[1];
      const rawVal = declMatch[2];
      if (!rawVar || !rawVal) continue;

      const varName = rawVar.trim();
      const val = rawVal.trim();

      const { type, cleanValue } = inferTokenType(varName, val);
      const path = variableNameToPath(varName);

      const tokenDef: TokenDefinition = {
        $value: cleanValue,
        $type: type,
        $description: `Imported from CSS variable ${varName}`,
      };

      setNestedToken(targetTree, path, tokenDef);
      count++;
    }
  }

  return {
    base: baseTree,
    themes: themeTrees,
    totalParsed: count,
  };
}

/**
 * Convenience helper to populate a TokenRegistry directly from CSS content.
 */
export function populateRegistryFromCss(registry: TokenRegistry, cssContent: string): ParsedTokenResult {
  const result = parseCssVariables(cssContent);
  registry.registerTokens(result.base);

  for (const [themeName, themeTree] of Object.entries(result.themes)) {
    registry.registerTheme(themeName, themeTree);
  }

  return result;
}

import { SceneNode } from '@vitra/core';

export interface TokenDefinition {
  $value: string | number;
  $type?: string;
  $description?: string;
}

export type TokenTree = {
  [key: string]: TokenDefinition | TokenTree | string | number;
};

export class TokenRegistry {
  private baseTokens = new Map<string, string | number>();
  private themes = new Map<string, Map<string, string | number>>();
  private activeTheme: string | null = null;

  constructor() {}

  /**
   * Registers a token tree into the registry.
   */
  registerTokens(tree: TokenTree): void {
    this.flattenTree(tree, '', this.baseTokens);
  }

  /**
   * Registers a theme token set (e.g. 'light' or 'dark') that overrides base tokens.
   */
  registerTheme(themeName: string, tree: TokenTree): void {
    let themeMap = this.themes.get(themeName);
    if (!themeMap) {
      themeMap = new Map();
      this.themes.set(themeName, themeMap);
    }
    this.flattenTree(tree, '', themeMap);
  }

  /**
   * Sets the active theme.
   */
  setTheme(themeName: string | null): void {
    this.activeTheme = themeName;
  }

  /**
   * Resolves a token query like '$colors.brand.primary' or 'colors.brand.primary'.
   */
  resolve(tokenPath: string): string | number {
    const cleanPath = tokenPath.startsWith('$') ? tokenPath.slice(1) : tokenPath;
    return this.resolvePath(cleanPath, new Set());
  }

  private resolvePath(path: string, visited: Set<string>): string | number {
    if (visited.has(path)) {
      throw new Error(`Circular token reference detected: "${Array.from(visited).join(' -> ')} -> ${path}".`);
    }
    visited.add(path);

     let rawValue: string | number | undefined;
    if (this.activeTheme) {
      const themeMap = this.themes.get(this.activeTheme);
      rawValue = themeMap?.get(path);
    }

    if (rawValue === undefined) {
      rawValue = this.baseTokens.get(path);
    }

    if (rawValue === undefined) {
      throw new Error(`Token "${path}" not found in registry.`);
    }

     if (typeof rawValue === 'string' && rawValue.startsWith('{') && rawValue.endsWith('}')) {
      const aliasTarget = rawValue.slice(1, -1).trim();
      return this.resolvePath(aliasTarget, visited);
    }

    return rawValue;
  }

  /**
   * Resolves a token query ('$colors.brand.primary' or 'colors.brand.primary')
   * OR resolves a literal value (e.g. hex code) if an active theme defines an override
   * for a base token that matches this literal value.
   */
  resolveValue(val: string | number): string | number {
    if (typeof val === 'string' && val.startsWith('$')) {
      return this.resolve(val);
    }

    if (this.activeTheme && typeof val === 'string') {
      const themeMap = this.themes.get(this.activeTheme);
      if (themeMap) {
        const lowerVal = val.toLowerCase();
        for (const [path, baseVal] of this.baseTokens.entries()) {
          if (typeof baseVal === 'string' && baseVal.toLowerCase() === lowerVal) {
            const override = themeMap.get(path);
            if (override !== undefined) {
              if (typeof override === 'string' && override.startsWith('$')) {
                return this.resolve(override);
              }
              return override;
            }
          }
        }
      }
    }

    return val;
  }

  private flattenTree(obj: TokenTree, prefix: string, targetMap: Map<string, string | number>): void {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object') {
        if ('$value' in value) {
          targetMap.set(newKey, value.$value as string | number);
        } else {
          this.flattenTree(value as TokenTree, newKey, targetMap);
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        targetMap.set(newKey, value);
      }
    }
  }
}

/**
 * Pure function resolving any token references ($...) or theme overrides on a SceneNode.
 */
export function resolveNodeTokens<T extends SceneNode>(node: T, registry: TokenRegistry): T {
  const resolved = { ...node };

  if ('fill' in resolved && typeof resolved.fill === 'string') {
    resolved.fill = String(registry.resolveValue(resolved.fill));
  }

  if ('stroke' in resolved && typeof resolved.stroke === 'string') {
    resolved.stroke = String(registry.resolveValue(resolved.stroke));
  }

  return resolved;
}

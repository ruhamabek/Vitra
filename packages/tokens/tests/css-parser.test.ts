import { describe, it, expect } from 'vitest';
import { parseCssVariables, populateRegistryFromCss } from '../src/css-parser.js';
import { TokenRegistry, type TokenDefinition } from '../src/registry.js';

type FlatTokenGroup = Record<string, TokenDefinition>;
type NestedTokenGroup = Record<string, Record<string, TokenDefinition>>;

describe('CSS Variables Parser for Vitra Tokens', () => {
  const sampleCss = `
    /* Global styles and base tokens */
    :root {
      --color-brand-primary: #38bdf8;
      --color-surface-bg: #0b1120;
      --color-surface-card: rgb(19, 29, 51);
      --spacing-xs: 4px;
      --spacing-md: 16px;
      --spacing-lg: 1.5rem;
      --radius-sm: 4px;
      --radius-card: 16px;
      --radius-full: 9999px;
      --font-body: 'Inter', sans-serif;
    }

    /* Dark theme overrides */
    .dark {
      --color-surface-bg: #030712;
      --color-surface-card: #0f172a;
      --color-brand-primary: #60a5fa;
    }

    /* Custom high-contrast theme */
    [data-theme="high-contrast"] {
      --color-surface-bg: #000000;
      --color-brand-primary: #ffff00;
    }
  `;

  it('should parse base tokens from :root into nested DTCG structure', () => {
    const result = parseCssVariables(sampleCss);

    expect(result.totalParsed).toBe(15);
    expect(result.base).toBeDefined();

    const colors = result.base.colors as NestedTokenGroup;
    expect(colors.brand.primary.$value).toBe('#38bdf8');
    expect(colors.brand.primary.$type).toBe('color');
    expect(colors.surface.bg.$value).toBe('#0b1120');
    expect(colors.surface.card.$value).toBe('rgb(19, 29, 51)');

     const spacing = result.base.spacing as FlatTokenGroup;
    expect(spacing.xs.$value).toBe(4);
    expect(spacing.xs.$type).toBe('dimension');
    expect(spacing.md.$value).toBe(16);
    expect(spacing.lg.$value).toBe(24);  

     const radii = result.base.radii as FlatTokenGroup;
    expect(radii.card.$value).toBe(16);
    expect(radii.full.$value).toBe(9999);

     const fonts = result.base.fonts as FlatTokenGroup;
    expect(fonts.body.$value).toBe("'Inter', sans-serif");
    expect(fonts.body.$type).toBe('fontFamily');
  });

  it('should extract theme blocks into theme overrides', () => {
    const result = parseCssVariables(sampleCss);

    expect(result.themes.dark).toBeDefined();
    const darkColors = (result.themes.dark?.colors ?? {}) as NestedTokenGroup;
    expect(darkColors.surface.bg.$value).toBe('#030712');
    expect(darkColors.brand.primary.$value).toBe('#60a5fa');

    expect(result.themes['high-contrast']).toBeDefined();
    const hcColors = (result.themes['high-contrast']?.colors ?? {}) as NestedTokenGroup;
    expect(hcColors.brand.primary.$value).toBe('#ffff00');
  });

  it('should populate TokenRegistry and resolve theme switches seamlessly', () => {
    const registry = new TokenRegistry();
    populateRegistryFromCss(registry, sampleCss);

    expect(registry.resolve('colors.brand.primary')).toBe('#38bdf8');
    expect(registry.resolve('colors.surface.bg')).toBe('#0b1120');
    expect(registry.resolve('spacing.md')).toBe(16);
    expect(registry.resolve('radii.card')).toBe(16);

 
    registry.setTheme('dark');
    expect(registry.resolve('colors.brand.primary')).toBe('#60a5fa');
    expect(registry.resolve('colors.surface.bg')).toBe('#030712');
 
    expect(registry.resolve('spacing.md')).toBe(16);

    registry.setTheme('high-contrast');
    expect(registry.resolve('colors.brand.primary')).toBe('#ffff00');
    expect(registry.resolve('colors.surface.bg')).toBe('#000000');
  });
});

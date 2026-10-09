import { describe, it, expect } from 'vitest';
import { TokenRegistry, resolveNodeTokens } from '../src/registry.js';
import { createFrameNode } from '@vitra/core';

describe('Design Tokens Engine', () => {
  it('should register tokens and resolve direct values', () => {
    const registry = new TokenRegistry();

    registry.registerTokens({
      colors: {
        brand: {
          primary: { $value: '#89B4FA', $type: 'color' },
          accent: { $value: '#F38BA8', $type: 'color' },
        },
      },
      radii: {
        md: { $value: 12, $type: 'dimension' },
        lg: { $value: 16, $type: 'dimension' },
      },
    });

    expect(registry.resolve('$colors.brand.primary')).toBe('#89B4FA');
    expect(registry.resolve('$colors.brand.accent')).toBe('#F38BA8');
    expect(registry.resolve('$radii.lg')).toBe(16);
  });

  it('should resolve token references and aliases recursively', () => {
    const registry = new TokenRegistry();

    registry.registerTokens({
      colors: {
        base: {
          blue500: { $value: '#3B82F6', $type: 'color' },
        },
        semantic: {
          action: { $value: '{colors.base.blue500}', $type: 'color' },
          btnBg: { $value: '{colors.semantic.action}', $type: 'color' },
        },
      },
    });

    expect(registry.resolve('$colors.semantic.btnBg')).toBe('#3B82F6');
  });

  it('should support theme switching (dark / light mode)', () => {
    const registry = new TokenRegistry();

     registry.registerTokens({
      colors: {
        surface: { $value: '#1E1E2E', $type: 'color' },
        text: { $value: '#CDD6F4', $type: 'color' },
      },
    });

     registry.registerTheme('light', {
      colors: {
        surface: { $value: '#FFFFFF', $type: 'color' },
        text: { $value: '#1E1E2E', $type: 'color' },
      },
    });

    expect(registry.resolve('$colors.surface')).toBe('#1E1E2E');
    expect(registry.resolve('$colors.text')).toBe('#CDD6F4');

    registry.setTheme('light');
    expect(registry.resolve('$colors.surface')).toBe('#FFFFFF');
    expect(registry.resolve('$colors.text')).toBe('#1E1E2E');
  });

  it('should resolve token references on a SceneNode cleanly', () => {
    const registry = new TokenRegistry();
    registry.registerTokens({
      colors: {
        cardBg: { $value: '#181825', $type: 'color' },
        cardBorder: { $value: '#313244', $type: 'color' },
      },
      radii: {
        card: { $value: 16, $type: 'dimension' },
      },
    });

    const nodeWithTokens = createFrameNode({
      id: 'token-card',
      fill: '$colors.cardBg',
      stroke: '$colors.cardBorder',
      strokeWidth: 2,
      cornerRadius: 16,
    });

    const resolvedNode = resolveNodeTokens(nodeWithTokens, registry);

    expect(resolvedNode.fill).toBe('#181825');
    expect(resolvedNode.stroke).toBe('#313244');
    expect(resolvedNode.cornerRadius).toBe(16);
  });

  it('should remap literal base colors when active theme overrides matching base tokens', () => {
    const registry = new TokenRegistry();
    registry.registerTokens({
      colors: {
        bg: { $value: '#0D0E12', $type: 'color' },
        surface: { $value: '#15171D', $type: 'color' },
      },
    });

    registry.registerTheme('light', {
      colors: {
        bg: { $value: '#F9FAFB', $type: 'color' },
        surface: { $value: '#FFFFFF', $type: 'color' },
      },
    });

     expect(registry.resolveValue('#0D0E12')).toBe('#0D0E12');
    expect(registry.resolveValue('#15171D')).toBe('#15171D');
    expect(registry.resolveValue('#FF0000')).toBe('#FF0000');

     registry.setTheme('light');
    expect(registry.resolveValue('#0D0E12')).toBe('#F9FAFB');
    expect(registry.resolveValue('#15171D')).toBe('#FFFFFF');
     expect(registry.resolveValue('#FF0000')).toBe('#FF0000');
  });
});

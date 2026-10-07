import { describe, it, expect } from 'vitest';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  createShapeNode,
  InMemorySceneStore,
} from '@vitra/core';
import { exportCode, generateReactTailwind, generateSwiftUI } from '../src/index.js';

describe('@vitra/codegen - Multi-Target Code Export Engine', () => {
  it('should generate clean React + Tailwind code for a primary button', () => {
    const root = createDocumentNode({ id: 'root', name: 'Root' });
    const store = new InMemorySceneStore(root);

    const button = createFrameNode({
      id: 'btn-explore',
      name: 'Primary Button',
      fill: '#89B4FA',
      cornerRadius: 8,
      layout: {
        direction: 'horizontal',
        padding: { top: 10, right: 18, bottom: 10, left: 18 },
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    store.insertNode(button, 'root');

    const text = createTextNode({
      id: 'btn-text',
      text: 'Explore Engine',
      fontSize: 14,
      fontWeight: 600,
      fill: '#11111B',
    });
    store.insertNode(text, 'btn-explore');

    const result = exportCode(store, 'btn-explore', { target: 'react-tailwind' });

    expect(result.target).toBe('react-tailwind');
    expect(result.componentName).toBe('PrimaryButton');
    expect(result.code).toContain('import React from \'react\';');
    expect(result.code).toContain('export function PrimaryButton()');
    expect(result.code).toContain('flex flex-row items-center justify-center');
    expect(result.code).toContain('bg-[#89B4FA]');
    expect(result.code).toContain('rounded-lg');
    expect(result.code).toContain('text-sm font-semibold text-[#11111B]');
    expect(result.code).toContain('Explore Engine');
  });

  it('should generate responsive flex-row with gap and padding for an action row', () => {
    const root = createDocumentNode({ id: 'root', name: 'Root' });
    const store = new InMemorySceneStore(root);

    const row = createFrameNode({
      id: 'action-row',
      name: 'Action Row',
      fill: 'transparent',
      layout: {
        direction: 'horizontal',
        gap: 12,
        alignItems: 'center',
      },
    });
    store.insertNode(row, 'root');

    const btn1 = createFrameNode({ id: 'btn-1', name: 'Button 1', fill: '#89B4FA' });
    const btn2 = createFrameNode({ id: 'btn-2', name: 'Button 2', fill: '#24273A' });
    store.insertNode(btn1, 'action-row');
    store.insertNode(btn2, 'action-row');

    const result = generateReactTailwind(store, 'action-row', { includeWrapper: false });

    expect(result.code).toContain('flex flex-row items-center gap-3 bg-transparent');
    expect(result.code).toContain('bg-[#89B4FA]');
    expect(result.code).toContain('bg-[#24273A]');
  });

  it('should capture and map design tokens cleanly', () => {
    const root = createDocumentNode({ id: 'root', name: 'Root' });
    const store = new InMemorySceneStore(root);

    const card = createFrameNode({
      id: 'token-card',
      name: 'Token Card',
      fill: '$color.surface',
      stroke: '$color.primary',
      strokeWidth: 2,
    });
    store.insertNode(card, 'root');

    const label = createTextNode({
      id: 'token-text',
      text: 'Dynamic Theme Text',
      fill: '$color.text',
    });
    store.insertNode(label, 'token-card');

    const result = exportCode(store, 'token-card', { target: 'react-tailwind' });

    expect(result.tokensUsed).toContain('$color.surface');
    expect(result.tokensUsed).toContain('$color.primary');
    expect(result.tokensUsed).toContain('$color.text');
    expect(result.code).toContain('bg-[var(--color-surface)]');
    expect(result.code).toContain('border-2 border-[var(--color-primary)]');
    expect(result.code).toContain('text-[var(--color-text)]');
  });

  it('should generate native SwiftUI View struct with HStack/VStack and modifiers', () => {
    const root = createDocumentNode({ id: 'root', name: 'Root' });
    const store = new InMemorySceneStore(root);

    const card = createFrameNode({
      id: 'swift-card',
      name: 'Profile Card',
      width: 320,
      fill: '#181926',
      cornerRadius: 16,
      layout: {
        direction: 'vertical',
        gap: 12,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });
    store.insertNode(card, 'root');

    const avatar = createShapeNode({
      id: 'avatar',
      name: 'Avatar',
      shapeType: 'ellipse',
      fill: '#89B4FA',
      width: 48,
      height: 48,
    });
    store.insertNode(avatar, 'swift-card');

    const title = createTextNode({
      id: 'title',
      text: 'SwiftUI Native Export',
      fontSize: 18,
      fontWeight: 700,
      fill: '#CAD3F5',
    });
    store.insertNode(title, 'swift-card');

    const result = generateSwiftUI(store, 'swift-card');

    expect(result.target).toBe('swiftui');
    expect(result.componentName).toBe('ProfileCard');
    expect(result.code).toContain('import SwiftUI');
    expect(result.code).toContain('struct ProfileCard: View');
    expect(result.code).toContain('VStack(spacing: 12)');
    expect(result.code).toContain('Circle()');
    expect(result.code).toContain('.frame(width: 48, height: 48)');
    expect(result.code).toContain('Text("SwiftUI Native Export")');
    expect(result.code).toContain('.font(.system(size: 18, weight: .bold))');
    expect(result.code).toContain('.padding(EdgeInsets(top: 20, leading: 20, bottom: 20, trailing: 20))');
    expect(result.code).toContain('.frame(width: 320)');
    expect(result.code).toContain('.cornerRadius(16)');
  });

  it('should export full nested card with drop-shadow and custom componentName', () => {
    const root = createDocumentNode({ id: 'root', name: 'Root' });
    const store = new InMemorySceneStore(root);

    const card = createFrameNode({
      id: 'agent-card',
      name: 'Agent Live Card',
      width: 560,
      fill: '#181926',
      cornerRadius: 16,
      stroke: '#89B4FA',
      strokeWidth: 2,
      layout: {
        direction: 'vertical',
        gap: 16,
        padding: { top: 28, right: 28, bottom: 28, left: 28 },
      },
      effects: [{ type: 'drop-shadow', color: 'rgba(0,0,0,0.5)', blur: 20, offsetX: 0, offsetY: 10 }],
    });
    store.insertNode(card, 'root');

    const result = exportCode(store, 'agent-card', { componentName: 'VitraAgentCard' });

    expect(result.componentName).toBe('VitraAgentCard');
    expect(result.code).toContain('export function VitraAgentCard()');
    expect(result.code).toContain('w-[560px]');
    expect(result.code).toContain('bg-[#181926]');
    expect(result.code).toContain('border-2 border-[#89B4FA]');
    expect(result.code).toContain('rounded-2xl');
    expect(result.code).toContain('shadow-xl');
  });
});

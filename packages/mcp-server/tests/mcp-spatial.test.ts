import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createDocumentNode, InMemorySceneStore, ArtboardNode } from '@vitra/core';
import { createVitraServer } from '../src/server.js';

describe('Vitra MCP Server - Spatial Multi-Artboard TDD Suite', () => {
  it('should allow an agent to spawn responsive artboards side-by-side on infinite canvas', async () => {
    const root = createDocumentNode({ id: 'root', name: 'Infinite Spatial Canvas' });
    const store = new InMemorySceneStore(root);
    const server = createVitraServer(store);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'coding-agent', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

     const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    expect(toolNames).toContain('spawn_artboard');
    expect(toolNames).toContain('move_node');

     const desktopRes = await client.callTool({
      name: 'spawn_artboard',
      arguments: {
        id: 'board-desktop',
        name: 'Test Desktop View',
        preset: 'desktop',
        stateLabel: 'Desktop (1440px)',
      },
    });
    expect(desktopRes.isError).toBeFalsy();

    const desktop = store.getNode('board-desktop') as ArtboardNode | undefined;
    expect(desktop).toBeDefined();
    expect(desktop?.type).toBe('artboard');
    expect(desktop?.width).toBe(1440);
    expect(desktop?.x).toBe(0);

     const mobileRes = await client.callTool({
      name: 'spawn_artboard',
      arguments: {
        id: 'board-mobile',
        name: 'Test Mobile View',
        preset: 'mobile',
        stateLabel: 'Mobile (375px)',
      },
    });
    expect(mobileRes.isError).toBeFalsy();

    const mobile = store.getNode('board-mobile') as ArtboardNode | undefined;
    expect(mobile).toBeDefined();
    expect(mobile?.type).toBe('artboard');
    expect(mobile?.width).toBe(375);
    expect(mobile?.x).toBe(1520);
    expect(mobile?.stateLabel).toBe('Mobile (375px)');
  });
});

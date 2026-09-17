import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createDocumentNode, InMemorySceneStore } from '@vitra/core';
import { createVitraServer } from '../src/server.js';

describe('Vitra MCP Server (Agent Interface)', () => {
  it('should allow an agent to inspect, mutate, and visually render via MCP tools', async () => {
    const root = createDocumentNode({ id: 'root', name: 'Agent Canvas' });
    const store = new InMemorySceneStore(root);

    const server = createVitraServer(store);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'agent-client', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    const toolNames = tools.tools.map(t => t.name);
    expect(toolNames).toContain('create_frame');
    expect(toolNames).toContain('create_text');
    expect(toolNames).toContain('render_viewport');

    const frameResult = await client.callTool({
      name: 'create_frame',
      arguments: {
        id: 'hero-card',
        parentId: 'root',
        name: 'Hero Card',
        fill: '#1E1E2E',
        cornerRadius: 16,
        layout: {
          direction: 'vertical',
          gap: 12,
          padding: { top: 24, right: 24, bottom: 24, left: 24 },
        },
      },
    });
    expect(frameResult.isError).toBeFalsy();
    expect(store.getNode('hero-card')).toBeDefined();

     const textResult = await client.callTool({
      name: 'create_text',
      arguments: {
        id: 'title-node',
        parentId: 'hero-card',
        text: 'AI-Native Design Runtime',
        fontSize: 24,
        fill: '#CDD6F4',
      },
    });
    expect(textResult.isError).toBeFalsy();
    expect(store.getNode('title-node')).toBeDefined();

     const renderResult = await client.callTool({
      name: 'render_viewport',
      arguments: {
        nodeId: 'hero-card',
      },
    });
    expect(renderResult.isError).toBeFalsy();

     const content = renderResult.content as Array<{ type: string; data?: string; text?: string }>;
    expect(content.length).toBeGreaterThan(0);
    const imageBlock = content.find(c => c.type === 'image');
    expect(imageBlock).toBeDefined();
    expect(imageBlock?.data).toBeDefined();  
  });
});
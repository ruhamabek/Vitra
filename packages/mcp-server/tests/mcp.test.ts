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
    expect(toolNames).toContain('insert_component');
    expect(toolNames).toContain('render_viewport');
    expect(toolNames).toContain('audit_design');

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

     const shapeResult = await client.callTool({
      name: 'create_shape',
      arguments: {
        id: 'status-dot',
        parentId: 'hero-card',
        shapeType: 'ellipse',
        width: 12,
        height: 12,
        fill: '#A6E3A1',
      },
    });
    expect(shapeResult.isError).toBeFalsy();
    expect(store.getNode('status-dot')).toBeDefined();

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

     const auditResult = await client.callTool({
      name: 'audit_design',
      arguments: {
        nodeId: 'hero-card',
      },
    });
    expect(auditResult.isError).toBeFalsy();
    const auditContent = auditResult.content as Array<{ type: string; text: string }>;
    const report = JSON.parse(auditContent[0]?.text ?? '{}');
    expect(report.score).toBeDefined();
    expect(report.valid).toBe(true);

     const codeResult = await client.callTool({
      name: 'export_code',
      arguments: {
        nodeId: 'hero-card',
        target: 'react-tailwind',
        componentName: 'HeroCard',
      },
    });
    expect(codeResult.isError).toBeFalsy();
    const codeContent = codeResult.content as Array<{ type: string; text: string }>;
    expect(codeContent[0]?.text).toContain('export function HeroCard()');
    expect(codeContent[0]?.text).toContain('flex flex-col gap-3');
    expect(codeContent[0]?.text).toContain('bg-[#1E1E2E]');
    expect(codeContent[0]?.text).toContain('AI-Native Design Runtime');

     const insertResult = await client.callTool({
      name: 'insert_component',
      arguments: {
        parentId: 'root',
        component: {
          id: 'stats-modal',
          type: 'frame',
          name: 'Stats Modal',
          fill: '#181825',
          children: [
            {
              id: 'stats-header',
              type: 'text',
              text: 'System Metrics',
              fontSize: 18,
              fill: '#FFFFFF',
            },
            {
              id: 'stats-badge',
              type: 'frame',
              width: 80,
              height: 24,
              fill: '#89B4FA',
              children: [
                {
                  id: 'stats-badge-text',
                  type: 'text',
                  text: 'Optimal',
                  fontSize: 12,
                  fill: '#11111B',
                },
              ],
            },
          ],
        },
      },
    });
    expect(insertResult.isError).toBeFalsy();
    expect(store.getNode('stats-modal')).toBeDefined();
    expect(store.getNode('stats-header')).toBeDefined();
    expect(store.getNode('stats-badge')).toBeDefined();
    expect(store.getNode('stats-badge-text')).toBeDefined();
    const modalChildIds = store.getChildren('stats-modal').map((n) => n.id);
    expect(modalChildIds).toContain('stats-header');
    expect(modalChildIds).toContain('stats-badge');
    const badgeChildIds = store.getChildren('stats-badge').map((n) => n.id);
    expect(badgeChildIds).toContain('stats-badge-text');
  });
});
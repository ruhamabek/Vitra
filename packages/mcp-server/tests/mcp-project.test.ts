import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createDocumentNode,
  createArtboardNode,
  InMemorySceneStore,
} from '@vitra/core';
import { createVitraServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

describe('MCP Project & Versioning Tools', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should allow an AI agent to save and commit a .vitra project via MCP', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-mcp-proj-'));
    const projectPath = path.join(tempDir, 'mcp-app.vitra');

    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);
    store.insertNode(
      createArtboardNode({ id: 'ab-1', name: 'Artboard', width: 800, height: 600 }),
      'root'
    );

    const mcpServer = createVitraServer(store);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await mcpServer.connect(serverTransport);
    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

     const saveRes = await client.callTool({
      name: 'save_project',
      arguments: {
        path: projectPath,
        name: 'MCP Test App',
        description: 'Testing MCP project serialization',
      },
    });
    const saveContent = saveRes.content as Array<{ type: string; text?: string }>;
    expect(saveContent[0]?.text).toContain('saved successfully');

    const stat = await fs.stat(path.join(projectPath, 'vitra.json'));
    expect(stat.isFile()).toBe(true);

     const commitRes = await client.callTool({
      name: 'commit_version',
      arguments: {
        path: projectPath,
        intent: 'Add primary hero component',
        rationale: 'Needed for customer onboarding flow',
        model: 'claude-3-7-sonnet',
      },
    });
    const commitContent = commitRes.content as Array<{ type: string; text?: string }>;
    expect(commitContent[0]?.text).toContain('Committed version');

     const histRes = await client.callTool({
      name: 'get_history',
      arguments: { path: projectPath },
    });
    const histContent = histRes.content as Array<{ type: string; text?: string }>;
    const history = JSON.parse(histContent[0]?.text ?? '[]');
    expect(history).toHaveLength(1);
    expect(history[0].intent).toBe('Add primary hero component');
    expect(history[0].author.model).toBe('claude-3-7-sonnet');
  });
});

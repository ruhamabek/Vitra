import { describe, it, expect, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createDocumentNode, InMemorySceneStore } from '@vitra/core';
import { SyncServer, SyncClient } from '@vitra/sync';
import { createVitraServer } from '../src/server.js';

describe('Vitra End-to-End: MCP Agent Mutations -> SyncServer -> Canvas Client', () => {
  let syncServer: SyncServer | undefined;
  let canvasClient: SyncClient | undefined;

  afterAll(() => {
    canvasClient?.close();
    syncServer?.close();
  });

  it('should stream MCP tool mutations in real-time to the canvas sync client', async () => {
     const root = createDocumentNode({ id: 'root', name: 'Agent Canvas' });
    const store = new InMemorySceneStore(root);

     const syncPort = 9897;
    syncServer = new SyncServer(store, { port: syncPort });

     canvasClient = new SyncClient(`ws://localhost:${syncPort}`);
    await canvasClient.waitForReady();

    const mirrorStore = canvasClient.getStore();
    expect(mirrorStore.getRoot().id).toBe('root');

     const mcpServer = createVitraServer(store);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const agent = new Client({ name: 'ai-designer', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([
      mcpServer.connect(serverTransport),
      agent.connect(clientTransport),
    ]);

     const frameResult = await agent.callTool({
      name: 'create_frame',
      arguments: {
        id: 'live-card',
        parentId: 'root',
        name: 'Live Card',
        fill: '#181926',
        cornerRadius: 12,
        layout: {
          direction: 'vertical',
          gap: 8,
          padding: { top: 16, right: 16, bottom: 16, left: 16 },
        },
      },
    });
    expect(frameResult.isError).toBeFalsy();

     await canvasClient.waitForEvent('insert');
    const liveCardOnClient = mirrorStore.getNode('live-card');
    expect(liveCardOnClient).toBeDefined();
    expect(liveCardOnClient?.type).toBe('frame');
    if (liveCardOnClient?.type === 'frame') {
      expect(liveCardOnClient.fill).toBe('#181926');
    }

     const textResult = await agent.callTool({
      name: 'create_text',
      arguments: {
        id: 'card-title',
        parentId: 'live-card',
        text: 'Live Canvas Connected!',
        fontSize: 20,
        fill: '#89B4FA',
      },
    });
    expect(textResult.isError).toBeFalsy();

     await canvasClient.waitForEvent('insert');
    const textOnClient = mirrorStore.getNode('card-title');
    expect(textOnClient).toBeDefined();
    expect(textOnClient?.type).toBe('text');
    if (textOnClient?.type === 'text') {
      expect(textOnClient.text).toBe('Live Canvas Connected!');
      expect(textOnClient.fill).toBe('#89B4FA');
    }
  });
});

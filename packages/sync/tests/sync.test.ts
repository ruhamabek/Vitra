import { describe, it, expect, afterAll } from 'vitest';
import { createDocumentNode, createFrameNode, createTextNode, InMemorySceneStore } from '@vitra/core';
import { SyncServer, SyncClient } from '../src/index.js';

describe('Real-Time Scene Synchronization Protocol', () => {
  let server: SyncServer | undefined;
  let client: SyncClient | undefined;

  afterAll(() => {
    client?.close();
    server?.close();
  });

  it('should sync full initial state and live mutations from server to client', async () => {
     const root = createDocumentNode({ id: 'root', name: 'Server Canvas' });
    const serverStore = new InMemorySceneStore(root);

     const initialFrame = createFrameNode({ id: 'frame-initial', fill: '#1E1E2E' });
    serverStore.insertNode(initialFrame, 'root');

     const testPort = 9888;
    server = new SyncServer(serverStore, { port: testPort });

     client = new SyncClient(`ws://localhost:${testPort}`);
    await client.waitForReady();

    const clientStore = client.getStore();
    expect(clientStore.getNode('frame-initial')).toBeDefined();
    expect(clientStore.getNode('frame-initial')?.type).toBe('frame');

     const newText = createTextNode({ id: 'agent-text', text: 'Live Agent Update' });
    serverStore.insertNode(newText, 'frame-initial');

     await client.waitForEvent('insert');

     const clientTextNode = clientStore.getNode('agent-text');
    expect(clientTextNode).toBeDefined();
    expect(clientTextNode?.type).toBe('text');
    if (clientTextNode?.type === 'text') {
      expect(clientTextNode.text).toBe('Live Agent Update');
    }

     serverStore.updateNode('agent-text', { fill: '#A6E3A1' });
    await client.waitForEvent('update');

    const updatedClientNode = clientStore.getNode('agent-text');
    expect(updatedClientNode?.type).toBe('text');
    if (updatedClientNode?.type === 'text') {
      expect(updatedClientNode.fill).toBe('#A6E3A1');
    }

     client.sendMutation({
      type: 'update',
      nodeId: 'agent-text',
      patch: { text: 'Human Edited Headline', fill: '#FAB387' },
    });

     await new Promise((resolve) => setTimeout(resolve, 80));

     const serverNode = serverStore.getNode('agent-text');
    expect(serverNode).toBeDefined();
    if (serverNode && serverNode.type === 'text') {
      expect(serverNode.text).toBe('Human Edited Headline');
      expect(serverNode.fill).toBe('#FAB387');
    }

     const userEdits = server.getUserEdits();
    expect(userEdits.length).toBeGreaterThan(0);
    expect(userEdits[0]?.nodeId).toBe('agent-text');
    expect(userEdits[0]?.eventType).toBe('update');
    expect(userEdits[0]?.details).toContain('text, fill');

     serverStore.deleteNode('agent-text');
    await client.waitForEvent('delete');
    expect(clientStore.getNode('agent-text')).toBeUndefined();
  }, 15000);
});


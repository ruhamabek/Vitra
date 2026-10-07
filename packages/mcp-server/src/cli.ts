import * as fs from 'fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDocumentNode, InMemorySceneStore, loadVitraProject, ISceneStore } from '@vitra/core';
import { createOrJoinSyncHub } from '@vitra/sync';
import { createVitraServer } from './server.js';

async function main() {
  let store: ISceneStore;
  const projectPath = process.env.VITRA_PROJECT_PATH || './telegram-web.vitra';
  if (fs.existsSync(projectPath)) {
    try {
      const project = await loadVitraProject(projectPath);
      store = project.store;
    } catch {
      const root = createDocumentNode({ id: 'root', name: 'Agent Canvas' });
      store = new InMemorySceneStore(root);
    }
  } else {
    const root = createDocumentNode({ id: 'root', name: 'Agent Canvas' });
    store = new InMemorySceneStore(root);
  }

  const server = createVitraServer(store);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const syncPort = parseInt(process.env.VITRA_SYNC_PORT || '9876', 10);
  createOrJoinSyncHub(store, syncPort, fs.existsSync(projectPath) ? projectPath : undefined).then((syncConn) => {
    if (syncConn.isServer) {
      process.stderr.write(`[Vitra Live Sync] WebSocket server hosting on ws://localhost:${syncPort}\n`);
    } else {
      process.stderr.write(`[Vitra Live Sync] Joined existing sync hub on ws://localhost:${syncPort}\n`);
    }

    process.on('SIGINT', () => {
      syncConn.close();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      syncConn.close();
      process.exit(0);
    });
  }).catch((err) => {
    process.stderr.write(`[Vitra Live Sync] Warning: ${err instanceof Error ? err.message : String(err)}\n`);
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error('Fatal Vitra MCP Server error:', message);
  process.exit(1);
});
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ISceneStore } from '@vitra/core';
import { TokenRegistry } from '@vitra/tokens';
import { SyncServer } from '@vitra/sync';
import { registerAllTools } from './tools/index.js';

export function createVitraServer(
  store: ISceneStore,
  tokenRegistry?: TokenRegistry,
  syncServer?: SyncServer
): McpServer {
  const registry = tokenRegistry ?? new TokenRegistry();
  const server = new McpServer({
    name: 'vitra-design-runtime',
    version: '0.1.0',
  });

  registerAllTools(server, {
    store,
    tokenRegistry: registry,
    syncServer,
  });

  return server;
}

export async function startStdioMcpServer(customProjectPath?: string): Promise<McpServer> {
  const fs = await import('node:fs');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { createDocumentNode, InMemorySceneStore, loadVitraProject } = await import('@vitra/core');
  const { createOrJoinSyncHub } = await import('@vitra/sync');

  let store: ISceneStore;
  const projectPath = customProjectPath || process.env.VITRA_PROJECT_PATH || './my-design.vitra';
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
  createOrJoinSyncHub(store, syncPort, fs.existsSync(projectPath) ? projectPath : undefined)
    .then((syncConn) => {
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
    })
    .catch((err) => {
      process.stderr.write(`[Vitra Live Sync] Warning: ${err instanceof Error ? err.message : String(err)}\n`);
    });

  return server;
}


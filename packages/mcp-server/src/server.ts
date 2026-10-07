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

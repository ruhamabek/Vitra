import { ISceneStore } from '@vitra/core';
import { TokenRegistry } from '@vitra/tokens';
import { SyncServer } from '@vitra/sync';

export interface McpToolContext {
  store: ISceneStore;
  tokenRegistry: TokenRegistry;
  syncServer?: SyncServer;
}

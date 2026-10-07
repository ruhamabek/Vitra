import { WebSocket } from 'ws';
import type { ISceneStore, SceneEvent } from '@vitra/core';
import type { ISyncHubConnection } from './types.js';
import { SyncServer } from './server.js';

export async function createOrJoinSyncHub(
  store: ISceneStore,
  port = 9876,
  projectPath?: string
): Promise<ISyncHubConnection> {
  return new Promise((resolve) => {
    let settled = false;
    let server: SyncServer | null = null;
    let activeWs: WebSocket | null = null;
    let isClosed = false;

    function connectClient() {
      if (isClosed) return;
      try {
        const ws = new WebSocket(`ws://localhost:${port}`);
        activeWs = ws;

        ws.on('open', () => {
          if (!settled) {
            settled = true;
            resolve({
              isServer: false,
              close: () => {
                isClosed = true;
                unsubscribe();
                ws.close();
              },
            });
          }
        });

        ws.on('error', () => {
          if (!settled) {
            setTimeout(connectClient, 300);
          } else if (!isClosed) {
            setTimeout(connectClient, 1000);
          }
        });

        ws.on('close', () => {
          if (!isClosed) {
            setTimeout(connectClient, 1000);
          }
        });
      } catch {
        if (!isClosed) {
          setTimeout(connectClient, 1000);
        }
      }
    }

    const unsubscribe = store.subscribe((event: SceneEvent) => {
      if (activeWs && activeWs.readyState === WebSocket.OPEN) {
        activeWs.send(JSON.stringify({ type: 'event', event }));
      }
    });

    try {
      server = new SyncServer(store, {
        port,
        projectPath,
        onError: (err: unknown) => {
          const code = (err as { code?: string })?.code;
          const message = err instanceof Error ? err.message : String(err);
          if (!settled && (code === 'EADDRINUSE' || message.includes('EADDRINUSE'))) {
            connectClient();
          }
        },
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({
            isServer: true,
            close: () => server?.close(),
          });
        }
      }, 150);
    } catch {
      connectClient();
    }
  });
}

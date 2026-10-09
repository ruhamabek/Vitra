import { WebSocketServer, WebSocket } from 'ws';
import type * as http from 'node:http';
import {
  type ISceneStore,
  type SceneNode,
  type SceneEvent,
  loadVitraProject,
  convertFigmaJsonToVitra,
  convertPenpotJsonToVitra,
} from '@vitra/core';
import type { UserEditRecord, SyncServerOptions, SyncMessage } from './types.js';
import { createSyncHttpServer } from './http-server.js';
import { getGitStatusMessage, handleGitMessage, type SyncServerContext } from './git-handler.js';

export class SyncServer implements SyncServerContext {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private unsubscribe: () => void;
  private userEdits: UserEditRecord[] = [];
  private projectPath?: string;
  private isReady = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private store: ISceneStore, options: SyncServerOptions) {
    this.projectPath = options.projectPath;

    this.httpServer = createSyncHttpServer({
      port: options.port,
      projectPath: options.projectPath,
      staticDir: options.staticDir,
      onError: options.onError,
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('error', (err) => {
      if (options.onError) {
        options.onError(err);
      } else if (this.isReady) {
        console.error('[Vitra Sync WSS Error]', err);
      }
    });

    this.httpServer.once('listening', () => {
      this.isReady = true;
    });

    this.httpServer.on('error', (err) => {
      if (options.onError) {
        options.onError(err);
      } else if (this.isReady) {
        console.error('[Vitra Sync Server Error]', err);
      }
    });

    this.httpServer.listen(options.port);

     this.heartbeatInterval = setInterval(() => {
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch {}
        }
      }
    }, 15000);

    this.wss.on('connection', (ws: WebSocket) => {
       ws.on('error', () => {});

      const snapshot = this.getSnapshot();
      ws.send(JSON.stringify(snapshot));

      ws.on('message', async (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString()) as SyncMessage | { type: 'get_snapshot' };

          if (msg.type === 'get_snapshot') {
            if (this.projectPath) {
              try {
                const root = this.store.getRoot();
                if (!root || !root.childIds || root.childIds.length === 0) {
                  const reloaded = await loadVitraProject(this.projectPath);
                  this.setStore(reloaded.store);
                }
              } catch {}
            }
            ws.send(JSON.stringify(this.getSnapshot()));
            return;
          }

          if ((msg.type === 'event' || msg.type === 'mutation') && msg.event) {
            const e = msg.event;
            let details = '';

            if (e.type === 'insert' && e.node) {
              if (!this.store.getNode(e.nodeId)) {
                this.store.insertNode(e.node, e.parentId);
                details = `Created ${e.node.type} "${e.nodeId}"`;
              }
            } else if (e.type === 'update') {
              this.store.updateNode(e.nodeId, e.patch);
              details = `Updated ${Object.keys(e.patch).join(', ')} on "${e.nodeId}"`;
            } else if (e.type === 'delete') {
              this.store.deleteNode(e.nodeId);
              details = `Deleted "${e.nodeId}"`;
            } else if (e.type === 'move') {
              this.store.moveNode(e.nodeId, e.newParentId, e.index);
              details = `Moved "${e.nodeId}" to "${e.newParentId}"`;
            }

            const record: UserEditRecord = {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: Date.now(),
              nodeId: e.nodeId,
              eventType: e.type,
              details,
              event: e,
            };

            this.userEdits.unshift(record);
            if (this.userEdits.length > 100) this.userEdits.pop();

            if (options.onUserEdit) {
              options.onUserEdit(record);
            }
            return;
          }

           if (
            msg.type === 'git_status_request' ||
            msg.type === 'checkout_branch' ||
            msg.type === 'checkout_commit' ||
            msg.type === 'restore_head' ||
            msg.type === 'git_diff_request'
          ) {
            await handleGitMessage(msg, this.projectPath, this, (res) => {
              ws.send(JSON.stringify(res));
            });
            return;
          }

           if (msg.type === 'import_figma') {
            try {
              const parsed = JSON.parse(msg.json);
              const converted = convertFigmaJsonToVitra(parsed);
              this.setStore(converted.store);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              console.error('[SyncServer] import_figma error:', message);
            }
            return;
          }

          if (msg.type === 'import_penpot') {
            try {
              const parsed = JSON.parse(msg.json);
              const converted = convertPenpotJsonToVitra(parsed);
              const root = converted.store.getRoot();
              if (root && root.childIds && root.childIds.length > 0) {
                this.setStore(converted.store);
              } else {
                console.warn('[SyncServer] Ignored empty Penpot import to protect canvas data');
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              console.error('[SyncServer] import_penpot error:', message);
            }
            return;
          }
        } catch {
          // ignore malformed packets
        }
      });
    });

    this.unsubscribe = this.store.subscribe((event: SceneEvent) => {
      this.broadcast({ type: 'event', event });
    });
  }

  public async waitUntilReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer.listening) {
        resolve();
        return;
      }
      const onListening = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        this.httpServer.off('listening', onListening);
        this.httpServer.off('error', onError);
      };
      this.httpServer.once('listening', onListening);
      this.httpServer.once('error', onError);
    });
  }

  getStore(): ISceneStore {
    return this.store;
  }

  async getGitStatusMessage(): Promise<SyncMessage> {
    return getGitStatusMessage(this.projectPath);
  }

  async broadcastGitStatus(): Promise<void> {
    try {
      const msg = await this.getGitStatusMessage();
      this.broadcast(msg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncServer] broadcastGitStatus error:', message);
    }
  }

  setStore(newStore: ISceneStore): void {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch {}
    }
    this.store = newStore;
    this.unsubscribe = this.store.subscribe((event: SceneEvent) => {
      this.broadcast({ type: 'event', event });
    });
    this.broadcast(this.getSnapshot());
  }

  broadcast(msg: SyncMessage): void {
    const payload = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private getSnapshot(): SyncMessage {
    const root = this.store.getRoot();
    const nodes: Record<string, SceneNode> = {};

    const traverse = (nodeId: string) => {
      const node = this.store.getNode(nodeId);
      if (!node) return;
      nodes[nodeId] = node;

      if (node.type === 'document' || node.type === 'frame' || node.type === 'artboard') {
        for (const childId of node.childIds) {
          traverse(childId);
        }
      }
    };

    traverse(root.id);

    return {
      type: 'snapshot',
      root,
      nodes,
    };
  }

  getUserEdits(): UserEditRecord[] {
    return [...this.userEdits];
  }

  close(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch {}
    }
    this.wss.close();
    try {
      this.httpServer.close();
    } catch {}
  }
}

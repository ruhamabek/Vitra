import { WebSocket } from 'ws';
import { InMemorySceneStore, type SceneEvent } from '@vitra/core';
import type { SyncMessage } from './types.js';

export class SyncClient {
  private ws: WebSocket;
  private store?: InMemorySceneStore;
  private isReady = false;
  private readyResolvers: Array<() => void> = [];
  private eventListeners: Array<(event: SceneEvent) => void> = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString()) as SyncMessage;

        if (msg.type === 'snapshot') {
          this.store = new InMemorySceneStore(msg.root);
          for (const [id, node] of Object.entries(msg.nodes)) {
            if (id !== msg.root.id) {
              const pId = node.parentId || 'root';
              if (this.store.getNode(pId)) {
                this.store.insertNode(node, pId);
              }
            }
          }
          this.isReady = true;
          this.readyResolvers.forEach((res) => res());
          this.readyResolvers = [];
        } else if (msg.type === 'event' && this.store) {
          const e = msg.event;
          if (e.type === 'insert' && e.node) {
            if (!this.store.getNode(e.nodeId)) {
              this.store.insertNode(e.node, e.parentId);
            }
          } else if (e.type === 'update') {
            this.store.updateNode(e.nodeId, e.patch);
          } else if (e.type === 'delete') {
            this.store.deleteNode(e.nodeId);
          } else if (e.type === 'move') {
            this.store.moveNode(e.nodeId, e.newParentId, e.index);
          }

          this.eventListeners.forEach((listener) => listener(e));
        }
      } catch {
        // ignore malformed packets
      }
    });
  }

  getRawWebSocket(): WebSocket {
    return this.ws;
  }

  async waitForReady(): Promise<void> {
    if (this.isReady) return;
    return new Promise((resolve) => {
      this.readyResolvers.push(resolve);
    });
  }

  async waitForEvent(eventType: SceneEvent['type']): Promise<SceneEvent> {
    return new Promise((resolve) => {
      const listener = (e: SceneEvent) => {
        if (e.type === eventType) {
          const idx = this.eventListeners.indexOf(listener);
          if (idx !== -1) this.eventListeners.splice(idx, 1);
          resolve(e);
        }
      };

      this.eventListeners.push(listener);
    });
  }

  getStore(): InMemorySceneStore {
    if (!this.store) {
      throw new Error('SyncClient is not ready yet. Await waitForReady() first.');
    }
    return this.store;
  }

  sendMutation(event: SceneEvent): void {
    const msg: SyncMessage = { type: 'mutation', event };
    this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws.close();
  }
}

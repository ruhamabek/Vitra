import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadVitraProject, saveVitraProject, InMemorySceneStore } from '@vitra/core';
import { SyncServer } from '@vitra/sync';

export interface ServeOptions {
  port?: number;
  autoSave?: boolean;
  staticDir?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function serveProject(targetDir: string, options: ServeOptions = {}): Promise<{ server: SyncServer; port: number; close: () => Promise<void> }> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const project = await loadVitraProject(dirPath);
  const port = options.port ?? 9876;

  let autoSaveTimer: NodeJS.Timeout | null = null;
  let sceneDebounceTimer: NodeJS.Timeout | null = null;
  let gitDebounceTimer: NodeJS.Timeout | null = null;

  let isSavingInProgress = false;
  let savePendingAfterCurrent = false;
  let lastSaveCompletedTimestamp = 0;

  async function performSave() {
    if (isSavingInProgress) {
      savePendingAfterCurrent = true;
      return;
    }
    isSavingInProgress = true;

    try {
      const currentStore = (server ? server.getStore() : project.store) as InMemorySceneStore;
      await saveVitraProject(dirPath, {
        manifest: {
          ...project.manifest,
          updatedAt: new Date().toISOString(),
        },
        store: currentStore,
        tokens: project.tokens,
      });
      lastSaveCompletedTimestamp = Date.now();
    } catch (err: unknown) {
      console.warn(`[Vitra Sync Server] Auto-save error: ${getErrorMessage(err)}`);
    } finally {
      isSavingInProgress = false;

      if (savePendingAfterCurrent) {
        savePendingAfterCurrent = false;
        void performSave();
      }
    }
  }

  const server = new SyncServer(project.store, {
    port,
    projectPath: dirPath,
    staticDir: options.staticDir,
    onUserEdit: () => {
      if (options.autoSave !== false) {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
          void performSave();
        }, 150);
      }
    },
  });

  let watcher: fs.FSWatcher | null = null;
  try {
    watcher = fs.watch(dirPath, { recursive: true }, (_eventType, filename) => {
      if (isSavingInProgress) return;
      if (!filename || filename.includes('node_modules')) return;

      const fullPath = path.join(dirPath, filename);
      try {
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
           if (stat.mtimeMs <= lastSaveCompletedTimestamp) return;
        }
      } catch {
        // file might have been unlinked 
      }

       if (
        filename.includes('.history') ||
        filename.includes('refs') ||
        filename.includes('HEAD')
      ) {
        if (gitDebounceTimer) clearTimeout(gitDebounceTimer);
        gitDebounceTimer = setTimeout(async () => {
          try {
            await server.broadcastGitStatus();
            console.log(`[Vitra Sync Server] Git history changed on disk (${filename}); broadcasted updated commits & branches.`);
          } catch (err: unknown) {
            console.warn(`[Vitra Sync Server] Error broadcasting git status: ${getErrorMessage(err)}`);
          }
        }, 80);
      }

       if (!filename.includes('.history') && (filename.endsWith('.json') || filename.endsWith('.md'))) {
        if (sceneDebounceTimer) clearTimeout(sceneDebounceTimer);
        sceneDebounceTimer = setTimeout(async () => {
          try {
            const reloaded = await loadVitraProject(dirPath);
            server.setStore(reloaded.store);
            console.log(`[Vitra Sync Server] Reloaded from disk change (${filename}) and broadcasted to clients.`);
          } catch (err: unknown) {
            console.warn(`[Vitra Sync Server] Error reloading from disk: ${getErrorMessage(err)}`);
          }
        }, 100);
      }
    });
  } catch (err: unknown) {
    console.warn(`[Vitra Sync Server] File watcher unavailable: ${getErrorMessage(err)}`);
  }

  try {
    await server.waitUntilReady();
  } catch (err) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (gitDebounceTimer) clearTimeout(gitDebounceTimer);
    if (sceneDebounceTimer) clearTimeout(sceneDebounceTimer);
    if (watcher) watcher.close();
    server.close();
    throw err;
  }

  return {
    server,
    port,
    close: async () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      if (gitDebounceTimer) clearTimeout(gitDebounceTimer);
      if (sceneDebounceTimer) clearTimeout(sceneDebounceTimer);
      if (watcher) watcher.close();
      server.close();
    },
  };
}


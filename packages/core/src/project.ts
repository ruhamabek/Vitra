import { z } from 'zod';
import * as pathSync from 'node:path';
import { InMemorySceneStore } from './store.js';
import { AgentCommit, AgentCommitSchema } from './history.js';

async function getFs() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  return { fs, path };
}

export const VitraManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0').default('1.0.0'),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  defaultTheme: z.string().default('dark'),
  artboardIds: z.array(z.string()).default([]),
});
export type VitraManifest = z.infer<typeof VitraManifestSchema>;

export interface SaveProjectOptions {
  manifest: Partial<VitraManifest> & { name: string };
  store: InMemorySceneStore;
  tokens?: Record<string, unknown>;
  history?: AgentCommit[];
}

export interface LoadedVitraProject {
  manifest: VitraManifest;
  store: InMemorySceneStore;
  tokens?: Record<string, any>;
  history: AgentCommit[];
}

/**
 * Deterministically stringifies an object by recursively sorting all dictionary keys alphabetically.
 * Guarantees pristine line-by-line git diffs without key permutation churn.
 */
export function deterministicStringify(obj: unknown, space: number = 2): string {
  function sortKeys(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(sortKeys);
    }
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sortedObj[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sortedObj;
  }

  return JSON.stringify(sortKeys(obj), null, space) + '\n';
}

/**
 * Resolves the history directory path for a Vitra project (.history).
 */
export async function getHistoryDir(dirPath: string): Promise<string> {
  const { path } = await getFs();
  return path.join(dirPath, '.history');
}

/**
 * Synchronous resolution of the history directory for a Vitra project (.history).
 */
export function getHistoryDirSync(dirPath: string): string {
  return pathSync.join(dirPath, '.history');
}

/**
 * Saves an entire Vitra project into a local-first, git-native .vitra directory.
 */
export async function saveVitraProject(dirPath: string, options: SaveProjectOptions): Promise<void> {
  const { fs, path } = await getFs();
  const historyDir = await getHistoryDir(dirPath);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.mkdir(path.join(dirPath, 'scene'), { recursive: true });
  await fs.mkdir(path.join(dirPath, 'tokens'), { recursive: true });
  await fs.mkdir(historyDir, { recursive: true });

   const rootChildren = options.store.getChildren(options.store.getRoot().id);
  const detectedArtboardIds = rootChildren
    .filter((n) => n.type === 'artboard')
    .map((n) => n.id);

  const manifestData: VitraManifest = VitraManifestSchema.parse({
    schemaVersion: '1.0.0',
    name: options.manifest.name,
    description: options.manifest.description,
    createdAt: options.manifest.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultTheme: options.manifest.defaultTheme ?? 'dark',
    artboardIds: options.manifest.artboardIds ?? detectedArtboardIds,
  });

   await fs.writeFile(
    path.join(dirPath, 'vitra.json'),
    deterministicStringify(manifestData),
    'utf-8'
  );

   const snapshot = options.store.exportSnapshot();
  await fs.writeFile(
    path.join(dirPath, 'scene', 'scene.json'),
    deterministicStringify(snapshot),
    'utf-8'
  );

   if (options.tokens) {
    await fs.writeFile(
      path.join(dirPath, 'tokens', 'tokens.json'),
      deterministicStringify(options.tokens),
      'utf-8'
    );
  }

   if (options.history) {
    await fs.writeFile(
      path.join(historyDir, 'history.json'),
      deterministicStringify(options.history),
      'utf-8'
    );
  }
}

/**
 * Loads a .vitra project directory from the local filesystem into an in-memory runtime store.
 */
export async function loadVitraProject(dirPath: string): Promise<LoadedVitraProject> {
  const { fs, path } = await getFs();

  const manifestRaw = await fs.readFile(path.join(dirPath, 'vitra.json'), 'utf-8');
  const manifest = VitraManifestSchema.parse(JSON.parse(manifestRaw));


  const sceneRaw = await fs.readFile(path.join(dirPath, 'scene', 'scene.json'), 'utf-8');
  const sceneSnapshot = JSON.parse(sceneRaw);
  const store = InMemorySceneStore.fromSnapshot(sceneSnapshot);


  let tokens: Record<string, any> | undefined;
  try {
    const tokensRaw = await fs.readFile(path.join(dirPath, 'tokens', 'tokens.json'), 'utf-8');
    tokens = JSON.parse(tokensRaw);
  } catch {
    // Optional
  }


  let history: AgentCommit[] = [];
  try {
    const historyDir = await getHistoryDir(dirPath);
    const historyRaw = await fs.readFile(path.join(historyDir, 'history.json'), 'utf-8');
    const parsedHistory = JSON.parse(historyRaw);
    history = z.array(AgentCommitSchema).parse(parsedHistory);
  } catch {
    // Optional
  }

  return {
    manifest,
    store,
    tokens,
    history,
  };
}

/**
 * Saves a snapshot of a scene for a specific commit, writing content-addressed Git objects into .history/objects/
 */
export async function saveCommitSnapshot(
  dirPath: string,
  commitId: string,
  snapshot: any
): Promise<string> {
  const { fs, path } = await getFs();
  const historyDir = await getHistoryDir(dirPath);


  let rootTreeSha = '';
  if (snapshot && snapshot.rootId && snapshot.nodes) {
    try {
      const { InMemorySceneStore } = await import('./store.js');
      const { writeTreeFromStore } = await import('./objects.js');
      const store = InMemorySceneStore.fromSnapshot(snapshot);
      rootTreeSha = await writeTreeFromStore(dirPath, store);
    } catch {
      // Ignore fallback
    }
  }


  if (rootTreeSha && commitId) {
    try {
      const historyPath = path.join(historyDir, 'history.json');
      const historyRaw = await fs.readFile(historyPath, 'utf-8');
      const history: AgentCommit[] = JSON.parse(historyRaw);
      const commit = history.find((c) => c.id === commitId);
      if (commit && !commit.treeSha) {
        commit.treeSha = rootTreeSha;
        await fs.writeFile(historyPath, deterministicStringify(history), 'utf-8');
      }
    } catch {
      // May not be written yet or standalone
    }
  }

  return rootTreeSha;
}

/**
 * Loads a commit's snapshot, restoring from content-addressed Git objects if available.
 */
export async function loadCommitSnapshot(
  dirPath: string,
  commitId: string
): Promise<any | null> {
  const { fs, path } = await getFs();
  const historyDir = await getHistoryDir(dirPath);

  try {
    const historyPath = path.join(historyDir, 'history.json');
    const historyRaw = await fs.readFile(historyPath, 'utf-8');
    const history: AgentCommit[] = JSON.parse(historyRaw);
    const commit = history.find((c) => c.id === commitId);
    if (commit && commit.treeSha) {
      const { restoreStoreFromTree } = await import('./objects.js');
      const store = await restoreStoreFromTree(dirPath, commit.treeSha);
      return store.exportSnapshot();
    }
  } catch {
    // Continue to snapshots/ fallback
  }

  const filePath = path.join(historyDir, 'snapshots', `${commitId}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);


    if (parsed.treeSha) {
      try {
        const { restoreStoreFromTree } = await import('./objects.js');
        const store = await restoreStoreFromTree(dirPath, parsed.treeSha);
        return store.exportSnapshot();
      } catch {
        // Fallback to parsed JSON if object read fails
      }
    }

    if (parsed.nodes) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

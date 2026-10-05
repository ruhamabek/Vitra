import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createDocumentNode,
  createFrameNode,
  createTextNode,
  InMemorySceneStore,
} from '../src/index.js';
import {
  saveVitraProject,
  loadVitraProject,
  deterministicStringify,
  getHistoryDir,
  getHistoryDirSync,
} from '../src/project.js';

describe('Vitra Project Bundle Engine (.vitra format)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should deterministically stringify JSON with sorted keys', () => {
    const obj1 = { z: 1, a: 2, m: { y: 'hello', b: 'world' } };
    const obj2 = { a: 2, m: { b: 'world', y: 'hello' }, z: 1 };

    const str1 = deterministicStringify(obj1);
    const str2 = deterministicStringify(obj2);

    expect(str1).toBe(str2);
    expect(str1.indexOf('"a"')).toBeLessThan(str1.indexOf('"m"'));
    expect(str1.indexOf('"m"')).toBeLessThan(str1.indexOf('"z"'));
  });

  it('should save and load a full .vitra project bundle', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitra-proj-test-'));
    const projectPath = path.join(tempDir, 'dashboard.vitra');

    const root = createDocumentNode({ id: 'root' });
    const store = new InMemorySceneStore(root);
    const frame = createFrameNode({
      id: 'main-card',
      name: 'Main Card',
      fill: '#15171D',
      layout: {
        direction: 'vertical',
        gap: 16,
        alignItems: 'start',
        justifyContent: 'start',
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });
    const text = createTextNode({
      id: 'title',
      text: 'Metrics',
      fontSize: 20,
    });
    store.insertNode(frame, 'root');
    store.insertNode(text, 'main-card');

    const tokens = {
      color: {
        primary: { $value: '#3B82F6', $type: 'color' },
        accent: { $value: '#10B981', $type: 'color' },
      },
    };

    const history = [
      {
        id: 'c-init',
        parentId: null,
        timestamp: '2026-09-19T08:00:00Z',
        author: { type: 'human' as const, name: 'Ruhama' },
        intent: 'Project initialization',
        changes: {
          nodesAdded: ['root', 'main-card', 'title'],
          nodesModified: [],
          nodesDeleted: [],
          tokensModified: [],
        },
      },
    ];

     await saveVitraProject(projectPath, {
      manifest: {
        name: 'Dashboard',
        description: 'Research benchmark dashboard',
        defaultTheme: 'dark',
      },
      store,
      tokens,
      history,
    });

    const manifestStat = await fs.stat(path.join(projectPath, 'vitra.json'));
    expect(manifestStat.isFile()).toBe(true);

    const sceneStat = await fs.stat(path.join(projectPath, 'scene', 'scene.json'));
    expect(sceneStat.isFile()).toBe(true);

    const tokensStat = await fs.stat(path.join(projectPath, 'tokens', 'tokens.json'));
    expect(tokensStat.isFile()).toBe(true);

    const historyStat = await fs.stat(path.join(projectPath, '.history', 'history.json'));
    expect(historyStat.isFile()).toBe(true);

    const loaded = await loadVitraProject(projectPath);

    expect(loaded.manifest.name).toBe('Dashboard');
    expect(loaded.manifest.schemaVersion).toBe('1.0.0');
    expect(loaded.manifest.defaultTheme).toBe('dark');

    expect(loaded.store.getNode('root')).toBeDefined();
    expect(loaded.store.getNode('main-card')).toBeDefined();
    expect(loaded.store.getNode('title')).toBeDefined();
    const loadedText = loaded.store.getNode('title');
    expect(loadedText?.type === 'text' && loadedText.text).toBe('Metrics');

    expect(loaded.tokens?.color?.primary?.$value).toBe('#3B82F6');
    expect(loaded.history).toHaveLength(1);
    expect(loaded.history[0].intent).toBe('Project initialization');
  });

  it('should resolve the .history directory path correctly', async () => {
    const dummyPath = '/workspace/my-design.vitra';
    expect(await getHistoryDir(dummyPath)).toBe(path.join(dummyPath, '.history'));
    expect(getHistoryDirSync(dummyPath)).toBe(path.join(dummyPath, '.history'));
  });
});

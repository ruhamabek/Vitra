import * as path from 'node:path';
import {
  createDocumentNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  InMemorySceneStore,
  saveVitraProject,
  saveCommitSnapshot,
  initRefs,
  AgentCommit,
} from '@vitra/core';

export interface InitOptions {
  name?: string;
  description?: string;
  template?: string;
}

export async function initProject(targetDir: string, options: InitOptions = {}): Promise<string> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const projectName = options.name ?? path.basename(dirPath).replace(/\.vitra$/, '');

  const root = createDocumentNode({ id: 'root', name: projectName });
  const store = new InMemorySceneStore(root);

   const desktop = createArtboardNode({
    id: 'artboard-desktop',
    name: 'Desktop Preview',
    preset: 'desktop',
    stateLabel: 'Default State',
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    fill: '#0D0E12',
    layout: {
      direction: 'vertical',
      gap: 24,
      alignItems: 'stretch',
      justifyContent: 'start',
      padding: { top: 32, right: 48, bottom: 32, left: 48 },
    },
  });
  store.insertNode(desktop, 'root');

   const nav = createFrameNode({
    id: 'desktop-nav',
    name: 'Navbar',
    height: 64,
    fill: '#15171D',
    stroke: '#1F222A',
    strokeWidth: 1,
    cornerRadius: 12,
    layout: {
      direction: 'horizontal',
      gap: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: { top: 12, right: 24, bottom: 12, left: 24 },
    },
  });
  store.insertNode(nav, 'artboard-desktop');

  store.insertNode(
    createTextNode({
      id: 'nav-logo',
      text: projectName,
      fontSize: 18,
      fontWeight: 700,
      fill: '#FFFFFF',
    }),
    'desktop-nav'
  );

  const ctaBtn = createFrameNode({
    id: 'nav-cta',
    name: 'Primary Button',
    fill: '#10B981',
    cornerRadius: 8,
    layout: {
      direction: 'horizontal',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      padding: { top: 8, right: 16, bottom: 8, left: 16 },
    },
  });
  store.insertNode(ctaBtn, 'desktop-nav');
  store.insertNode(
    createTextNode({
      id: 'cta-label',
      text: 'Get Started',
      fontSize: 13,
      fontWeight: 600,
      fill: '#FFFFFF',
    }),
    'nav-cta'
  );

   const mobile = createArtboardNode({
    id: 'artboard-mobile',
    name: 'Mobile Preview',
    preset: 'mobile',
    stateLabel: 'Mobile Default',
    x: 1520,
    y: 0,
    width: 375,
    height: 812,
    fill: '#0D0E12',
    layout: {
      direction: 'vertical',
      gap: 16,
      alignItems: 'stretch',
      justifyContent: 'start',
      padding: { top: 20, right: 16, bottom: 20, left: 16 },
    },
  });
  store.insertNode(mobile, 'root');

  const mobileHeader = createFrameNode({
    id: 'mobile-header',
    name: 'Mobile Header',
    height: 48,
    fill: '#15171D',
    stroke: '#1F222A',
    strokeWidth: 1,
    cornerRadius: 8,
    layout: {
      direction: 'horizontal',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
    },
  });
  store.insertNode(mobileHeader, 'artboard-mobile');
  store.insertNode(
    createTextNode({
      id: 'mobile-title',
      text: projectName,
      fontSize: 15,
      fontWeight: 600,
      fill: '#FFFFFF',
    }),
    'mobile-header'
  );

   const tokens = {
    color: {
      background: { $value: '#0D0E12', $type: 'color' },
      surface: { $value: '#15171D', $type: 'color' },
      border: { $value: '#1F222A', $type: 'color' },
      primary: { $value: '#3B82F6', $type: 'color' },
      accent: { $value: '#10B981', $type: 'color' },
      text: { $value: '#FFFFFF', $type: 'color' },
    },
    spacing: {
      xs: { $value: 4, $type: 'dimension' },
      sm: { $value: 8, $type: 'dimension' },
      md: { $value: 16, $type: 'dimension' },
      lg: { $value: 24, $type: 'dimension' },
      xl: { $value: 32, $type: 'dimension' },
    },
    radius: {
      sm: { $value: 6, $type: 'dimension' },
      md: { $value: 10, $type: 'dimension' },
      lg: { $value: 16, $type: 'dimension' },
    },
  };

  const initialCommit: AgentCommit = {
    id: 'c-init',
    parentId: null,
    timestamp: new Date().toISOString(),
    author: {
      type: 'agent',
      client: 'vitra-cli',
      name: 'Vitra CLI',
    },
    intent: 'Initialize project with responsive Desktop and Mobile artboards',
    changes: {
      nodesAdded: [
        'root',
        'artboard-desktop',
        'desktop-nav',
        'nav-logo',
        'nav-cta',
        'cta-label',
        'artboard-mobile',
        'mobile-header',
        'mobile-title',
      ],
      nodesModified: [],
      nodesDeleted: [],
      tokensModified: [],
    },
  };

  const treeSha = await saveCommitSnapshot(dirPath, 'c-init', store.exportSnapshot());
  initialCommit.treeSha = treeSha || undefined;

  await saveVitraProject(dirPath, {
    manifest: {
      name: projectName,
      description: options.description ?? 'Created with Vitra Visual Runtime',
      defaultTheme: 'dark',
      artboardIds: ['artboard-desktop', 'artboard-mobile'],
    },
    store,
    tokens,
    history: [initialCommit],
  });

  await initRefs(dirPath, 'c-init');

  return dirPath;
}

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  convertFigmaJsonToVitra,
  convertPenpotJsonToVitra,
  convertVitraToFigmaJson,
  convertVitraToPenpotJson,
  saveVitraProject,
  loadVitraProject,
  FigmaDocumentResponse,
  FigmaNode,
  PenpotDocumentResponse,
  PenpotShape,
} from '@vitra/core';

export interface ImportOptions {
  format?: string;
  token?: string;
  out?: string;
  name?: string;
}

export async function importDesign(input: string, options: ImportOptions = {}): Promise<{
  outDir: string;
  format: string;
  artboardCount: number;
  extractedColors: string[];
  isWarning: boolean;
}> {
  if (input.endsWith('.fig')) {
    throw new Error(
      `"${input}" is a .fig binary container file.\n` +
      `Figma saves local files in a proprietary binary/Kiwi format rather than standard JSON.\n\n` +
      `To import your design into Vitra, you have two quick options:\n` +
      `  1. Direct Figma URL (No export needed):\n` +
      `     vitra import https://www.figma.com/design/<FILE_KEY>/... --token <YOUR_FIGMA_TOKEN>\n\n` +
      `  2. Export JSON via Figma plugin or REST API:\n` +
      `     • Use a free Figma plugin (e.g., "Figma to JSON" or "JSON Export")\n` +
      `     • Or run: curl -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/files/<FILE_KEY>" > design.json\n` +
      `     • Then run: vitra import design.json`
    );
  }

  let parsed: unknown;
  let defaultOutName = 'imported';

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const match = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) {
      throw new Error('Invalid Figma URL format. Expected: https://www.figma.com/design/<file-key>/<title>');
    }
    const fileKey = match[1];
    const token = options.token || process.env.FIGMA_TOKEN || process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        'Figma Personal Access Token required to fetch live designs.\n' +
        'Pass via --token <token> or set FIGMA_TOKEN environment variable.\n' +
        '(To create a token in Figma: Profile Settings -> Security -> Personal access tokens)'
      );
    }

    console.log(`\nFetching Figma design from API (file key: ${fileKey})...`);
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Figma API responded with status ${res.status} (${res.statusText}):\n${errBody}`);
    }

    parsed = await res.json();
    const docName = (parsed as { name?: string }).name;
    defaultOutName = docName ? docName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : fileKey;
  } else {
    const raw = await fs.readFile(path.resolve(process.cwd(), input), 'utf-8');
    parsed = JSON.parse(raw);
    defaultOutName = path.basename(input, path.extname(input));
  }

  const fmt = options.format ?? 'figma';
  let manifestName: string;
  let store: Awaited<ReturnType<typeof convertFigmaJsonToVitra>>['store'];
  let extractedColors: string[] = [];

  if (fmt === 'penpot') {
    const result = convertPenpotJsonToVitra(
      parsed as PenpotDocumentResponse | PenpotShape | PenpotShape[] | Record<string, unknown>,
      options.name
    );
    manifestName = result.manifestName;
    store = result.store;
    extractedColors = result.extractedColors;
  } else {
    const result = convertFigmaJsonToVitra(
      parsed as FigmaDocumentResponse | FigmaNode,
      options.name
    );
    manifestName = result.manifestName;
    store = result.store;
    extractedColors = result.extractedColors;
  }

  const outDir = options.out ?? defaultOutName + '.vitra';
  const resolvedOut = path.resolve(process.cwd(), outDir);

  await saveVitraProject(resolvedOut, {
    manifest: {
      schemaVersion: '1.0.0',
      name: manifestName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      defaultTheme: 'light',
    },
    store,
  });

  const rootChildren = store.getChildren('root');
  return {
    outDir: resolvedOut,
    format: fmt,
    artboardCount: rootChildren.length,
    extractedColors,
    isWarning: rootChildren.length === 0,
  };
}

export async function exportFigma(targetDir: string, outFile?: string): Promise<string> {
  const project = await loadVitraProject(path.resolve(process.cwd(), targetDir));
  const figmaJson = convertVitraToFigmaJson(project.store, project.manifest.name);

  const destination = outFile ?? path.basename(targetDir, '.vitra') + '.figma.json';
  const resolvedOut = path.resolve(process.cwd(), destination);
  await fs.writeFile(resolvedOut, JSON.stringify(figmaJson, null, 2), 'utf-8');
  return resolvedOut;
}

export async function exportPenpot(targetDir: string, outFile?: string): Promise<string> {
  const project = await loadVitraProject(path.resolve(process.cwd(), targetDir));
  const penpotJson = convertVitraToPenpotJson(project.store, project.manifest.name);

  const destination = outFile ?? path.basename(targetDir, '.vitra') + '.penpot.json';
  const resolvedOut = path.resolve(process.cwd(), destination);
  await fs.writeFile(resolvedOut, JSON.stringify(penpotJson, null, 2), 'utf-8');
  return resolvedOut;
}

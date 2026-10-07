import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseCssVariables, TokenTree, ParsedTokenResult } from '@vitra/tokens';

export interface TokensImportOptions {
  projectDir?: string;
  outFile?: string;
}

export interface TokensImportResult {
  sourceFile: string;
  destinationFile: string;
  totalParsed: number;
  categories: string[];
  themes: string[];
  tokens: {
    base: TokenTree;
    themes: Record<string, TokenTree>;
  };
}

/**
 * Ingests design tokens from a CSS file (e.g. globals.css) and writes
 * a standardized W3C DTCG tokens.json for the Vitra project.
 */
export async function importTokensFromCss(
  cssFilePath: string,
  options: TokensImportOptions = {}
): Promise<TokensImportResult> {
  const resolvedCssPath = path.resolve(process.cwd(), cssFilePath);

  if (!fs.existsSync(resolvedCssPath)) {
    throw new Error(`CSS file not found at path: ${resolvedCssPath}`);
  }

  const cssContent = fs.readFileSync(resolvedCssPath, 'utf-8');
  const parsed: ParsedTokenResult = parseCssVariables(cssContent);

  if (parsed.totalParsed === 0) {
    throw new Error(`No CSS custom properties (variables) found in ${cssFilePath}.`);
  }

   let destPath: string;
  if (options.outFile) {
    destPath = path.resolve(process.cwd(), options.outFile);
  } else {
    const projectDir = options.projectDir ? path.resolve(process.cwd(), options.projectDir) : process.cwd();
     if (projectDir.endsWith('.vitra')) {
      destPath = path.join(projectDir, 'tokens.json');
    } else if (fs.existsSync(path.join(projectDir, '.vitra'))) {
      destPath = path.join(projectDir, '.vitra', 'tokens.json');
    } else {
      destPath = path.join(projectDir, 'tokens.json');
    }
  }

  const tokenPayload = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    version: '1.0.0',
    source: path.basename(cssFilePath),
    updatedAt: new Date().toISOString(),
    tokens: parsed.base,
    themes: parsed.themes,
  };

   const parentDir = path.dirname(destPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(destPath, JSON.stringify(tokenPayload, null, 2), 'utf-8');

  const categories = Object.keys(parsed.base);
  const themes = Object.keys(parsed.themes);

  return {
    sourceFile: resolvedCssPath,
    destinationFile: destPath,
    totalParsed: parsed.totalParsed,
    categories,
    themes,
    tokens: {
      base: parsed.base,
      themes: parsed.themes,
    },
  };
}

export function formatTokensImportSummary(result: TokensImportResult): string {
  const lines: string[] = [
    `✨ Successfully imported design tokens from ${path.basename(result.sourceFile)}`,
    `   Destination: ${result.destinationFile}`,
    `   Total Variables: ${result.totalParsed}`,
    `   Categories: ${result.categories.join(', ') || 'none'}`,
    `   Themes Detected: ${result.themes.length > 0 ? result.themes.join(', ') : 'none (base only)'}`,
  ];
  return lines.join('\n');
}

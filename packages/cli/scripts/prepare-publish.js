import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliDir, '../..');

console.log('📦 Preparing packages/cli for publishing as "vitra-cli"...');

 if (fs.existsSync(path.join(repoRoot, 'LICENSE'))) {
  fs.copyFileSync(path.join(repoRoot, 'LICENSE'), path.join(cliDir, 'LICENSE'));
  console.log('✓ Copied LICENSE to packages/cli/LICENSE');
}

 const distDir = path.join(cliDir, 'dist');
if (fs.existsSync(distDir)) {
  function removeMapFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeMapFiles(fullPath);
      } else if (entry.name.endsWith('.map')) {
        fs.unlinkSync(fullPath);
      }
    }
  }
  removeMapFiles(distDir);
  console.log('✓ Removed all .map sourcemap files from dist/');
}

 const binPath = path.join(distDir, 'bin.js');
if (fs.existsSync(binPath)) {
  let content = fs.readFileSync(binPath, 'utf8');
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync(binPath, content, 'utf8');
  }
   content = content.replace(/\/\/#\s*sourceMappingURL=.*$/gm, '');
  fs.writeFileSync(binPath, content, 'utf8');
  try {
    fs.chmodSync(binPath, 0o755);
  } catch {}
  console.log('✓ Verified executable permissions and stripped sourcemap references from dist/bin.js');
}

 const pkgPath = path.join(cliDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const publishPkg = {
  name: 'vitra-cli',
  version: pkg.version || '0.1.0',
  description: 'The Universal Visual Runtime & Design Version Control Protocol',
  author: 'ruhamabek',
  license: 'AGPL-3.0',
  homepage: 'https://github.com/ruhamabek/Vitra',
  repository: {
    type: 'git',
    url: 'git+https://github.com/ruhamabek/Vitra.git',
  },
  keywords: [
    'vitra',
    'design',
    'canvas',
    'penpot',
    'figma',
    'version-control',
    'wcag',
    'audit',
    'ai-agents'
  ],
  type: 'module',
  bin: {
    vitra: './dist/bin.js',
  },
  files: [
    'dist/bin.js',
    'README.md',
    'LICENSE'
  ],
  dependencies: {
    '@resvg/resvg-js': '^2.6.2',
    'lucide': '^1.48.0',
    'ws': '^8.18.0',
    'zod': '^3.23.8'
  }
};

fs.writeFileSync(pkgPath, JSON.stringify(publishPkg, null, 2) + '\n', 'utf8');
console.log('✓ Updated packages/cli/package.json for standalone "vitra-cli" publication.');

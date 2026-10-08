import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '..');
const distDir = path.join(pluginRoot, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

 fs.copyFileSync(
  path.join(pluginRoot, 'src', 'ui.css'),
  path.join(distDir, 'ui.css')
);

 const distJsDir = path.join(distDir, 'js');
if (!fs.existsSync(distJsDir)) {
  fs.mkdirSync(distJsDir, { recursive: true });
}
fs.copyFileSync(
  path.join(pluginRoot, 'src', 'js', 'ui.js'),
  path.join(distJsDir, 'ui.js')
);

 const uiHtml = fs.readFileSync(path.join(pluginRoot, 'src', 'ui.html'), 'utf-8');
const uiCss = fs.readFileSync(path.join(pluginRoot, 'src', 'ui.css'), 'utf-8');
const uiJs = fs.readFileSync(path.join(pluginRoot, 'src', 'js', 'ui.js'), 'utf-8');
const bundledHtml = uiHtml
  .replace('<link rel="stylesheet" href="ui.css">', `<style>\n${uiCss}\n  </style>`)
  .replace('<script src="js/ui.js"></script>', `<script>\n${uiJs}\n  </script>`);
fs.writeFileSync(path.join(distDir, 'ui.html'), bundledHtml, 'utf-8');

 fs.copyFileSync(
  path.join(pluginRoot, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

async function bundle() {
  await build({
    build: {
      lib: {
        entry: path.join(pluginRoot, 'src', 'code.ts'),
        name: 'code',
        formats: ['iife'],
        fileName: () => 'code.js',
      },
      outDir: distDir,
      emptyOutDir: false,
      minify: false,
    },
    configFile: false,
  });

  console.log('✓ Successfully bundled apps/figma-plugin/dist/code.js');
  console.log('✓ Successfully generated apps/figma-plugin/dist/ui.html and manifest.json');
}

bundle().catch((err) => {
  console.error(err);
  process.exit(1);
});

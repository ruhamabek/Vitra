import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '..');
const distDir = path.join(pluginRoot, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

 fs.copyFileSync(
  path.join(pluginRoot, 'src', 'index.html'),
  path.join(distDir, 'index.html')
);

 fs.copyFileSync(
  path.join(pluginRoot, 'src', 'style.css'),
  path.join(distDir, 'style.css')
);

 const distJsDir = path.join(distDir, 'js');
if (!fs.existsSync(distJsDir)) {
  fs.mkdirSync(distJsDir, { recursive: true });
}
fs.copyFileSync(
  path.join(pluginRoot, 'src', 'js', 'index.js'),
  path.join(distJsDir, 'index.js')
);

 fs.copyFileSync(
  path.join(pluginRoot, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

 function generateIcon() {
  const require = createRequire(import.meta.url);
  const { Resvg } = require('/home/sapphire/Vitra/packages/renderer/node_modules/@resvg/resvg-js');
  const svg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="56" height="56" rx="14" fill="#0066FF"/>
    <path d="M30 11L18 29H28L26 45L38 27H28L30 11Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 56 } });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(path.join(distDir, 'icon.png'), pngData);
  fs.writeFileSync(path.join(pluginRoot, 'icon.png'), pngData);
}

async function bundle() {
  generateIcon();

  const vitePath = '/home/sapphire/Vitra/node_modules/.pnpm/vite@5.4.21_@types+node@22.20.3/node_modules/vite/index.cjs';
  const require = createRequire(import.meta.url);
  const { build } = require(vitePath);

  await build({
    build: {
      lib: {
        entry: path.join(pluginRoot, 'src/plugin.ts'),
        name: 'plugin',
        formats: ['iife'],
        fileName: () => 'plugin.js',
      },
      outDir: distDir,
      emptyOutDir: false,
      minify: false,
    },
    configFile: false,
  });

  console.log('✓ Successfully bundled apps/penpot-plugin/dist/plugin.js');
  console.log('✓ Successfully generated apps/penpot-plugin/dist/index.html, manifest.json, and icon.png (56x56)');
}

bundle().catch((err) => {
  console.error(err);
  process.exit(1);
});

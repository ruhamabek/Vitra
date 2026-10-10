import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import * as path from 'node:path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@vitra/core': path.resolve(__dirname, '../../packages/core/src/browser.ts'),
      '@vitra/codegen': path.resolve(__dirname, '../../packages/codegen/src/index.ts'),
      '@vitra/layout': path.resolve(__dirname, '../../packages/layout/src/index.ts'),
      '@vitra/tokens': path.resolve(__dirname, '../../packages/tokens/src/index.ts'),
    },
  },
  build: {
    target: 'esnext',
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true,
      },
    },
  },
  server: {
    port: 5173,
  },
});

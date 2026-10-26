import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error Node-only development boundary.
import { designPreviewPlugin } from './scripts/design-preview.mjs';

export default defineConfig(({ command }) => ({
  plugins: [designPreviewPlugin(command === 'serve' && process.env.MOSAIC_DESIGN_PRIVATE === '1'), react()],
  base: './',
  cacheDir: '.design-cache',
  server: {
    host: '127.0.0.1', port: 5186, strictPort: true, cors: false,
    fs: { deny: ['**/.private-evidence/**', '**/_interview_raw_extracts/**', '**/.git', '**/.git/**', '**/.aws/**', '**/.agents/**', '**/.env*', '**/*.{crt,pem}'] },
  },
  build: { outDir: 'dist-designs', rollupOptions: { input: 'designs.html' }, sourcemap: false },
}));

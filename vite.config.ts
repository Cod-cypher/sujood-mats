import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({isSsrBuild}) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // SSR bundle (src/entry-server.tsx) is self-contained CommonJS so the
    // esbuild-bundled dist/server.cjs can require() it on any Node version.
    // Build-only: in dev, ssrLoadModule must keep dependencies external.
    ssr: isSsrBuild ? { noExternal: true } : undefined,
    build: isSsrBuild
      ? {
          rollupOptions: {
            output: { format: 'cjs', entryFileNames: '[name].cjs' },
          },
        }
      : {},
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

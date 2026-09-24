import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { port: Number(process.env.PORT) || 5173, host: true },
});

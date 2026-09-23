import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Cambia a '/<nombre-del-repo>/' si lo publicas en GitHub Pages de un repo
  // que no sea alejandrorevillaEng.github.io.
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
  // El puerto lo decide quien arranque el servidor (PORT); 5173 solo es el
  // valor por defecto cuando se lanza a mano.
  server: { port: Number(process.env.PORT) || 5173, host: true },
});

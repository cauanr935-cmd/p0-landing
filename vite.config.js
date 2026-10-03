import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        diario: resolve(root, 'diario.html'),
        registro1: resolve(root, 'registro-1.html'),
        registro2: resolve(root, 'registro-2.html'),
        registro3: resolve(root, 'registro-3.html'),
        fundadores: resolve(root, 'fundadores.html'),
      },
    },
  },
});

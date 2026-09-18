import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        fundadores: resolve(root, 'fundadores.html'),
        newsletter: resolve(root, 'newsletter.html'),
      },
    },
  },
});

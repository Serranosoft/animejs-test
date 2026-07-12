import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        overview: resolve(__dirname, 'overview.html'),
        defensa: resolve(__dirname, 'defensa/index.html'),
      },
    },
  },
});


import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: '/voxpop/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: r('./index.html'),
        play: r('./play.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/tone') || id.includes('standardized-audio-context')) return 'tone';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
          if (id.includes('/src/world/') || id.includes('/src/shared/') || id.includes('/src/data/')) return 'world';
        },
      },
    },
  },
  server: { host: true },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads the level-2/level-3 result files and src/data/repo.json (written by export.py) at build time.
export default defineConfig({
  base: '/rag-foundation/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});

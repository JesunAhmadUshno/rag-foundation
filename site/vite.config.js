import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads results/*.json, experiments/questions_deep.json and src/data/repo.json (written by export.py) at build time.
export default defineConfig({
  base: '/rag-foundation/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});

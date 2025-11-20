import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    // Output to root dist directory (relative to frontend, one level up)
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});



import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite publicar la app en cualquier subcarpeta (GitHub Pages: /KRISABELL/app/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 }
});

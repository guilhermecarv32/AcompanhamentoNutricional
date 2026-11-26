import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/data/**', '**/node_modules/**'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

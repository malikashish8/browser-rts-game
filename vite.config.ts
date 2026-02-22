import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/browser-rts-game/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

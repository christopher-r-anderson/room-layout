import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const defaultPagesBasePath = '/room-layout/'
const productionBasePath = process.env.VITE_BASE_PATH ?? defaultPagesBasePath

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? productionBasePath : '/',
  plugins: [react(), tailwindcss()],
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    setupFiles: ['./src/test/vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

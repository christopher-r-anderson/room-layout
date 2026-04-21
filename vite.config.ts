import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const defaultPagesBasePath = '/room-layout/'
const productionBasePath = process.env.VITE_BASE_PATH ?? defaultPagesBasePath

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? productionBasePath : '/',
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

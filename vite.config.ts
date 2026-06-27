import {
  configDefaults,
  coverageConfigDefaults,
  defineConfig,
} from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { analyzer, unstableRolldownAdapter } from 'vite-bundle-analyzer'
import { fileURLToPath, URL } from 'node:url'

const defaultPagesBasePath = '/room-layout/'
const productionBasePath = process.env.VITE_BASE_PATH ?? defaultPagesBasePath

// Opt-in bundle analysis: `pnpm analyze-bundle` sets ANALYZE and emits a
// self-contained interactive report at bundle-report.html (gitignored). Vite 8
// bundles with Rolldown, so the analyzer needs its (experimental) Rolldown
// adapter rather than the Rollup/CLI paths.
const analyzeBundle = Boolean(process.env.ANALYZE)

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? productionBasePath : '/',
  plugins: [
    react(),
    tailwindcss(),
    ...(analyzeBundle
      ? [
          unstableRolldownAdapter(
            analyzer({
              analyzerMode: 'static',
              fileName: 'bundle-report',
              defaultSizes: 'gzip',
              openAnalyzer: false,
            }),
          ),
        ]
      : []),
  ],
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    setupFiles: ['./src/test/vitest.setup.ts'],
    // Coverage is a read-only map for planning, not a gate: `pnpm coverage`
    // prints it, but there are no thresholds and it stays out of preflight.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/test/**',
        'src/**/*.bench.ts',
        'src/**/scene-test-support.ts',
        // Vendored shadcn/base-ui primitives — testing them tests the library.
        'src/shared/ui/**',
      ],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'three'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

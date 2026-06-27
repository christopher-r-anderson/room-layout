import {
  configDefaults,
  coverageConfigDefaults,
  defineConfig,
} from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { analyzer, unstableRolldownAdapter } from 'vite-bundle-analyzer'
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'

const defaultPagesBasePath = '/room-layout/'
const productionBasePath = process.env.VITE_BASE_PATH ?? defaultPagesBasePath

// Inject a modulepreload hint for the lazily-imported engine chunk so it
// downloads in parallel with the shell rather than waiting for React to mount and
// trigger the dynamic import. Module-map dedup means the later import() reuses the
// preloaded module — no double download. The chunk name is hashed, so the hint is
// resolved from the emitted bundle at build time.
function preloadEngineChunk(): Plugin {
  let base = '/'
  return {
    name: 'preload-engine-chunk',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const engineFile = Object.keys(ctx.bundle ?? {}).find((fileName) =>
          /scene-canvas-[\w-]+\.js$/.test(fileName),
        )
        if (!engineFile) {
          return []
        }
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'modulepreload',
              crossorigin: '',
              href: base + engineFile,
            },
            injectTo: 'head',
          },
        ]
      },
    },
  }
}

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
    preloadEngineChunk(),
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

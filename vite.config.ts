import {
  configDefaults,
  coverageConfigDefaults,
  defineConfig,
} from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { lingui, linguiTransformerBabelPreset } from '@lingui/vite-plugin'
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
    // @vitejs/plugin-react v6 (Vite 8) transforms JSX with Oxc, not Babel, so
    // Lingui's compile-time macros need their own Babel pass. `lingui()` also
    // turns `.po` catalog imports into compiled messages (no runtime ICU parser).
    lingui(),
    babel({ presets: [linguiTransformerBabelPreset()] }),
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
  build: {
    rolldownOptions: {
      output: {
        // Give lazily-imported locale catalogs a stable `locale-*` name so the
        // bundle-budget gate can match them with one pattern instead of a
        // per-locale entry.
        chunkFileNames(chunk) {
          // Normalize separators: module IDs use backslashes on Windows.
          const id = (chunk.facadeModuleId ?? '').replaceAll('\\', '/')
          return /\/locales\/[^/]+\.po$/.test(id)
            ? 'assets/locale-[name]-[hash].js'
            : 'assets/[name]-[hash].js'
        },
      },
    },
  },
  test: {
    // .claude holds agent worktrees (full repo copies) and session state — never
    // glob test files out of it.
    exclude: [...configDefaults.exclude, 'e2e/**', '.claude/**'],
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
        'src/**/scene-test-support.ts',
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

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import vitest from '@vitest/eslint-plugin'
import i18next from 'eslint-plugin-i18next'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

const RUNTIME_TEST_IMPORT_GROUP = ['@/test', '@/test/**']
const RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP = [
  '@/app',
  '@/app/**',
  '@/features',
  '@/features/**',
  '@/core',
  '@/core/**',
  '@/scene',
  '@/scene/**',
]
const RUNTIME_NON_TEST_IGNORES = [
  'src/**/*.test.{ts,tsx}',
  'src/**/*.spec.{ts,tsx}',
]

const PARENT_RELATIVE_IMPORT_REGEX = '^\\.\\.'
const PARENT_RELATIVE_IMPORT_MESSAGE =
  'Prefer @/ alias imports over parent-relative path traversals.'

// The scene layer is the renderer adapter: it implements the ports core owns
// (scene-services) and reads core state directly, so imports of @/scene are
// banned everywhere except app's single mount point (@/scene/scene).
const SCENE_IMPORT_GROUP = ['@/scene', '@/scene/**']
const SCENE_IMPORT_MESSAGE =
  'The scene layer is the renderer adapter. Drive it through @/core/scene-commands; only app mounts @/scene/scene.'
const RESTRICT_SCENE_IMPORTS_FOR_APP = '^@/scene/(?!scene$).+'

// Because no-restricted-imports is replaced wholesale by later matching blocks,
// these paths are spread into every layer block below (and a base block covers
// the files no layer block matches).
const RESTRICTED_ZUSTAND_IMPORT_PATHS = [
  {
    name: 'zustand/traditional',
    message:
      'Use create() from "zustand"; wrap fresh-object selectors in useShallow from "zustand/react/shallow".',
  },
  {
    name: 'zustand/vanilla',
    message:
      'Create stores with create() from "zustand". The bound hook is also the imperative store handle (getState/setState/subscribe).',
  },
]

// Features read narrow selector hooks and sanctioned imperative getters; the
// generic bound store hook (whose getState/subscribe surface belongs to core
// operations and reconcilers) stays out of feature code. Only stores that
// export their bound hook are listed; the rest are module-private already.
const FEATURE_RESTRICTED_BOUND_HOOK_PATHS = [
  ['scene-document-store', 'useSceneDocumentStore'],
  ['scene-session-store', 'useSceneSessionStore'],
  ['selection-store', 'useSelectionStore'],
  ['editor-lifecycle-store', 'useEditorLifecycleStore'],
  ['assets-store', 'useAssetsStore'],
  ['collection-loading-store', 'useCollectionLoadingStore'],
].map(([storeModule, boundHook]) => ({
  name: `@/core/stores/${storeModule}`,
  importNames: [boundHook],
  message: `Import narrow selector hooks or sanctioned getters from ${storeModule}; the generic bound hook (getState/subscribe) belongs to core operations.`,
}))

export default defineConfig([
  // Flat config replaces rule values from later matching blocks.
  // Keep overlapping blocks self-contained.
  globalIgnores([
    'dist',
    'coverage',
    'node_modules',
    'assets-source',
    'public/models',
    '.agents',
    '.claude',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // i18n guard: fail on hardcoded JSX text and on the user-facing string
  // attributes (the ones screen readers and tooltips surface, which no visual
  // review catches) so new UI strings go through Lingui macros. Other attributes
  // are not checked, to avoid noise; tests are exempt. shared/ui is covered
  // too — it is project-owned, so freshly scaffolded components localize their
  // literals as part of install. `msg`/`t`/<Trans> usages are not literals and
  // pass.
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: ['aria-label', 'title', 'placeholder', 'alt'],
          },
        },
      ],
    },
  },

  // Vitest test-quality guardrails. Scoped to unit/component tests (Playwright
  // specs under e2e/ are not vitest). Catches stray .only, assertion-less tests,
  // duplicate titles, and malformed expect() — patterns lint can't otherwise see.
  {
    files: ['src/**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/expect-expect': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-conditional-tests': 'error',
    },
  },

  // Base zustand-API ban for files no layer block below matches (main.tsx,
  // src/test, colocated tests); the layer blocks re-state it in their paths.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: RESTRICTED_ZUSTAND_IMPORT_PATHS },
      ],
    },
  },

  // Domain leaf: the pure model vocabulary. The lowest layer — every other layer
  // may import it; it imports nothing internal.
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    ignores: RUNTIME_NON_TEST_IGNORES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: RESTRICTED_ZUSTAND_IMPORT_PATHS,
          patterns: [
            {
              group: [
                '@/app',
                '@/app/**',
                '@/features',
                '@/features/**',
                '@/core',
                '@/core/**',
                '@/scene',
                '@/scene/**',
                '@/shared',
                '@/shared/**',
              ],
              message:
                'src/domain is the lowest layer and must not import from app, features, core, scene, or shared.',
            },
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },

  // Scene boundaries: the renderer adapter depends downward on core/shared/
  // domain and is never imported back (see SCENE_IMPORT_GROUP).
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    ignores: RUNTIME_NON_TEST_IGNORES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: RESTRICTED_ZUSTAND_IMPORT_PATHS,
          patterns: [
            {
              group: ['@/app', '@/app/**', '@/features', '@/features/**'],
              message:
                'src/scene must not import from src/app or src/features.',
            },
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },

  // Editor-state boundaries.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ignores: RUNTIME_NON_TEST_IGNORES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: RESTRICTED_ZUSTAND_IMPORT_PATHS,
          patterns: [
            {
              group: ['@/app', '@/app/**', '@/features', '@/features/**'],
              message: 'src/core must not import from src/app or src/features.',
            },
            {
              group: ['@/shared/ui', '@/shared/ui/**'],
              message: 'src/core must not import UI component modules.',
            },
            {
              group: SCENE_IMPORT_GROUP,
              message:
                'src/core owns the engine ports (scene-commands, scene-services); it must not import the scene adapter.',
            },
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },

  // Feature runtime boundaries.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: RUNTIME_NON_TEST_IGNORES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...RESTRICTED_ZUSTAND_IMPORT_PATHS,
            ...FEATURE_RESTRICTED_BOUND_HOOK_PATHS,
          ],
          patterns: [
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              group: ['@/app', '@/app/**'],
              message:
                'src/features must not import from src/app. Move shared seams to src/shared (or another neutral layer) and keep app as composition-only.',
            },
            {
              group: SCENE_IMPORT_GROUP,
              message: SCENE_IMPORT_MESSAGE,
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
            {
              regex: '^@/features/',
              message:
                'Features must not import other features. Move shared coordination/state to src/core (or pure utilities to src/shared); features depend downward only.',
            },
          ],
        },
      ],
    },
  },

  // App runtime boundaries.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    ignores: RUNTIME_NON_TEST_IGNORES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: RESTRICTED_ZUSTAND_IMPORT_PATHS,
          patterns: [
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              regex: RESTRICT_SCENE_IMPORTS_FOR_APP,
              message:
                'src/app mounts @/scene/scene and drives everything else through @/core/scene-commands.',
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },

  // Shared is the reusable kit/infra tier: fully decoupled from the runtime
  // layers and from the model (architecture.md: shared carries no model
  // knowledge). One uniform block — no shared subdirectory gets a looser rule.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    ignores: RUNTIME_NON_TEST_IGNORES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: RESTRICTED_ZUSTAND_IMPORT_PATHS,
          patterns: [
            {
              group: [
                ...RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
                '@/domain',
                '@/domain/**',
              ],
              message:
                'src/shared must not import from app, features, core, scene, or domain (shared carries no model knowledge).',
            },
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },
])

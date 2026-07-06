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

const SCENE_ALLOWED_RUNTIME_IMPORTS =
  'scene-commands$|scene\\.types$|collection-registry$'
const RESTRICT_SCENE_IMPORTS_FOR_FEATURES_AND_SHARED = `^@/scene/(?!${SCENE_ALLOWED_RUNTIME_IMPORTS}).+`
const RESTRICT_SCENE_IMPORTS_FOR_APP = `^@/scene/(?!scene$|${SCENE_ALLOWED_RUNTIME_IMPORTS}).+`

const RESTRICT_EDITOR_STATE_IMPORTS_FOR_SCENE = '^@/core/(?!scene-contracts$).+'
const RESTRICT_EDITOR_STATE_IMPORTS_FOR_SCENE_TESTS =
  '^@/core/(?!scene-contracts$|scene-test-support$).+'

// Because no-restricted-imports is replaced wholesale by later matching blocks,
// these paths are spread into every layer block below (and a base block covers
// the files no layer block matches).
const RESTRICTED_ZUSTAND_IMPORT_PATHS = [
  {
    name: 'zustand/traditional',
    message:
      'The equality-fn store APIs are retired. Use create() from "zustand"; wrap fresh-object selectors in useShallow from "zustand/react/shallow".',
  },
  {
    name: 'zustand/vanilla',
    message:
      'Create stores with create() from "zustand". The bound hook is also the imperative store handle (getState/setState/subscribe).',
  },
]

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

  // Scene runtime boundaries.
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    ignores: ['src/scene/**/*.test.{ts,tsx}', 'src/scene/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...RESTRICTED_ZUSTAND_IMPORT_PATHS,
            {
              name: '@/core',
              message:
                'Scene code must import core only via @/core/scene-contracts.',
            },
          ],
          patterns: [
            {
              group: ['@/app', '@/app/**', '@/features', '@/features/**'],
              message:
                'src/scene must not import from src/app or src/features.',
            },
            {
              regex: RESTRICT_EDITOR_STATE_IMPORTS_FOR_SCENE,
              message:
                'Scene code must import core only via @/core/scene-contracts.',
            },
          ],
        },
      ],
    },
  },

  // Scene test boundaries.
  {
    files: ['src/scene/**/*.test.{ts,tsx}', 'src/scene/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...RESTRICTED_ZUSTAND_IMPORT_PATHS,
            {
              name: '@/core',
              message:
                'Scene tests must import core via @/core/scene-contracts or @/core/scene-test-support only.',
            },
          ],
          patterns: [
            {
              group: ['@/app', '@/app/**', '@/features', '@/features/**'],
              message:
                'src/scene must not import from src/app or src/features.',
            },
            {
              regex: RESTRICT_EDITOR_STATE_IMPORTS_FOR_SCENE_TESTS,
              message:
                'Scene tests must import core via @/core/scene-contracts or @/core/scene-test-support only.',
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
              group: ['@/scene/internal', '@/scene/internal/**'],
              message:
                'src/core must not reach into scene internals; use the scene public surface (scene-commands, scene.types, collection-registry, scene-test-support).',
            },
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
          ],
        },
      ],
    },
  },

  // Shared UI primitives are fully decoupled from runtime layers.
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
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
              ],
              message:
                'Shared UI primitives must not import app, features, core, or scene modules.',
            },
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
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
          paths: RESTRICTED_ZUSTAND_IMPORT_PATHS,
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
              regex: RESTRICT_SCENE_IMPORTS_FOR_FEATURES_AND_SHARED,
              message:
                'src/features should import scene only via approved scene contract modules.',
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
                'src/app should import scene only via approved scene contract modules.',
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

  // Shared runtime boundaries (excluding shared/ui, which has stricter rules).
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    ignores: ['src/shared/ui/**', ...RUNTIME_NON_TEST_IGNORES],
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
              regex: RESTRICT_SCENE_IMPORTS_FOR_FEATURES_AND_SHARED,
              message:
                'src/shared should import scene only via approved scene contract modules.',
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

  // shared/hooks boundaries. This remains self-contained because it overlaps the
  // broader shared runtime block.
  {
    files: ['src/shared/hooks/**/*.{ts,tsx}'],
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
              group: RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
              message:
                'src/shared/hooks is a low-level shared layer and must not import from app, features, core, or scene modules.',
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

  // shared/providers boundaries. This remains self-contained because it overlaps
  // the broader shared runtime block.
  {
    files: ['src/shared/providers/**/*.{ts,tsx}'],
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
              group: RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
              message:
                'src/shared/providers is a low-level shared layer and must not import from app, features, core, or scene modules.',
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

  // shared/messages boundaries. This remains self-contained because it overlaps
  // the broader shared runtime block.
  {
    files: ['src/shared/messages/**/*.{ts,tsx}'],
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
              group: RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
              message:
                'src/shared/messages is a low-level shared layer and must not import from app, features, core, or scene modules.',
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

  // shared/lib boundaries. This remains self-contained because it overlaps the
  // broader shared runtime block.
  {
    files: ['src/shared/lib/**/*.{ts,tsx}'],
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
              group: [
                '@/app',
                '@/app/**',
                '@/features',
                '@/features/**',
                '@/core',
                '@/core/**',
              ],
              message:
                'src/shared/lib must not import from app, features, or core modules.',
            },
            {
              regex: RESTRICT_SCENE_IMPORTS_FOR_FEATURES_AND_SHARED,
              message:
                'src/shared should import scene only via approved scene contract modules.',
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

  // shared/layout boundaries. This remains self-contained because it overlaps
  // the broader shared runtime block.
  {
    files: ['src/shared/layout/**/*.{ts,tsx}'],
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
              regex: RESTRICT_SCENE_IMPORTS_FOR_FEATURES_AND_SHARED,
              message:
                'src/shared should import scene only via approved scene contract modules.',
            },
            {
              regex: PARENT_RELATIVE_IMPORT_REGEX,
              message: PARENT_RELATIVE_IMPORT_MESSAGE,
            },
            {
              group: ['@/app/chrome', '@/app/chrome/**'],
              message:
                'src/shared/layout is lower-level layout infrastructure and must not import from src/app/chrome.',
            },
          ],
        },
      ],
    },
  },
])

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

const RUNTIME_TEST_IMPORT_GROUP = ['@/test', '@/test/**']
const RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP = [
  '@/app',
  '@/app/**',
  '@/features',
  '@/features/**',
  '@/editor-state',
  '@/editor-state/**',
  '@/scene',
  '@/scene/**',
]
const RUNTIME_NON_TEST_IGNORES = [
  'src/**/*.test.{ts,tsx}',
  'src/**/*.spec.{ts,tsx}',
  'src/**/*.bench.ts',
]

const PARENT_RELATIVE_IMPORT_REGEX = '^\\.\\.'
const PARENT_RELATIVE_IMPORT_MESSAGE =
  'Prefer @/ alias imports over parent-relative path traversals.'

const SCENE_ALLOWED_RUNTIME_IMPORTS =
  'scene-commands$|scene\\.types$|objects/furniture\\.types$|objects/furniture-catalog$'
const RESTRICT_SCENE_IMPORTS_FOR_FEATURES_AND_SHARED = `^@/scene/(?!${SCENE_ALLOWED_RUNTIME_IMPORTS}).+`
const RESTRICT_SCENE_IMPORTS_FOR_APP = `^@/scene/(?!scene$|${SCENE_ALLOWED_RUNTIME_IMPORTS}).+`

const RESTRICT_EDITOR_STATE_IMPORTS_FOR_SCENE =
  '^@/editor-state/(?!scene-contracts$).+'
const RESTRICT_EDITOR_STATE_IMPORTS_FOR_SCENE_TESTS =
  '^@/editor-state/(?!scene-contracts$|scene-test-support$).+'

export default defineConfig([
  // Flat config replaces rule values from later matching blocks.
  // Keep overlapping blocks self-contained.
  globalIgnores([
    'dist',
    'node_modules',
    'assets-source',
    'public/models',
    'public/basis',
    '.agents',
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

  // Scene runtime boundaries.
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    ignores: ['src/scene/**/*.test.{ts,tsx}', 'src/scene/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/editor-state',
              message:
                'Scene code must import editor-state only via @/editor-state/scene-contracts.',
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
                'Scene code must import editor-state only via @/editor-state/scene-contracts.',
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
            {
              name: '@/editor-state',
              message:
                'Scene tests must import editor-state via @/editor-state/scene-contracts or @/editor-state/scene-test-support only.',
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
                'Scene tests must import editor-state via @/editor-state/scene-contracts or @/editor-state/scene-test-support only.',
            },
          ],
        },
      ],
    },
  },

  // Editor-state boundaries.
  {
    files: ['src/editor-state/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/**', '@/features', '@/features/**'],
              message:
                'src/editor-state must not import from src/app or src/features.',
            },
            {
              group: ['@/shared/ui', '@/shared/ui/**'],
              message: 'src/editor-state must not import UI component modules.',
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
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app',
                '@/app/**',
                '@/features',
                '@/features/**',
                '@/editor-state',
                '@/editor-state/**',
                '@/scene',
                '@/scene/**',
              ],
              message:
                'Shared UI primitives must not import app, features, editor-state, or scene modules.',
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
              regex: '^@/features/[^/]+/.+',
              message:
                'Cross-feature deep imports should go through a feature public API (index.ts). Currently a warning while auditing dependencies.',
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
          patterns: [
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              group: RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
              message:
                'src/shared/hooks is a low-level shared layer and must not import from app, features, editor-state, or scene modules.',
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
          patterns: [
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              group: RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
              message:
                'src/shared/providers is a low-level shared layer and must not import from app, features, editor-state, or scene modules.',
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
          patterns: [
            {
              group: RUNTIME_TEST_IMPORT_GROUP,
              message: 'Runtime code must not import from src/test.',
            },
            {
              group: RUNTIME_APP_FEATURE_EDITOR_SCENE_IMPORT_GROUP,
              message:
                'src/shared/messages is a low-level shared layer and must not import from app, features, editor-state, or scene modules.',
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
                '@/editor-state',
                '@/editor-state/**',
              ],
              message:
                'src/shared/lib must not import from app, features, or editor-state modules.',
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

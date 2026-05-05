import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'assets-source',
    'public/models',
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

  // scene/ must never import from app/. Dependency direction is one-way.
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/**'],
              message:
                'src/scene must not import from src/app. Dependency direction is app → scene only.',
            },
          ],
        },
      ],
    },
  },

  // App-side code may import only approved scene contract modules.
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/App.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/scene/internal', '@/scene/internal/**'],
              message:
                'Scene internal utilities are not part of the public API. Import only from: @/scene/scene.types, @/scene/objects/furniture.types, or @/scene/objects/furniture-catalog.',
            },
          ],
        },
      ],
    },
  },
])

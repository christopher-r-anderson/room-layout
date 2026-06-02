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

  // scene/ must never import from app/. Dependency direction is one-way.
  // scene/ must import editor-state only via @/editor-state/scene-contracts.
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
              group: ['@/app', '@/app/**'],
              message:
                'src/scene must not import from src/app. Dependency direction is app → scene only.',
            },
            {
              // Block all editor-state modules except scene-contracts.
              // When adding new store files, add them to this list.
              group: [
                '@/editor-state/dialog-store',
                '@/editor-state/editor-runtime-store',
                '@/editor-state/scene-state-store',
                '@/editor-state/selection-meta-store',
                '@/editor-state/store-types',
                '@/editor-state/types',
                '@/editor-state/types/**',
                '@/editor-state/index',
              ],
              message:
                'Scene code must import editor-state only via @/editor-state/scene-contracts.',
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
                'Scene internal utilities are not part of the public API. Import only from: @/scene/scene.types, @/scene/scene-commands, @/scene/objects/furniture.types, or @/scene/objects/furniture-catalog.',
            },
          ],
        },
      ],
    },
  },

  // editor-state/ must not import from app/ or components/.
  {
    files: ['src/editor-state/**/*.{ts,tsx}'],
    ignores: ['src/editor-state/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/**'],
              message:
                'src/editor-state must not import from src/app. Move shared types to src/editor-state/types/.',
            },
            {
              group: ['@/components', '@/components/**'],
              message: 'src/editor-state must not import React UI components.',
            },
          ],
        },
      ],
    },
  },

  // Controllers must not import UI components or overlay/view modules.
  {
    files: ['src/app/controllers/**/*.{ts,tsx}'],
    ignores: ['src/app/controllers/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components', '@/components/**'],
              message:
                'Controllers must not import UI components. They coordinate state and return data/callbacks.',
            },
            {
              group: ['@/app/overlay', '@/app/overlay/**'],
              message: 'Controllers must not import overlay components.',
            },
            {
              group: [
                '@/app/selection/selected-actions-view',
                '@/app/selection/selected-details-view',
                '@/app/selection/selection-tools-other',
              ],
              message: 'Controllers must not import view components.',
            },
          ],
        },
      ],
    },
  },

  // Pure view components must not import stores, controllers, contexts, or app hooks.
  {
    files: [
      'src/app/selection/selected-actions-view.{ts,tsx}',
      'src/app/selection/selected-details-view.{ts,tsx}',
      'src/app/selection/selection-tools-other.{ts,tsx}',
      'src/app/selection/delete-confirmation-dialog.{ts,tsx}',
      'src/app/selection/start-over-confirmation-dialog.{ts,tsx}',
      'src/app/history/history-tools.{ts,tsx}',
      'src/app/overlay/top-header-desktop.{ts,tsx}',
      'src/app/overlay/top-header-mobile.{ts,tsx}',
      'src/app/overlay/room-controls.{ts,tsx}',
      'src/app/overlay/room-surface-content.{ts,tsx}',
      'src/app/overlay/share-scene-button.{ts,tsx}',
      'src/app/overlay/start-over-button.{ts,tsx}',
      'src/app/overlay/header-more-actions-drawer.{ts,tsx}',
      'src/app/overlay/room-drawer.{ts,tsx}',
      'src/app/overlay/room-sidebar.{ts,tsx}',
      'src/app/scene-panel/announcer.{ts,tsx}',
      'src/app/startup/initialization-error.{ts,tsx}',
      'src/app/startup/initialization-progress.{ts,tsx}',
      'src/app/camera/camera-tools-view.{ts,tsx}',
      'src/app/project-info/asset-attribution.{ts,tsx}',
      'src/app/project-info/project-info-button.{ts,tsx}',
      'src/app/project-info/project-info-dialog.{ts,tsx}',
      'src/app/catalog/catalog-add-button.{ts,tsx}',
      'src/app/catalog/catalog-drawer.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/editor-state', '@/editor-state/**'],
              message:
                'Pure view components must not import from editor-state stores. Receive state via props.',
            },
            {
              group: ['@/app/controllers', '@/app/controllers/**'],
              message:
                'Pure view components must not import controllers. Receive callbacks via props.',
            },
            {
              group: ['@/app/contexts', '@/app/contexts/**'],
              message:
                'Pure view components must not import app contexts. Receive context values via props from a connected wrapper.',
            },
            {
              group: ['@/app/hooks', '@/app/hooks/**'],
              message:
                'Pure view components must not import app hooks that carry state coupling.',
            },
          ],
        },
      ],
    },
  },
])

import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: [
      'apps/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/assets-source/**',
      '.claude/**',
      '.bench/**',
      '.worktrees/**',
    ],
  },
  js.configs.recommended,
  { files: ['**/*.{js,mjs}'], languageOptions: { globals: globals.node } },
]

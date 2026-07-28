import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // The API build output is generated from api/src and is not source code.
  // Lint the maintained source rather than the compiled artifact.
  globalIgnores(['dist', 'api/dist/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Framer Motion's `<motion.div>` namespace form is a runtime JSX
      // reference, but ESLint's base rule does not recognize it as one.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(?:[A-Z_].*|motion)$',
        argsIgnorePattern: '^_',
      }],
    },
  },
])

// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

const nodeGlobals = {
  Buffer: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
}

const browserGlobals = {
  MessageEvent: 'readonly',
  document: 'readonly',
  window: 'readonly',
}

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.astro/**',
      '**/build/**',
      '**/out/**',
      '**/output/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.playwright/**',
      '**/.vscode-test-web/**',
      '**/.vscode-test/**',
      '**/.idea/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['packages/bridge/src/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['packages/showcase/src/**/*.{ts,tsx}', 'packages/bridge/src/index.ts'],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    files: ['packages/cli/src/targets/vscode/actions/*.js'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        execFile: 'readonly',
        extensionPath: 'readonly',
        fs: 'readonly',
        os: 'readonly',
        output: 'readonly',
        path: 'readonly',
        vscode: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['packages/cli/src/targets/vscode/actions/globals.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)

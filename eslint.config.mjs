import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import stylistic from '@stylistic/eslint-plugin'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import nodeDeps from 'eslint-plugin-node-dependencies'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import jsoncParser from 'jsonc-eslint-parser'

const ESLintConfig = [
  {
    ignores: ['**/node_modules/', '**/dist/', '**/.next/', '**/*.d.ts', '.claude/', '**/CHANGELOG.md']
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      import: importPlugin,
      react,
      stylistic
    },
    settings: {
      react: { version: '19' },
      'import/resolver': {
        typescript: { project: ['packages/*/tsconfig.json', 'apps/*/tsconfig.json'] }
      }
    },
    rules: {
      'stylistic/array-bracket-spacing': ['warn', 'never'],
      'stylistic/comma-dangle': ['error', 'never'],
      'stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      'stylistic/no-multi-spaces': 'error',
      'stylistic/no-trailing-spaces': 'error',
      'stylistic/object-curly-spacing': ['error', 'always'],
      'stylistic/quotes': ['error', 'single'],
      'stylistic/semi': ['error', 'never'],
      'stylistic/space-before-function-paren': ['warn', 'always'],
      'stylistic/space-infix-ops': 'warn',
      'stylistic/type-annotation-spacing': ['error', { after: true }],

      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          { pattern: '**/*.css', group: 'builtin', position: 'before' },
          { pattern: '**/*.sass', group: 'builtin', position: 'before' }
        ],
        pathGroupsExcludedImportTypes: [],
        alphabetize: { order: 'asc', caseInsensitive: true }
      }],
      'import/no-unresolved': 'error',

      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...jsxA11y.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/no-unstable-nested-components': 'error',
      'react-hooks/rules-of-hooks': 'error',

      ...typescriptEslint.configs.recommended.rules,
      // TypeScript checks undefined names better than ESLint (DOM lib types included).
      'no-undef': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },
  {
    files: ['apps/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules
    }
  },
  {
    files: ['packages/cms/src/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/*', '@playground/*', '**/apps/**'],
          message: 'The package never imports project code: receive it through the config.'
        }]
      }]
    }
  },
  {
    files: ['**/package.json'],
    languageOptions: { parser: jsoncParser },
    plugins: { 'node-dependencies': nodeDeps },
    rules: {
      'node-dependencies/absolute-version': ['error', {
        dependencies: 'always',
        devDependencies: 'always',
        peerDependencies: 'ignore',
        optionalDependencies: 'always'
      }]
    }
  }
]

export default ESLintConfig

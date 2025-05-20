module.exports = {
  'root': true,
  'env': {
    'browser': true,
    'amd': true,
    'node': true,
    'es2021': true
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaFeatures': {
      'jsx': true
    },
    'ecmaVersion': 12,
    'sourceType': 'module'
  },
  'plugins': [
    'react'
  ],
  'rules': {
    semi: ['error', 'never'],
    '@typescript-eslint/no-explicit-any': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      files: [
        '**/*.test.js',
        '**/*.test.jsx',
        '**/*.test.tsx',
        '**/*.test.ts',
        '**/setupTests.ts'
      ],
      env: {
        jest: true
      }
    },
    {
      files: ['*.ts', '*tsx'],
      'extends': [
        'eslint:recommended',
        'plugin:react/recommended'
      ],
      'parser': '@typescript-eslint/parser',
      'parserOptions': {
        'ecmaFeatures': {
          'jsx': true
        },
        'ecmaVersion': 12,
        'sourceType': 'module'
      },
      'plugins': [
        'react'
      ],
      'rules': {
        semi: ['error', 'never'],
        '@typescript-eslint/no-explicit-any': 'off',
        'react/react-in-jsx-scope': 'off',
        'comma-dangle': 'error',
        quotes: ['error', 'single'],
        indent: ['error', 2]
      },
    }
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: ['dist/**', 'node_modules/**']
}

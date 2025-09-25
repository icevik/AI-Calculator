module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'no-unused-vars': ['warn'],
    'no-console': ['warn'],
    'prefer-const': ['error'],
    'no-var': ['error']
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.min.js'
  ]
}

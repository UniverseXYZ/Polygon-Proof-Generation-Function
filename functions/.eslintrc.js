module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    mocha: true,
  },
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    project: './tsconfig.json',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    'local/',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'object-curly-spacing': [2, 'always'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'node/no-unsupported-features/es-syntax': 'off',
    'require-jsdoc': 1,
    'no-invalid-this': 'off',
    'valid-jsdoc': 'off',
    'require-jsdoc': 'off',
    'semi': ['warn', 'always'],
    'max-len': ['warn', { 'code': 200 }],
    'camelcase': 'off',
    'indent': ['error', 2],
    'no-unused-vars': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};

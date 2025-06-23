const babelParser = require('@babel/eslint-parser');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
      },
      globals: {
        _: 'readonly',
        sinon: 'readonly',
        browser: true,
        jasmine: true,
        jquery: true,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
      'import/prefer-default-export': 'off',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'indent': [
        'error',
        4,
        {
          'SwitchCase': 1,
        },
      ],
      'no-unused-vars': [
        'error',
        {
          'args': 'none',
          'caughtErrors': 'none',
        },
      ],
      'comma-dangle': [
        'error',
        {
          'arrays': 'always-multiline',
          'objects': 'always-multiline',
        },
      ],
      'global-require': 'off',
      'max-len': [
        'error',
        120,
      ],
      'no-underscore-dangle': 'off',
      'space-before-function-paren': [
        'error',
        'never',
      ],
      'no-plusplus': 'off',
      'no-restricted-properties': 'off',
      'object-curly-spacing': [
        'error',
        'never',
      ],
    },
  },
];

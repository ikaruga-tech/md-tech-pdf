import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tsPlugin.config(
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'generated/**',
      'coverage/**',
      'vscode-extension/dist/**',
      'vscode-extension/node_modules/**',
    ],
  }
);

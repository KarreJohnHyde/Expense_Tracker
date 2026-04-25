import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore generated / third-party dirs
  { ignores: ['dist', 'build', 'node_modules', 'android', 'ios', 'mobile_app', 'supabase', 'utils', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Downgrade to warnings so they don't block CI
      '@typescript-eslint/no-explicit-any':           'warn',
      '@typescript-eslint/no-unused-vars':            ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment':            'warn',
      '@typescript-eslint/no-require-imports':        'warn',

      // These are pre-existing patterns in legacy files — keep as warn
      'no-empty':                                     'warn',
      'no-async-promise-executor':                    'warn',
      'prefer-const':                                 'warn',
      'no-useless-escape':                            'warn',
      'no-useless-assignment':                        'warn',
    },
  }
);

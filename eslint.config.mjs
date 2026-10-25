import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

// Nuxt/Nitro auto-imports are declared as globals instead of pulling in a generated config:
// the list is short and an unknown identifier still fails (no-undef equivalent via TypeScript).
export default tseslint.config(
  { ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'storybook-static/**', 'test-results/**', '.lighthouseci/**', 'coverage/**', 'tests/.auth/**', 'packages/**', 'services/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // TypeScript checks undefined identifiers (including auto-imports) via nuxt typecheck.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'log'] }],
      // Template formatting is not a lint concern here; the existing code style is compact.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off',
      // Component names follow the Nuxt convention (pages are index.vue, [id] etc.).
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // Design-system components must not rely on Nuxt auto-imports: they also run in Storybook and Vitest.
    files: ['app/components/ds/**/*.vue', 'app/components/ds/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'useI18n', 'useRoute', 'useState', 'useFetch', 'useHead', 'navigateTo'],
    },
  },
  {
    files: ['legacy/**', 'scripts/**', '*.mjs', '*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
)

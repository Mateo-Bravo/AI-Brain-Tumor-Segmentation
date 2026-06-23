// eslint.config.js
import js from '@eslint/js'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import pluginVue from 'eslint-plugin-vue'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,ts,tsx,vue}'],
  },

  // Ignorar carpetas que no deben analizarse
  globalIgnores(['**/dist/**', '**/coverage/**', '**/node_modules/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@babel/eslint-parser',
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: false, // 🔒 Desactiva JSX (solo para React)
        },
      },
    },
  },

  // Configuración base de JavaScript
  js.configs.recommended,

  // Configuración recomendada para Vue 3
  {
    ...pluginVue.configs['flat/recommended'],
    rules: {
      // Ajustes finos del plugin Vue
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/no-v-html': 'off',
    },
  },

  // Desactivar reglas de formato (dejamos eso a Prettier o Volar)
  skipFormatting,
])
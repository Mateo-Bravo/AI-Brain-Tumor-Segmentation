import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Configuración del servidor para Docker
  server: {
    host: '0.0.0.0',  // Permitir conexiones externas
    port: 3000,       // Puerto fijo
    strictPort: true, // Fallar si el puerto está ocupado
    watch: {
      usePolling: true // Necesario para Docker en algunos casos
    }
  },
  // Configuración de preview (para producción)
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  }
})
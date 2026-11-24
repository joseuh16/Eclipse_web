import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    // Rutas relativas: funciona tanto en dominio raíz como en subcarpeta/subdominio.
    base: './',
    server: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/database',
              'firebase/firestore',
              'firebase/storage',
            ],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  }
})

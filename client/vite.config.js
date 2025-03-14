// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    proxy: command === 'serve' ? {
      '/upload': {
        target: 'https://8fee-117-254-230-212.ngrok-free.app',
        changeOrigin: true,
        secure: false
      },
      '/create-payment': {
        target: 'https://8fee-117-254-230-212.ngrok-free.app',
        changeOrigin: true,
        secure: false
      },
      '/verify-payment': {
        target: 'https://8fee-117-254-230-212.ngrok-free.app',
        changeOrigin: true,
        secure: false
      }
    } : undefined
  }
}));
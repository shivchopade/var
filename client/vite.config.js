import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const a = 'https://8fee-117-254-230-212.ngrok-free.app/';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/upload': {
        target: a,
        changeOrigin: true,
        secure: false
      },
      '/create-payment': {
        target: a,
        changeOrigin: true,
        secure: false
      },
      '/verify-payment': {
        target: a,
        changeOrigin: true,
        secure: false
      }
    }
  }
})

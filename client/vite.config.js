import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/upload': 'https://53e9-117-254-231-227.ngrok-free.app/',
      '/create-payment': 'https://53e9-117-254-231-227.ngrok-free.app/',
      '/verify-payment': 'https://53e9-117-254-231-227.ngrok-free.app/'
    }
  }
})

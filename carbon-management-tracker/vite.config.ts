import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The FastAPI backend (npm run api, or uvicorn in backend/)
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})

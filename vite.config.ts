import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // SPA routing in dev is handled automatically by Vite.
  // Production routing is handled by vercel.json rewrites.
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Serve index.html for all unmatched paths (SPA fallback)
    // This makes /abc123 work in dev — production hosts need _redirects / vercel.json
    historyApiFallback: true,
  },
})

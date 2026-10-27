import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: { proxy: { '/socket.io': { target: 'http://127.0.0.1:4001', ws: true } } },
  plugins: [
    tailwindcss(),
  ],
})
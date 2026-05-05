import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  server: { port: 3000 },
  plugins: [react(), viteSingleFile()],
})

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shadcn/ui 컴포넌트가 쓰는 '@/...' 경로 별칭 (jsconfig.json의 paths와 같이 유지)
    alias: { '@': srcDir },
  },
})

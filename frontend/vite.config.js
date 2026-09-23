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
  server: {
    // ngrok/cloudflared 등 외부 호스트로 dev 서버에 접속할 때 Vite가 알 수 없는 Host 헤더를 막는 걸 풂
    allowedHosts: true,
    // 모바일/터널로 테스트할 때 게이트웨이(8080)를 프론트와 같은 origin으로 프록시.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, headers: { origin: 'http://localhost:5173' } },
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: true, headers: { origin: 'http://localhost:5173' } },
      '/login/oauth2': { target: 'http://localhost:8080', changeOrigin: true, headers: { origin: 'http://localhost:5173' } },
      '/uploads': { target: 'http://localhost:8080', changeOrigin: true, headers: { origin: 'http://localhost:5173' } },
      '/v3/api-docs': { target: 'http://localhost:8080', changeOrigin: true, headers: { origin: 'http://localhost:5173' } },
    },
  },
})

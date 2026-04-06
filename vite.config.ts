import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed) for use in proxy config
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/cmots': {
        target: 'https://deltastockzapis.cmots.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cmots/, ''),
        headers: {
          'Authorization': `Bearer ${env.CMOTS_API_TOKEN || ''}`,
        },
      },
      '/api/dhan': {
        target: 'https://api.dhan.co/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dhan/, ''),
        headers: {
          'access-token': env.DHAN_ACCESS_TOKEN || '',
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // DhanHQ rejects requests with Origin header (CORS check)
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
      '/api/indianapi': {
        target: 'https://stock.indianapi.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/indianapi/, ''),
        headers: {
          'X-Api-Key': env.INDIANAPI_KEY || '',
        },
      },
      '/api/screener': {
        target: 'https://www.screener.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/screener/, ''),
        headers: {
          'Cookie': env.SCREENER_SESSION_ID ? `sessionid=${env.SCREENER_SESSION_ID}` : '',
        },
      },
      '/api/trendlyne': {
        target: 'https://trendlyne.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trendlyne/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://trendlyne.com/',
        },
      },
      '/api/bse': {
        target: 'https://api.bseindia.com/BseIndiaAPI/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bse/, ''),
        headers: {
          'Referer': 'https://www.bseindia.com/',
        },
      },
      '/api/finnhub': {
        target: 'https://finnhub.io/api/v1',
        changeOrigin: true,
        rewrite: (path) => {
          const rewritten = path.replace(/^\/api\/finnhub/, '')
          const sep = rewritten.includes('?') ? '&' : '?'
          return `${rewritten}${sep}token=${env.FINNHUB_API_KEY || ''}`
        },
      },
      '/api/gnews': {
        target: 'https://news.google.com/rss',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gnews/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
      '/api/nse-archives': {
        target: 'https://nsearchives.nseindia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nse-archives/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)',
          'Referer': 'https://www.nseindia.com/',
        },
      },
      '/api/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)',
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'recharts', 'lucide-react'],
          'vendor-utils': ['zustand', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
  },
}})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import http from 'http'
import https from 'https'
import { URL } from 'url'

/**
 * 動態反向代理 middleware
 * 前端在每個請求帶 X-Proxy-Target header 指定目標伺服器，
 * Vite dev server 在伺服端轉發，避免瀏覽器 CORS 限制。
 * 路徑：/api-proxy/<實際 API path>
 */
function dynamicProxyPlugin() {
  return {
    name: 'dynamic-proxy',
    configureServer(server) {
      server.middlewares.use('/api-proxy', (req, res) => {
        // OPTIONS preflight
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

        const targetBase = req.headers['x-proxy-target']
        if (!targetBase) {
          res.statusCode = 400
          return res.end(JSON.stringify({ error: 'Missing X-Proxy-Target header' }))
        }

        let targetUrl
        try {
          targetUrl = new URL(targetBase.replace(/\/$/, '') + req.url)
        } catch (e) {
          res.statusCode = 400
          return res.end(JSON.stringify({ error: `Invalid target URL: ${e.message}` }))
        }

        const transport = targetUrl.protocol === 'https:' ? https : http
        const forwardHeaders = { ...req.headers }
        forwardHeaders['host'] = targetUrl.host
        delete forwardHeaders['x-proxy-target']
        // 避免 gzip 壓縮導致 pipe 亂碼
        delete forwardHeaders['accept-encoding']

        const proxyReq = transport.request(
          {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: req.method,
            headers: forwardHeaders,
            rejectUnauthorized: false, // 允許自簽憑證（地端常見）
          },
          (proxyRes) => {
            const responseHeaders = { ...proxyRes.headers }
            responseHeaders['access-control-allow-origin'] = '*'
            res.writeHead(proxyRes.statusCode, responseHeaders)
            proxyRes.pipe(res)
          }
        )

        proxyReq.on('error', (e) => {
          console.error('[api-proxy] error:', e.message)
          if (!res.headersSent) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: e.message }))
          }
        })

        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), dynamicProxyPlugin()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})

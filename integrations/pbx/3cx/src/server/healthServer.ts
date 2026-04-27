import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { PBXAdapter } from '@voxen/core'

export interface HealthServerConfig {
  port: number
  adapter: PBXAdapter
}

/** Minimal HTTP server exposing /health and /ready endpoints. */
export function startHealthServer(config: HealthServerConfig): Promise<{
  url: string
  close: () => Promise<void>
}> {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' || req.url === '/healthz') {
      const status = await config.adapter.healthCheck()
      res.writeHead(status.healthy ? 200 : 503, { 'content-type': 'application/json' })
      res.end(JSON.stringify(status))
      return
    }
    if (req.url === '/ready') {
      // Liveness check — adapter object exists
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ready: true, adapterId: config.adapter.adapterId }))
      return
    }
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not_found', endpoints: ['/health', '/ready'] }))
  })

  return new Promise((resolve) => {
    server.listen(config.port, '0.0.0.0', () => {
      const addr = server.address()
      const port = addr && typeof addr === 'object' ? addr.port : config.port
      resolve({
        url: `http://localhost:${port}`,
        close: () =>
          new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      })
    })
  })
}

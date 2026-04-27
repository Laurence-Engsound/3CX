/**
 * @voxen/pbx-3cx — entry point.
 *
 * `pnpm dev` starts the adapter against config from environment variables.
 * For local dev without a real 3CX, point at the mock server (test/mock-3cx-server.ts)
 * — see test/integration/smoke.test.ts for the wiring pattern.
 */

import { InProcessEventBus, type TenantId } from '@voxen/core'
import { ThreeCXAdapter } from './ThreeCXAdapter.js'
import { startHealthServer } from './server/healthServer.js'

export { ThreeCXAdapter } from './ThreeCXAdapter.js'
export { ThreeCXClient } from './client/ThreeCXClient.js'
export * from './mappers/index.js'
export * from './vendor/types.js'

async function main(): Promise<void> {
  const baseUrl = process.env['THREECX_BASE_URL'] ?? 'http://127.0.0.1:18080'
  const authToken = process.env['THREECX_AUTH_TOKEN'] ?? 'demo-token'
  const tenantId = (process.env['THREECX_TENANT_ID'] ?? 'tnt_DEMO00000000000000000000000') as TenantId
  const adapterId = process.env['THREECX_ADAPTER_ID'] ?? 'pbx_3cx_demo'
  const recordingStorageBackend = process.env['THREECX_RECORDING_BACKEND'] ?? 'demo-nas'
  const healthPort = Number(process.env['HEALTH_PORT'] ?? 3000)

  const bus = new InProcessEventBus()
  bus.subscribe('*', (event) => {
    // eslint-disable-next-line no-console
    console.log(`[bus] ${event.type}`, JSON.stringify(event.refs))
  })

  const adapter = new ThreeCXAdapter(
    {
      adapterId,
      tenantId,
      recordingStorageBackend,
      client: { baseUrl, authToken },
    },
    bus,
  )

  await adapter.start()
  // eslint-disable-next-line no-console
  console.log(`[3cx-adapter] started, connected to ${baseUrl}`)

  const health = await startHealthServer({ port: healthPort, adapter })
  // eslint-disable-next-line no-console
  console.log(`[3cx-adapter] health server at ${health.url}/health`)

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[3cx-adapter] received ${signal}, shutting down...`)
    await health.close()
    await adapter.stop()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

// Only run main() when invoked directly (not when imported).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[3cx-adapter] fatal:', err)
    process.exit(1)
  })
}

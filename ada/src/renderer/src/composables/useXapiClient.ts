import { XapiClient } from '../../../core/threecx/XapiClient'
import type { XapiConfig } from '../../../core/threecx/types'

/**
 * Renderer-wide XapiClient singleton.
 *
 * Lifecycle:
 *   - `ensureXapiClient(config)` creates (lazy) or returns existing
 *   - `recreateXapiClient(config)` tears down and builds fresh (for
 *     credential changes)
 *   - `destroyXapiClient()` clears singleton
 *
 * Authentication is NOT triggered by these functions — callers must invoke
 * `client.authenticate()` explicitly so they can handle UI feedback.
 */
let instance: XapiClient | null = null

export function getXapiClient(): XapiClient | null {
  return instance
}

export function ensureXapiClient(config: XapiConfig): XapiClient {
  if (instance) return instance
  instance = new XapiClient(config)
  return instance
}

export async function recreateXapiClient(
  config: XapiConfig
): Promise<XapiClient> {
  if (instance) {
    instance.disconnect()
    instance = null
  }
  instance = new XapiClient(config)
  return instance
}

export function destroyXapiClient(): void {
  if (!instance) return
  instance.disconnect()
  instance = null
}

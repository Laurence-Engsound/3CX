import { EventStream } from '../../../core/threecx/EventStream'
import { getXapiClient } from './useXapiClient'

/**
 * Singleton EventStream — one WebSocket subscription per renderer, using
 * the current XapiClient's token.
 */
let instance: EventStream | null = null

export function getEventStream(): EventStream | null {
  return instance
}

export function ensureEventStream(pbxFqdn: string): EventStream {
  if (instance) return instance
  const xapi = getXapiClient()
  if (!xapi) {
    throw new Error(
      'XapiClient not initialised — call recreateXapiClient first'
    )
  }
  instance = new EventStream(xapi, pbxFqdn)
  return instance
}

export function destroyEventStream(): void {
  if (!instance) return
  instance.disconnect()
  instance = null
}

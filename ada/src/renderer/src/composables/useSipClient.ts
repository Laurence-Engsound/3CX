import { SipClient } from '../../../core/sip/SipClient'
import type { SipConfig } from '../../../core/sip/types'

/**
 * Renderer-wide SipClient singleton.
 *
 * We want exactly one SIP UA per Electron renderer; multiple instances would
 * try to REGISTER the same extension and 3CX would 403 the second one.
 *
 * `getSipClient()` lazily creates the singleton on first call and returns
 * the same instance afterwards. `recreateSipClient()` is used when the user
 * changes profile / password — we tear down and rebuild.
 */
let instance: SipClient | null = null

export function getSipClient(): SipClient | null {
  return instance
}

export function ensureSipClient(config: SipConfig): SipClient {
  if (instance) return instance
  instance = new SipClient(config)
  return instance
}

export async function recreateSipClient(config: SipConfig): Promise<SipClient> {
  if (instance) {
    try {
      await instance.disconnect()
    } catch {
      // ignore
    }
    instance = null
  }
  instance = new SipClient(config)
  return instance
}

export async function destroySipClient(): Promise<void> {
  if (!instance) return
  try {
    await instance.disconnect()
  } catch {
    // ignore
  }
  instance = null
}

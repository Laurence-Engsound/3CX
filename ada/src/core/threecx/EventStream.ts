import type { XapiEvent } from './types'

/**
 * WebSocket event subscriber to the 3CX Call Control event stream.
 *
 * Phase 1: skeleton only. Phase 4 will open
 *   wss://{pbxFqdn}/callcontrol/ws?access_token=...
 * and deserialise incoming messages into XapiEvent objects.
 */
export class EventStream {
  private ws: WebSocket | null = null
  private listeners = new Set<(e: XapiEvent) => void>()

  async connect(_wssUrl: string, _token: string): Promise<void> {
    throw new Error('Not implemented in Phase 1')
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }

  on(cb: (e: XapiEvent) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}

import type { XapiEvent } from './types'
import type { XapiClient } from './XapiClient'

export type EventStreamState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'

export interface EventStreamListener {
  onState?: (state: EventStreamState, reason?: string) => void
  onEvent?: (event: XapiEvent) => void
  /** Raw message for diagnostics — before any normalization. */
  onRaw?: (data: unknown) => void
}

/**
 * WebSocket subscriber to 3CX Call Control event stream.
 *
 * Auth: most 3CX V20 deployments accept the access token as a query string
 * parameter (?access_token=...). Some builds accept a subprotocol.
 *
 * We try a set of candidate URLs in order until one connects. Users can
 * override via config.callControlWsUrl for non-standard deployments.
 */
export class EventStream {
  private ws: WebSocket | null = null
  private listeners = new Set<EventStreamListener>()
  private _state: EventStreamState = 'disconnected'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private currentUrl: string | null = null
  private manualDisconnect = false

  constructor(private readonly xapi: XapiClient, private readonly pbxFqdn: string) {}

  get state(): EventStreamState {
    return this._state
  }

  /**
   * Connect to 3CX Call Control WebSocket.
   *
   * Auth: Per 3CX V20 docs the WS upgrade request must carry
   * `Authorization: Bearer <token>` as a header. Browsers can't set headers
   * on `new WebSocket()`, so we stash the token with Electron Main, which
   * injects the header on the upgrade via `webRequest.onBeforeSendHeaders`
   * (see main/window.ts).
   */
  async connect(urlOverride?: string): Promise<void> {
    this.manualDisconnect = false
    this.setState('connecting')

    const token = this.authToken()
    if (!token) {
      this.setState('failed', 'No access token — authenticate XAPI first')
      throw new Error('No access token')
    }

    // Ship the token to Main so the upgrade request carries it.
    try {
      await window.ada.xapi.setWsToken(token)
    } catch (err) {
      this.setState(
        'failed',
        `Failed to register WS token with main: ${err instanceof Error ? err.message : String(err)}`
      )
      throw err
    }

    const url = urlOverride ?? `wss://${this.pbxFqdn}/callcontrol/ws`
    try {
      await this.tryOpen(url)
      this.currentUrl = url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.setState('failed', msg)
      throw new Error(msg)
    }
  }

  disconnect(): void {
    this.manualDisconnect = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }
    this.setState('disconnected')
  }

  on(listener: EventStreamListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private authToken(): string {
    // Always query the current XapiClient for its latest token rather than
    // caching the string. This way a token refresh (background or manual)
    // is picked up on the next connect without needing to recreate the
    // EventStream.
    const h = this.xapi.getAuthHeader() ?? ''
    return h.replace(/^Bearer\s+/i, '')
  }

  private tryOpen(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false
      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          try {
            ws.close()
          } catch {
            // ignore
          }
          reject(new Error(`timeout opening ${url}`))
        }
      }, 5000)

      ws.onopen = () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        this.ws = ws
        this.reconnectAttempts = 0
        this.attachLiveHandlers(ws)
        this.setState('connected')
        resolve()
      }

      ws.onerror = (ev) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(new Error(`error event on ${url}`))
        try {
          ws.close()
        } catch {
          // ignore
        }
        void ev
      }

      ws.onclose = (ev) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(new Error(`closed before open: code=${ev.code}`))
      }
    })
  }

  private attachLiveHandlers(ws: WebSocket): void {
    ws.onmessage = (ev) => {
      let raw: unknown = ev.data
      if (typeof ev.data === 'string') {
        try {
          raw = JSON.parse(ev.data)
        } catch {
          raw = ev.data
        }
      }
      for (const l of this.listeners) {
        try {
          l.onRaw?.(raw)
        } catch (err) {
          console.error('[EventStream] onRaw listener threw', err)
        }
      }
      const normalized = this.normalize(raw)
      if (normalized) {
        for (const l of this.listeners) {
          try {
            l.onEvent?.(normalized)
          } catch (err) {
            console.error('[EventStream] onEvent listener threw', err)
          }
        }
      }
    }

    ws.onerror = () => {
      // onclose will usually follow; leave reconnection to onclose.
    }

    ws.onclose = (ev) => {
      this.ws = null
      if (this.manualDisconnect) return
      this.setState('reconnecting', `socket closed code=${ev.code}`)
      this.scheduleReconnect()
    }
  }

  /**
   * Best-effort normalization of 3CX event payloads into our XapiEvent union.
   * Unknown shapes are passed through via onRaw only; this keeps the strongly-
   * typed consumer path safe while still allowing debugging of raw data.
   */
  private normalize(raw: unknown): XapiEvent | null {
    if (!raw || typeof raw !== 'object') return null
    const obj = raw as Record<string, unknown>

    // Heuristics — refine once we see real 3CX V20 payloads.
    const type = String(obj.type ?? obj.event ?? obj.EventType ?? '').toLowerCase()
    if (type.includes('callstart') || type.includes('call-started')) {
      return {
        type: 'call-started',
        callId: String(obj.callId ?? obj.CallId ?? obj.id ?? ''),
        caller: String(obj.caller ?? obj.From ?? ''),
        callee: String(obj.callee ?? obj.To ?? '')
      }
    }
    if (type.includes('callend') || type.includes('call-ended')) {
      return {
        type: 'call-ended',
        callId: String(obj.callId ?? obj.CallId ?? obj.id ?? ''),
        duration: Number(obj.duration ?? obj.Duration ?? 0)
      }
    }
    if (type.includes('presence') || type.includes('status')) {
      return {
        type: 'status-changed',
        extension: String(obj.extension ?? obj.Extension ?? ''),
        status: String(obj.status ?? obj.Status ?? '')
      }
    }
    return null
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectAttempts++
    // Exponential backoff, capped at 30s.
    const delay = Math.min(30_000, 500 * 2 ** Math.min(this.reconnectAttempts, 6))
    this.reconnectTimer = setTimeout(() => {
      void this.connect(this.currentUrl ?? undefined).catch((err) => {
        console.error('[EventStream] reconnect failed', err)
      })
    }, delay)
  }

  private setState(state: EventStreamState, reason?: string): void {
    this._state = state
    for (const l of this.listeners) {
      try {
        l.onState?.(state, reason)
      } catch (err) {
        console.error('[EventStream] onState listener threw', err)
      }
    }
  }
}

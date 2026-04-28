import { EventEmitter } from 'node:events'
import { URL } from 'node:url'
import { WebSocket } from 'ws'
import type { ThreeCXCall, ThreeCXEventEnvelope, ThreeCXUser } from '../vendor/types.js'

export interface ThreeCXClientConfig {
  /** Base URL, e.g. 'http://localhost:18080' (mock) or 'https://eSun-pbx.voxen.local:5001' (real). */
  baseUrl: string
  /** OAuth2 access token or API key. Sent as `Authorization: Bearer` on REST. */
  authToken: string
  /** WebSocket endpoint. Defaults to baseUrl with ws(s):// scheme + /events. */
  wsUrl?: string
  /**
   * Headers to send on the WebSocket Upgrade request. Real 3CX V20 needs
   *   { Authorization: `Bearer ${token}` }
   * here. Mock server doesn't need any. Defaults to empty object.
   */
  wsHeaders?: Record<string, string>
  /**
   * REST path used by ping() for HTTP reachability check. Defaults to
   * '/api/v1/ping' (mock server convention). Real 3CX V20 should pass
   * '/xapi/v1' (OData service root, always responds 200 with auth).
   */
  pingPath?: string
}

export interface ThreeCXClientEvents {
  event: [ThreeCXEventEnvelope]
  connected: []
  disconnected: [reason?: string]
  error: [Error]
}

/**
 * 3CX Call Control API client wrapper.
 *
 * Real 3CX uses REST + WebSocket; this client abstracts both behind a typed surface.
 * For unit / smoke tests we point it at the mock server in test/mock-3cx-server.ts.
 */
export class ThreeCXClient extends EventEmitter {
  // Override emit/on with typed signatures (declarations only — runtime uses base impl)
  declare on: <K extends keyof ThreeCXClientEvents>(
    event: K, listener: (...args: ThreeCXClientEvents[K]) => void
  ) => this
  declare emit: <K extends keyof ThreeCXClientEvents>(
    event: K, ...args: ThreeCXClientEvents[K]
  ) => boolean
  private ws: WebSocket | undefined
  private connected = false

  constructor(private readonly config: ThreeCXClientConfig) {
    super()
    // Safety net: a default 'error' listener so EventEmitter doesn't crash
    // the host process when no consumer subscribes. Consumers should still
    // attach their own .on('error', ...) for real handling — multiple
    // listeners coexist fine.
    this.on('error', () => { /* swallowed */ })
  }

  // ===== REST =====

  async listCalls(): Promise<ThreeCXCall[]> {
    return this.get<ThreeCXCall[]>('/api/v1/calls')
  }

  async listUsers(): Promise<ThreeCXUser[]> {
    return this.get<ThreeCXUser[]>('/api/v1/users')
  }

  async getCall(callId: string): Promise<ThreeCXCall | undefined> {
    try {
      return await this.get<ThreeCXCall>(`/api/v1/calls/${encodeURIComponent(callId)}`)
    } catch (e: any) {
      if (e?.statusCode === 404) return undefined
      throw e
    }
  }

  async makeCall(params: { from: string; to: string }): Promise<{ callId: string }> {
    return this.post<{ callId: string }>('/api/v1/calls', params)
  }

  async transferCall(callId: string, target: string): Promise<void> {
    await this.post(`/api/v1/calls/${encodeURIComponent(callId)}/transfer`, { target })
  }

  async hangupCall(callId: string): Promise<void> {
    await this.post(`/api/v1/calls/${encodeURIComponent(callId)}/hangup`, {})
  }

  async ping(): Promise<boolean> {
    const path = this.config.pingPath ?? '/api/v1/ping'
    try {
      await this.get<unknown>(path)
      return true
    } catch {
      return false
    }
  }

  // ===== WebSocket event stream =====

  async connect(): Promise<void> {
    if (this.connected) return
    const wsUrl = this.config.wsUrl ?? this.deriveWsUrl()
    const wsHeaders = this.config.wsHeaders
    // ws library accepts headers via constructor options (Node-only
    // feature; browser WebSocket cannot set custom headers). Real 3CX V20
    // requires `Authorization: Bearer ${token}` here.
    this.ws = wsHeaders
      ? new WebSocket(wsUrl, { headers: wsHeaders })
      : new WebSocket(wsUrl)

    return new Promise<void>((resolve, reject) => {
      this.ws!.addEventListener('open', () => {
        this.connected = true
        this.emit('connected')
        resolve()
      })
      // Note: type annotations omitted — DOM's Event/CloseEvent/MessageEvent
      // conflict with ws's own same-named types. Inferred types from ws's
      // addEventListener signature work cleanly.
      this.ws!.addEventListener('error', (event) => {
        const err = new Error(`WebSocket error: ${(event as { message?: string }).message ?? 'unknown'}`)
        this.emit('error', err)
        if (!this.connected) reject(err)
      })
      this.ws!.addEventListener('close', (event) => {
        this.connected = false
        this.emit('disconnected', event.reason)
      })
      this.ws!.addEventListener('message', (event) => {
        try {
          // ws message data is Buffer | ArrayBuffer | Buffer[] | string
          const raw = event.data
          const data = typeof raw === 'string' ? raw : raw.toString()
          const envelope = JSON.parse(data) as ThreeCXEventEnvelope
          this.emit('event', envelope)
        } catch (e) {
          this.emit('error', e as Error)
        }
      })
    })
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.ws) return
    return new Promise<void>((resolve) => {
      const ws = this.ws!
      const done = (): void => { resolve() }
      ws.addEventListener('close', done, { once: true })
      // Safety net: if 'close' event doesn't fire within 1s, resolve anyway and force-set state.
      setTimeout(() => {
        this.connected = false
        ws.removeEventListener('close', done)
        resolve()
      }, 1000).unref()
      ws.close()
    })
  }

  isConnected(): boolean {
    return this.connected
  }

  // ===== Internals =====

  private deriveWsUrl(): string {
    const u = new URL(this.config.baseUrl)
    const wsScheme = u.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsScheme}//${u.host}/events`
  }

  private async get<T>(path: string): Promise<T> {
    return this.requestJson<T>('GET', path)
  }

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>('POST', path, body)
  }

  private async requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.config.baseUrl)
    const payload = body !== undefined ? JSON.stringify(body) : undefined

    // Use global fetch (Node 18+) — handles HTTP and HTTPS uniformly.
    // Previously used node:http.request which is HTTPS-blind, so all
    // REST calls against real 3CX (HTTPS) silently failed.
    const res = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${this.config.authToken}`,
        'content-type': 'application/json',
      },
      ...(payload ? { body: payload } : {}),
    })

    const text = await res.text()
    if (!res.ok) {
      const err = new Error(`3CX HTTP ${res.status}: ${text.slice(0, 200)}`) as Error & {
        statusCode?: number
      }
      err.statusCode = res.status
      throw err
    }
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`Invalid JSON from 3CX: ${text.slice(0, 200)}`)
    }
  }
}

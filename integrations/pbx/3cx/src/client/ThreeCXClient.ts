import { EventEmitter } from 'node:events'
import { request } from 'node:http'
import { URL } from 'node:url'
import type { ThreeCXCall, ThreeCXEventEnvelope, ThreeCXUser } from '../vendor/types.js'

export interface ThreeCXClientConfig {
  /** Base URL, e.g. 'http://localhost:18080' (mock) or 'https://eSun-pbx.voxen.local:5001' (real). */
  baseUrl: string
  /** OAuth2 access token or API key. */
  authToken: string
  /** WebSocket endpoint, e.g. 'ws://localhost:18080/events'. Defaults to baseUrl with ws:// scheme + /events. */
  wsUrl?: string
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
    try {
      await this.get<{ ok: boolean }>('/api/v1/ping')
      return true
    } catch {
      return false
    }
  }

  // ===== WebSocket event stream =====

  async connect(): Promise<void> {
    if (this.connected) return
    const wsUrl = this.config.wsUrl ?? this.deriveWsUrl()
    this.ws = new WebSocket(wsUrl)

    return new Promise<void>((resolve, reject) => {
      this.ws!.addEventListener('open', () => {
        this.connected = true
        this.emit('connected')
        resolve()
      })
      this.ws!.addEventListener('error', (event: Event) => {
        const err = new Error(`WebSocket error: ${(event as any).message ?? 'unknown'}`)
        this.emit('error', err)
        if (!this.connected) reject(err)
      })
      this.ws!.addEventListener('close', (event: CloseEvent) => {
        this.connected = false
        this.emit('disconnected', event.reason)
      })
      this.ws!.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? event.data : event.data.toString()
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
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.baseUrl)
      const payload = body !== undefined ? JSON.stringify(body) : undefined

      const req = request(
        {
          method,
          host: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            'authorization': `Bearer ${this.config.authToken}`,
            'content-type': 'application/json',
            ...(payload ? { 'content-length': Buffer.byteLength(payload).toString() } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c) => chunks.push(c as Buffer))
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8')
            const status = res.statusCode ?? 0
            if (status >= 200 && status < 300) {
              if (!text) return resolve(undefined as T)
              try {
                resolve(JSON.parse(text) as T)
              } catch (e) {
                reject(new Error(`Invalid JSON from 3CX: ${text}`))
              }
            } else {
              const err: any = new Error(`3CX HTTP ${status}: ${text}`)
              err.statusCode = status
              reject(err)
            }
          })
        },
      )
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  }
}

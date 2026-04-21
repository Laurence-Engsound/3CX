import type { XapiConfig, XapiToken } from './types'

/**
 * 3CX V20 Call Control API client.
 *
 * Phase 1: scaffolding only. Phase 4 will implement:
 *   - POST /connect/token (OAuth 2.0 client_credentials)
 *   - GET  /xapi/v1/Users / ActiveCalls / Queues
 *   - POST /xapi/v1/Users({id})/Pbx.SetPresence
 *   - WebSocket stream at wss://{pbxFqdn}/callcontrol/ws
 */
export class XapiClient {
  private token: XapiToken | null = null

  constructor(private readonly config: XapiConfig) {}

  async authenticate(): Promise<void> {
    throw new Error('Not implemented in Phase 1')
  }

  async getMe(): Promise<unknown> {
    throw new Error('Not implemented in Phase 1')
  }

  async setPresence(_status: string): Promise<void> {
    throw new Error('Not implemented in Phase 1')
  }

  async listCdr(_fromIso: string, _toIso: string): Promise<unknown[]> {
    throw new Error('Not implemented in Phase 1')
  }

  /** Build an authenticated fetch. */
  protected async authFetch(path: string, init?: RequestInit): Promise<Response> {
    if (!this.token) throw new Error('XapiClient not authenticated')
    const url = `https://${this.config.pbxFqdn}${path}`
    return fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `${this.token.tokenType} ${this.token.accessToken}`
      }
    })
  }
}

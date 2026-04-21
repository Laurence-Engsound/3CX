import type { XapiConfig, XapiToken } from './types'

export interface AuthResult {
  ok: boolean
  error?: string
}

/**
 * 3CX V20 Call Control API client.
 *
 * Auth flow: OAuth 2.0 Client Credentials grant
 *   POST /connect/token
 *   body: grant_type=client_credentials&client_id=X&client_secret=Y
 *   → { access_token, token_type, expires_in }
 *
 * Token lifetime is typically 1 hour. This client auto-refreshes when
 * within `REFRESH_BEFORE_EXPIRY_MS` of expiry.
 */
const REFRESH_BEFORE_EXPIRY_MS = 60_000 // 1 minute safety margin

export class XapiClient {
  private token: XapiToken | null = null
  private refreshTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly config: XapiConfig) {}

  get authenticated(): boolean {
    return this.token !== null && this.token.expiresAt > Date.now()
  }

  /**
   * Exchange client credentials for an access token.
   * Returns AuthResult so callers can display a friendly message.
   */
  async authenticate(): Promise<AuthResult> {
    const url = `https://${this.config.pbxFqdn}/connect/token`
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    }).toString()

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body
      })
    } catch (err) {
      return {
        ok: false,
        error: `Network error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        error: `HTTP ${res.status} ${res.statusText}${text ? ': ' + text.slice(0, 200) : ''}`
      }
    }

    let json: {
      access_token?: string
      token_type?: string
      expires_in?: number
    }
    try {
      json = await res.json()
    } catch (err) {
      return {
        ok: false,
        error: `Bad token response: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (!json.access_token) {
      return { ok: false, error: 'Token response missing access_token' }
    }

    const expiresIn = (json.expires_in ?? 3600) * 1000
    this.token = {
      accessToken: json.access_token,
      tokenType: json.token_type ?? 'Bearer',
      expiresAt: Date.now() + expiresIn
    }

    this.scheduleRefresh(expiresIn)
    return { ok: true }
  }

  /** Disconnect — clears token and cancels any pending refresh. */
  disconnect(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.token = null
  }

  /**
   * Fetch a list of users from 3CX — also useful as a post-auth ping to
   * verify that the access token is accepted by XAPI endpoints.
   *
   * Tries a couple of known V20 paths in order until one responds 2xx,
   * because 3CX has shuffled these between minor releases. Returns
   * { endpoint, status, body } so the caller can show the raw response
   * for debugging the exact shape of their PBX's response.
   */
  async getUsers(): Promise<{
    endpoint: string
    status: number
    body: unknown
  }> {
    // Try a set of candidate endpoints across XAPI + Call Control APIs.
    // Stop at the first 2xx; if none succeed, return the LAST non-2xx so
    // the caller at least sees what 3CX said (401/403/404 tells us a lot).
    // Candidate endpoints confirmed against 3CX V20 official docs
    // (see docs/3CX Call Control API Endpoint Specification Guide _ 3CX.html
    //  and Configuration Rest API Endpoint Specifications _ 3CX.html).
    const candidates = [
      // XAPI quick test — documented "Quick Test - Validating Token Authentication"
      '/xapi/v1/Defs?$select=Id',
      // Call Control — root lists all DN states (needs Call Control scope)
      '/callcontrol',
      // Call Control — scoped to our extension
      '/callcontrol/1000',
      '/callcontrol/1000/participants',
      '/callcontrol/1000/devices',
      // XAPI listings (may require Admin role)
      '/xapi/v1/Users?$top=5',
      // Metadata — last resort, always works
      '/xapi/v1/$metadata'
    ]

    let lastNonOk: {
      endpoint: string
      status: number
      body: unknown
    } | null = null
    let lastErr: Error | null = null

    for (const path of candidates) {
      try {
        const res = await this.authFetch(path)
        const ctype = res.headers.get('content-type') ?? ''
        const body: unknown = ctype.includes('application/json')
          ? await res.json().catch(() => null)
          : await res.text().catch(() => '')
        if (res.ok) {
          return { endpoint: path, status: res.status, body }
        }
        lastNonOk = { endpoint: path, status: res.status, body }
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
      }
    }
    if (lastNonOk) return lastNonOk
    throw lastErr ?? new Error('All candidate endpoints failed')
  }

  /** Deprecated alias kept for earlier callers. Prefer `getUsers()`. */
  async getMe(): Promise<unknown> {
    const res = await this.getUsers()
    return res.body
  }

  /**
   * Set the current user's presence. The exact endpoint varies by 3CX build;
   * V20 uses `/xapi/v1/Users({id})/Pbx.SetPresence`. We pick the first user
   * returned by getMe (the client-credentials account) — this will need
   * re-visiting if we want per-agent presence later.
   */
  async setPresence(status: string): Promise<void> {
    throw new Error(
      `Not implemented in Phase 4 bootstrap; will land once event stream verified. Requested status: ${status}`
    )
  }

  /**
   * List CDR (Call Detail Records) for a date range.
   * Signature is a placeholder until Phase 4 CDR task.
   */
  async listCdr(_fromIso: string, _toIso: string): Promise<unknown[]> {
    throw new Error('Not implemented yet')
  }

  /** The current access token header value, or null if unauthenticated. */
  getAuthHeader(): string | null {
    if (!this.token) return null
    return `${this.token.tokenType} ${this.token.accessToken}`
  }

  /** Authenticated fetch helper. Re-authenticates if token is expired. */
  protected async authFetch(
    path: string,
    init?: RequestInit
  ): Promise<Response> {
    if (!this.authenticated) {
      const result = await this.authenticate()
      if (!result.ok) throw new Error(`XAPI auth failed: ${result.error}`)
    }
    const url = `https://${this.config.pbxFqdn}${path}`
    return fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
        Authorization: this.getAuthHeader() ?? ''
      }
    })
  }

  private scheduleRefresh(tokenLifetimeMs: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    const delay = Math.max(
      10_000,
      tokenLifetimeMs - REFRESH_BEFORE_EXPIRY_MS
    )
    this.refreshTimer = setTimeout(() => {
      void this.authenticate().catch((err) => {
        console.error('[XapiClient] background refresh failed', err)
      })
    }, delay)
  }
}

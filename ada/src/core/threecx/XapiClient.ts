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
  /**
   * Probe multiple endpoints and return ALL results (diagnostic mode).
   * Useful for figuring out which Call Control path the configured Client
   * actually has access to.
   */
  async probeAll(): Promise<
    { endpoint: string; status: number; body: unknown }[]
  > {
    const candidates = [
      '/xapi/v1/Defs?$select=Id',
      '/callcontrol',
      '/callcontrol/adaclient',
      '/callcontrol/adaclient/participants',
      '/callcontrol/1000',
      '/callcontrol/1000/participants'
    ]
    const results: { endpoint: string; status: number; body: unknown }[] = []
    for (const path of candidates) {
      try {
        const res = await this.authFetch(path)
        const ctype = res.headers.get('content-type') ?? ''
        const body: unknown = ctype.includes('application/json')
          ? await res.json().catch(() => null)
          : await res.text().catch(() => '')
        results.push({ endpoint: path, status: res.status, body })
      } catch (err) {
        results.push({
          endpoint: path,
          status: 0,
          body: err instanceof Error ? err.message : String(err)
        })
      }
    }
    return results
  }

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
   * Fetch a specific Call Control participant record.
   *
   * Event stream notifications carry only the entity path (e.g. upsert on
   * `/callcontrol/1000/participants/434`) with `attached_data: null`, so to
   * drive Screen Pop with real caller data we must pull the participant
   * explicitly after seeing an upsert.
   *
   * Returns the raw JSON the PBX emits — shape varies by 3CX build, so
   * callers should normalize defensively.
   */
  async getParticipant(dn: string, id: string): Promise<unknown> {
    const res = await this.authFetch(
      `/callcontrol/${encodeURIComponent(dn)}/participants/${encodeURIComponent(id)}`
    )
    if (!res.ok) {
      throw new Error(
        `getParticipant ${dn}/${id}: HTTP ${res.status} ${res.statusText}`
      )
    }
    return res.json()
  }

  /** List all current participants on a DN. */
  async listParticipants(dn: string): Promise<unknown> {
    const res = await this.authFetch(
      `/callcontrol/${encodeURIComponent(dn)}/participants`
    )
    if (!res.ok) {
      throw new Error(
        `listParticipants ${dn}: HTTP ${res.status} ${res.statusText}`
      )
    }
    return res.json()
  }

  /**
   * Set the current user's presence. The exact endpoint varies by 3CX build;
   * V20 uses `/xapi/v1/Users({id})/Pbx.SetPresence`. We pick the first user
   * returned by getMe (the client-credentials account) — this will need
   * re-visiting if we want per-agent presence later.
   */
  /**
   * Try to set a user's current profile (presence).
   *
   * 3CX V20 doesn't formally document a dedicated SetPresence endpoint in
   * the XAPI guide, but the User entity exposes `CurrentProfileName`
   * (values: "Available", "Away", "Lunch", "Business Trip", "Out of Office").
   * We try OData PATCH first; if the PBX rejects it (401/403/405), fall
   * back to the Pbx.SetProfile action convention seen for other entities.
   *
   * Returns { ok, endpoint, status, error? } — callers should surface the
   * error string to the user when ok=false so they can adjust.
   */
  async setUserProfile(
    userId: number | string,
    profileName: string
  ): Promise<{
    ok: boolean
    endpoint: string
    status: number
    error?: string
  }> {
    const attempts: {
      method: string
      path: string
      body: Record<string, unknown>
    }[] = [
      {
        method: 'PATCH',
        path: `/xapi/v1/Users(${userId})`,
        body: { Id: userId, CurrentProfileName: profileName }
      },
      {
        method: 'PATCH',
        path: `/xapi/v1/Users(${userId})`,
        body: { CurrentProfileName: profileName }
      },
      {
        method: 'POST',
        path: `/xapi/v1/Users(${userId})/Pbx.SetProfile`,
        body: { profileName }
      },
      {
        method: 'POST',
        path: `/xapi/v1/Users(${userId})/Pbx.SetCurrentProfileByName`,
        body: { profileName }
      }
    ]
    let last = { status: 0, error: 'no attempt', endpoint: '' }
    for (const a of attempts) {
      try {
        const res = await this.authFetch(a.path, {
          method: a.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(a.body)
        })
        if (res.status >= 200 && res.status < 300) {
          return { ok: true, endpoint: `${a.method} ${a.path}`, status: res.status }
        }
        const text = await res.text().catch(() => '')
        last = {
          status: res.status,
          error: `${res.status} ${res.statusText}${text ? ': ' + text.slice(0, 200) : ''}`,
          endpoint: `${a.method} ${a.path}`
        }
      } catch (err) {
        last = {
          status: 0,
          error: err instanceof Error ? err.message : String(err),
          endpoint: `${a.method} ${a.path}`
        }
      }
    }
    return { ok: false, ...last }
  }

  /** Try to find a user by extension number; returns the User record. */
  async findUserByExtension(extension: string): Promise<unknown | null> {
    const res = await this.authFetch(
      `/xapi/v1/Users?$filter=${encodeURIComponent(`Number eq '${extension}'`)}&$select=Id,Number,FirstName,LastName,CurrentProfileName`
    )
    if (!res.ok) return null
    const body = (await res.json().catch(() => null)) as
      | { value?: unknown[] }
      | null
    return body?.value?.[0] ?? null
  }

  /** Back-compat alias for earlier callers. */
  async setPresence(status: string): Promise<void> {
    throw new Error(
      `setPresence deprecated — use setUserProfile(userId, "${status}") instead.`
    )
  }

  /**
   * List Call Detail Records (CDR).
   *
   * 3CX V20 exposes CDR via OData. The exact collection name has varied
   * between Updates (`ReportCallLogData`, `CallHistoryView`, `CallHistory`),
   * so we try a few and return the first one that answers 2xx. Consumers
   * get `{ endpoint, entries }` and can format the raw entries.
   *
   * `extension` filters to a specific DN if provided. `top` caps the result
   * count (OData `$top`).
   */
  async listCallHistory(
    options: { extension?: string; top?: number } = {}
  ): Promise<{
    endpoint: string
    entries: unknown[]
  }> {
    const top = options.top ?? 50
    const extFilter = options.extension
      ? `&$filter=${encodeURIComponent(
          `(SourceCallerId eq '${options.extension}') or (DestinationCallerId eq '${options.extension}')`
        )}`
      : ''
    const candidates = [
      `/xapi/v1/ReportCallLogData?$top=${top}&$orderby=StartTime desc${extFilter}`,
      `/xapi/v1/ReportCallLogData?$top=${top}`,
      `/xapi/v1/CallHistoryView?$top=${top}&$orderby=StartTime desc`,
      `/xapi/v1/CallHistoryView?$top=${top}`,
      `/xapi/v1/CallHistory?$top=${top}`,
      `/xapi/v1/CdrList?$top=${top}`
    ]
    for (const path of candidates) {
      try {
        const res = await this.authFetch(path)
        if (!res.ok) continue
        const ctype = res.headers.get('content-type') ?? ''
        if (!ctype.includes('application/json')) continue
        const body = (await res.json().catch(() => null)) as
          | { value?: unknown[] }
          | unknown[]
          | null
        const entries = Array.isArray(body)
          ? body
          : ((body as { value?: unknown[] } | null)?.value ?? [])
        return { endpoint: path, entries }
      } catch {
        // try next
      }
    }
    throw new Error(
      'No known CDR endpoint responded 2xx. Check Admin role or use /xapi/v1/$metadata to find the correct collection.'
    )
  }

  /** Deprecated alias; kept for earlier callers. */
  async listCdr(_fromIso: string, _toIso: string): Promise<unknown[]> {
    const result = await this.listCallHistory()
    return result.entries
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

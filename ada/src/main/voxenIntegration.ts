/**
 * VOXEN integration — entry point in ada Main process.
 *
 * Phase 6 Week 1 progressive integration:
 *   - W1D2: import + EventBus instantiation only (ceremonial)
 *   - W1D3: read ada settings → instantiate ThreeCXAdapter
 *   - W1D4: OAuth + adapter.start() — actually connect to 3CX (this stage)
 *   - W1D5+: subscribe ada subsystems to canonical events from EventBus
 *   - W2:   wire @voxen/crm-mock for Customer-360 → Bar customer display
 *
 * See ADR-0002 (ada as VOXEN L6 consumer) and PHASE6-PLAN.md v2.
 */

import type { BrowserWindow } from 'electron'
import {
  Customer360Service,
  InProcessEventBus,
  type IEventBus,
  type PBXAdapter,
  type TenantId,
} from '@voxen/core'
import { ThreeCXAdapter, type ThreeCXAdapterConfig } from '@voxen/pbx-3cx'
import { createEsunMockAdapter } from '@voxen/crm-mock'
import { getSetting } from './settings-store'
import { loadCredential } from './credentials'
import type { ThreeCxProfile, XapiConfig } from '../shared/types'

const ENGSOUND_TENANT_ID = 'tnt_01HQR0WMRP4Y3M00000000ENG5' as TenantId
const ADA_ADAPTER_ID = 'pbx_3cx_engsound_ada'
const KEYCHAIN_SERVICE = 'ada-xapi'

let eventBus: IEventBus | null = null
let pbxAdapter: PBXAdapter | null = null
let customer360: Customer360Service | null = null
let barWindow: BrowserWindow | null = null

/**
 * W2D3 — Ring buffer of recent canonical events. When a Bar window opens
 * after some events have already fired (e.g., system.adapter.started fires
 * during ada boot, before Bar finishes mount), we replay the buffer so the
 * Bar's evt counter and any UI state-machine catches up.
 */
const EVENT_BUFFER_SIZE = 50
const eventBuffer: unknown[] = []

/**
 * Register the Bar window so voxenIntegration can forward EventBus events
 * to it via IPC ('voxen:event' channel). Called by main/index.ts after
 * createBarWindow(). Pass null to detach (e.g., on window close).
 *
 * W2D3: also replay the recent-event buffer to the Bar after its content
 * finishes loading — fixes the "evt 0 even though events fired" issue.
 */
export function setBarWindow(win: BrowserWindow | null): void {
  barWindow = win
  if (!win) return

  const replay = (): void => {
    if (!barWindow || barWindow.isDestroyed()) return
    for (const event of eventBuffer) {
      barWindow.webContents.send('voxen:event', event)
    }
  }
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', replay)
  } else {
    replay()
  }
}

/**
 * Initialize VOXEN integration — sync portion. Always succeeds.
 * Spawns async adapter setup in background.
 */
export function initVoxenIntegration(): void {
  if (eventBus) {
    return
  }

  eventBus = new InProcessEventBus()
  console.log('🟢 VOXEN integration starting...')
  console.log('   ✓ EventBus ready')

  // W1D6 + W2D1 + W2D3: Subscribe to ALL canonical events.
  //   1. Pretty-print to main console (dev-time visibility)
  //   2. Buffer for late-mounting consumers (W2D3 — Bar opens after boot)
  //   3. Forward to Bar window via IPC ('voxen:event' channel)
  //   4. If event is a call.* with a phone in payload, auto-lookup customer
  //      and push the profile to Bar (W2D3 — real call → customer card)
  eventBus.subscribe('*', (event) => {
    const refStr = Object.entries(event.refs)
      .map(([k, v]) => `${k}=${String(v).slice(-12)}`)
      .join(' ')
    console.log(`[bus] ${event.type.padEnd(36)} ${refStr || '-'}`)

    // (2) Append to ring buffer for late subscribers
    eventBuffer.push(event)
    if (eventBuffer.length > EVENT_BUFFER_SIZE) eventBuffer.shift()

    // (3) Live forward to Bar window
    if (barWindow && !barWindow.isDestroyed()) {
      barWindow.webContents.send('voxen:event', event)
    }

    // (4) On call.* events, look up customer + push profile
    if (event.type.startsWith('call.') && customer360) {
      const phone = extractPhoneFromEvent(event)
      if (phone) {
        void (async () => {
          try {
            const profile = await customer360!.getProfileByPhone(phone)
            if (profile && barWindow && !barWindow.isDestroyed()) {
              barWindow.webContents.send('voxen:customer-profile', profile)
              console.log(`   📞 ${event.type} → customer lookup: ${profile.customer.displayName}`)
            }
          } catch (err) {
            console.log(`   ✗ Customer-360 lookup failed:`, (err as Error).message)
          }
        })()
      }
    }
  })
  console.log('   ✓ EventBus subscriber attached (console + buffer + Bar IPC + auto-lookup)')

  // Background async: read settings → OAuth → start adapter.
  // Fire-and-forget — never throws to caller, never crashes ada.
  void setupPbxAdapter().catch((err) => {
    console.log('   ✗ VOXEN adapter setup unexpected error:', err)
  })
}

async function setupPbxAdapter(): Promise<void> {
  const profile = getSetting('profile') as ThreeCxProfile | null
  if (!profile?.pbxFqdn) {
    console.log('   🟡 No 3CX profile — ThreeCXAdapter creation deferred')
    return
  }

  const xapi = getSetting('xapi') as XapiConfig | null

  // Try to obtain XAPI access token from main-side OAuth
  let token: string | null = null
  if (xapi?.enabled && xapi.clientId) {
    token = await obtainAccessToken(profile.pbxFqdn, xapi.clientId)
  } else {
    console.log('   ⚠️  XAPI not enabled in ada Settings — adapter will not start')
    console.log(`     (xapi.enabled=${xapi?.enabled}, clientId="${xapi?.clientId ?? ''}")`)
  }

  // Build adapter config. Use real 3CX V20 WS path + bearer-in-Upgrade
  // header (W1D5 addition to @voxen/pbx-3cx).
  const baseUrl = `https://${profile.pbxFqdn}`
  const wsUrl = profile.wsUri ?? `wss://${profile.pbxFqdn}/callcontrol/ws`
  const config: ThreeCXAdapterConfig = {
    adapterId: ADA_ADAPTER_ID,
    tenantId: ENGSOUND_TENANT_ID,
    recordingStorageBackend: 'local-engsound',
    client: {
      baseUrl,
      authToken: token ?? '',
      wsUrl,
      // Real 3CX V20 OData service root — always 200 with auth, used for
      // HTTP reachability probe in healthCheck.
      pingPath: '/xapi/v1',
      ...(token
        ? { wsHeaders: { Authorization: `Bearer ${token}` } }
        : {}),
    },
  }

  // Instantiate (no network)
  pbxAdapter = new ThreeCXAdapter(config, eventBus!)
  console.log('   ✓ ThreeCXAdapter instantiated')
  console.log(`     - adapterId: ${ADA_ADAPTER_ID}`)
  console.log(`     - tenantId:  ${ENGSOUND_TENANT_ID}`)
  console.log(`     - baseUrl:   ${baseUrl}`)
  console.log(`     - wsUrl:     ${wsUrl}`)
  console.log(`     - extension: ${profile.extension}`)
  console.log(`     - authToken: ${token ? '***' + token.slice(-6) : '(empty)'}`)

  if (!token) {
    console.log('   ⏳ adapter.start() deferred — no token yet')
    return
  }

  // W1D5: actually connect. Bounded with timeout — if 3CX rejects auth
  // or path, we get a clean error event (no main-process crash thanks to
  // ThreeCXClient's safety-net listener) and can keep ada running.
  const START_TIMEOUT_MS = 10_000
  try {
    const startPromise = pbxAdapter.start()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`adapter.start() timed out after ${START_TIMEOUT_MS}ms`)),
        START_TIMEOUT_MS,
      ),
    )
    await Promise.race([startPromise, timeoutPromise])
    console.log('   🟢 ThreeCXAdapter STARTED — connected to real 3CX')

    const health = await pbxAdapter.healthCheck()
    console.log(`   ✓ healthCheck: healthy=${health.healthy}` +
      (health.message ? ` message="${health.message}"` : ''))
    if (health.details) {
      for (const [k, v] of Object.entries(health.details)) {
        console.log(`     - ${k}: ${JSON.stringify(v)}`)
      }
    }
  } catch (err) {
    console.log('   ⚠️  adapter.start() did not complete:', (err as Error).message)
    console.log('     (ada continues normally; XAPI / Phase 1-5 features unaffected)')
  }

  // W2D2 — wire @voxen/crm-mock + Customer360Service.
  await setupCustomer360()
}

/**
 * Phase 6 W2D2 — instantiate the mock CRM adapter (玉山 demo dataset)
 * and Customer360Service. Run a synthetic lookup after 3 seconds to
 * push a customer profile to the Bar window — proves the full chain
 * (crm-mock → Customer360Service → IPC → Bar UI) before real call.*
 * events arrive (which require live 3CX activity).
 */
async function setupCustomer360(): Promise<void> {
  console.log('   ✓ Wiring @voxen/crm-mock + Customer360Service...')
  const crmMock = createEsunMockAdapter()
  await crmMock.start()
  customer360 = new Customer360Service({
    customerLookup: crmMock,
    callHistory: crmMock,
  })
  console.log('   ✓ Customer360Service ready (10 玉山 demo customers loaded)')

  // Synthetic test — 3 seconds after init, look up 王先生 and push to Bar.
  // Proves the platform-to-UI chain works without needing real 3CX activity.
  setTimeout(() => {
    void (async () => {
      if (!customer360) return
      const profile = await customer360.getProfileByPhone('+886912345001')
      if (!profile) {
        console.log('   ⚠️  W2D2 synthetic test: 王先生 not found in mock')
        return
      }
      console.log(`   📞 W2D2 synthetic lookup: ${profile.customer.displayName} ` +
        `(${profile.recentCalls.length} 通歷史 / lastAgent=${profile.lastAgent ?? 'none'})`)
      if (barWindow && !barWindow.isDestroyed()) {
        barWindow.webContents.send('voxen:customer-profile', profile)
      }
    })()
  }, 3000).unref()
}

/**
 * W2D3 — try to extract a caller phone number from a canonical Event's
 * payload. Defensive about field names since different vendor adapters
 * may use different payload shapes (3CX, Genesys, Asterisk, ...).
 *
 * Returns null if no plausible phone field is found.
 */
function extractPhoneFromEvent(event: { payload?: Record<string, unknown> }): string | null {
  const p = event.payload
  if (!p) return null
  const candidates = [
    'caller', 'callerPhone', 'callerNumber', 'fromPhone',
    'from', 'phoneNumber', 'phone', 'number',
  ]
  for (const key of candidates) {
    const v = p[key]
    if (typeof v === 'string' && v.length >= 8) return v
  }
  return null
}

/**
 * Obtain an XAPI OAuth access token (client_credentials flow).
 * Mirrors ada/src/core/threecx/XapiClient.authenticate() but runs in main.
 *
 * Returns null on any failure (with console log) — never throws.
 */
async function obtainAccessToken(
  pbxFqdn: string,
  clientId: string,
): Promise<string | null> {
  const account = `${pbxFqdn}:${clientId}`
  const clientSecret = await loadCredential(KEYCHAIN_SERVICE, account)
  if (!clientSecret) {
    console.log(`   ⚠️  XAPI client secret not found in keychain (account=${account})`)
    return null
  }

  const url = `https://${pbxFqdn}/connect/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }).toString()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    })
  } catch (err) {
    console.log(`   ✗ OAuth network error: ${(err as Error).message}`)
    return null
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.log(`   ✗ OAuth HTTP ${res.status}: ${errText.slice(0, 200)}`)
    return null
  }

  let json: { access_token?: string }
  try {
    json = (await res.json()) as { access_token?: string }
  } catch (err) {
    console.log(`   ✗ OAuth bad response: ${(err as Error).message}`)
    return null
  }

  if (!json.access_token) {
    console.log('   ✗ OAuth response missing access_token')
    return null
  }

  console.log('   ✓ OAuth token obtained from 3CX (main-side)')
  return json.access_token
}

/** Internal accessor for the EventBus. */
export function getEventBus(): IEventBus {
  if (!eventBus) {
    throw new Error('VOXEN integration not initialised — call initVoxenIntegration() first')
  }
  return eventBus
}

/** Internal accessor for the PBXAdapter (null until profile + XAPI configured). */
export function getPbxAdapter(): PBXAdapter | null {
  return pbxAdapter
}

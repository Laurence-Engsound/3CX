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

import {
  InProcessEventBus,
  type IEventBus,
  type PBXAdapter,
  type TenantId,
} from '@voxen/core'
import { ThreeCXAdapter, type ThreeCXAdapterConfig } from '@voxen/pbx-3cx'
import { getSetting } from './settings-store'
import { loadCredential } from './credentials'
import type { ThreeCxProfile, XapiConfig } from '../shared/types'

const ENGSOUND_TENANT_ID = 'tnt_01HQR0WMRP4Y3M00000000ENG5' as TenantId
const ADA_ADAPTER_ID = 'pbx_3cx_engsound_ada'
const KEYCHAIN_SERVICE = 'ada-xapi'

let eventBus: IEventBus | null = null
let pbxAdapter: PBXAdapter | null = null

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

  // Build base config (with empty token; populated below if XAPI configured)
  const wsUrl = profile.wsUri
  const config: ThreeCXAdapterConfig = {
    adapterId: ADA_ADAPTER_ID,
    tenantId: ENGSOUND_TENANT_ID,
    recordingStorageBackend: 'local-engsound',
    client: {
      baseUrl: `https://${profile.pbxFqdn}`,
      authToken: '',
      ...(wsUrl ? { wsUrl } : {}),
    },
  }

  // Try to obtain XAPI access token from main-side OAuth
  let token: string | null = null
  if (xapi?.enabled && xapi.clientId) {
    token = await obtainAccessToken(profile.pbxFqdn, xapi.clientId)
  } else {
    console.log('   ⚠️  XAPI not enabled in ada Settings — adapter will not start')
    console.log(`     (xapi.enabled=${xapi?.enabled}, clientId="${xapi?.clientId ?? ''}")`)
  }

  if (token) {
    config.client.authToken = token
  }

  // Instantiate (no network)
  pbxAdapter = new ThreeCXAdapter(config, eventBus!)
  console.log('   ✓ ThreeCXAdapter instantiated')
  console.log(`     - adapterId: ${ADA_ADAPTER_ID}`)
  console.log(`     - tenantId:  ${ENGSOUND_TENANT_ID}`)
  console.log(`     - baseUrl:   ${config.client.baseUrl}`)
  console.log(`     - extension: ${profile.extension}`)
  console.log(`     - authToken: ${token ? '***' + token.slice(-6) : '(empty)'}`)

  if (!token) {
    console.log('   ⏳ adapter.start() deferred — no token yet')
    return
  }

  // adapter.start() intentionally deferred — see Day 4 retrospective below.
  console.log('   ✓ Token in hand; ready to connect (start() deferred to W1D5)')
  console.log('   ─────────────────────────────────────────────────────')
  console.log('   📋 W1D4 retrospective:')
  console.log('     ✓ ada → @voxen/core wiring works')
  console.log('     ✓ ada → @voxen/pbx-3cx ThreeCXAdapter instantiated')
  console.log('     ✓ Main-process OAuth (client_credentials) works')
  console.log('     ✗ adapter.start() deferred — @voxen/pbx-3cx ThreeCXClient')
  console.log('       needs two upgrades before it can connect to real 3CX V20:')
  console.log('       (a) WS path + bearer-in-Upgrade auth (currently /events,')
  console.log('           real 3CX uses /callcontrol/ws)')
  console.log('       (b) EventEmitter error handler (unhandled "error" event')
  console.log('           crashes main process — found the hard way today)')
  console.log('   📅 W1D5 plan: extend ThreeCXClient with "real-3cx-v20" mode')
  console.log('   ─────────────────────────────────────────────────────')
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

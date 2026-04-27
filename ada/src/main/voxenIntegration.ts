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

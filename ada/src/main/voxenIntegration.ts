/**
 * VOXEN integration — entry point in ada Main process.
 *
 * Phase 6 Week 1 progressive integration:
 *   - W1D2: import + EventBus instantiation only (ceremonial)
 *   - W1D3: read ada settings → instantiate ThreeCXAdapter (this stage)
 *   - W1D4: actually start() the adapter (needs XAPI auth token wiring)
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
import type { ThreeCxProfile } from '../shared/types'

/**
 * Engsound's own VOXEN tenant ID — used while ada runs in Engsound lab.
 * Future per-customer ada deployments will use customer-specific tenant IDs
 * (e.g., tnt_<...>_ESUN for玉山, picked up from settings or build-time env).
 */
const ENGSOUND_TENANT_ID = 'tnt_01HQR0WMRP4Y3M00000000ENG5' as TenantId

const ADA_ADAPTER_ID = 'pbx_3cx_engsound_ada'

let eventBus: IEventBus | null = null
let pbxAdapter: PBXAdapter | null = null

/**
 * Initialize VOXEN integration. Called once from main/index.ts on app ready.
 * Idempotent — calling twice is a no-op.
 *
 * Behavior:
 *   - Always instantiates EventBus (no config needed)
 *   - If a 3CX profile is configured, instantiates ThreeCXAdapter (but does
 *     NOT call start() — that's W1D4's job once XAPI auth wiring is in place)
 *   - If no profile yet, logs a 🟡 status; adapter will be created when the
 *     user finishes login flow (W1D4 will hook into that)
 */
export function initVoxenIntegration(): void {
  if (eventBus) {
    return
  }

  eventBus = new InProcessEventBus()

  const profile = getSetting('profile') as ThreeCxProfile | null

  if (!profile?.pbxFqdn) {
    console.log('🟡 VOXEN integration loaded — no 3CX profile configured yet')
    console.log('   ✓ EventBus ready')
    console.log('   ⏳ ThreeCXAdapter will be created after user sets profile')
    return
  }

  // Build adapter config from ada's existing 3CX profile.
  // authToken is left empty for now; W1D4 will populate it via the same
  // OAuth flow that ada's useXapiClient already handles in renderer.
  const wsUrl = profile.wsUri  // optional override; capture for conditional spread
  const config: ThreeCXAdapterConfig = {
    adapterId: ADA_ADAPTER_ID,
    tenantId: ENGSOUND_TENANT_ID,
    recordingStorageBackend: 'local-engsound',
    client: {
      baseUrl: `https://${profile.pbxFqdn}`,
      authToken: '',  // W1D4: pull from XAPI OAuth flow
      ...(wsUrl ? { wsUrl } : {}),
    },
  }

  // Instantiate — no network calls. start() is what connects.
  pbxAdapter = new ThreeCXAdapter(config, eventBus)

  console.log('🟢 VOXEN integration loaded')
  console.log(`   ✓ EventBus ready`)
  console.log(`   ✓ ThreeCXAdapter instantiated`)
  console.log(`     - adapterId: ${ADA_ADAPTER_ID}`)
  console.log(`     - tenantId:  ${ENGSOUND_TENANT_ID}`)
  console.log(`     - baseUrl:   ${config.client.baseUrl}`)
  console.log(`     - extension: ${profile.extension}`)
  console.log(`   ⏳ adapter.start() deferred to W1D4 (needs XAPI auth token)`)
}

/** Internal accessor for the EventBus. Used by ada Main subsystems. */
export function getEventBus(): IEventBus {
  if (!eventBus) {
    throw new Error('VOXEN integration not initialised — call initVoxenIntegration() first')
  }
  return eventBus
}

/**
 * Internal accessor for the PBXAdapter.
 * Returns null until profile is configured (and then until W1D4 wires it up).
 */
export function getPbxAdapter(): PBXAdapter | null {
  return pbxAdapter
}

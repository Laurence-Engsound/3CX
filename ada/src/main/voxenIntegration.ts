/**
 * VOXEN integration — entry point in ada Main process.
 *
 * Phase 6 Week 1 Day 2 — first real import.
 *
 * Purpose at this stage: prove that ada can resolve types from @voxen/core
 * and modules from @voxen/pbx-3cx via the pnpm workspace symlink chain.
 * No network connections. No business logic. Pure plumbing verification.
 *
 * Subsequent days will:
 *   - W1D3-D4: replace ada/core/threecx/XapiClient with @voxen/pbx-3cx
 *              ThreeCXAdapter via PBXAdapter contract
 *   - W1D5+:   subscribe ada to canonical events from EventBus
 *   - W2:      wire @voxen/crm-mock for Customer-360 → Bar customer display
 *
 * See ADR-0002 (ada as VOXEN L6 consumer) and PHASE6-PLAN.md v2.
 */

import { InProcessEventBus, type IEventBus, type PBXAdapter } from '@voxen/core'
import type { ThreeCXAdapter } from '@voxen/pbx-3cx'

let eventBus: IEventBus | null = null
let pbxAdapter: PBXAdapter | null = null

/**
 * Initialize VOXEN integration. Called once from main/index.ts on app ready.
 * Idempotent — calling twice is a no-op.
 */
export function initVoxenIntegration(): void {
  if (eventBus) {
    return
  }

  eventBus = new InProcessEventBus()

  // ThreeCXAdapter instantiation deferred — needs real ada settings (PBX
  // FQDN, tenant id, credentials). Will be wired in W1D3 once we read from
  // ada's settings store.
  // Type used to suppress "unused import" warning until then.
  const _adapterTypeRef: ThreeCXAdapter | null = null
  void _adapterTypeRef

  console.log('🟢 VOXEN integration loaded')
  console.log('   ✓ @voxen/core resolved (InProcessEventBus instantiated)')
  console.log('   ✓ @voxen/pbx-3cx resolved (ThreeCXAdapter type imported)')
  console.log('   ⏳ ThreeCXAdapter will be wired in W1D3 (needs settings)')
}

/** Internal accessor for the EventBus. Used by ada Main subsystems. */
export function getEventBus(): IEventBus {
  if (!eventBus) {
    throw new Error('VOXEN integration not initialised — call initVoxenIntegration() first')
  }
  return eventBus
}

/** Internal accessor for the PBXAdapter. Returns null until W1D3 wires it. */
export function getPbxAdapter(): PBXAdapter | null {
  return pbxAdapter
}

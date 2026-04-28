/**
 * Synthetic call-flow driver (Phase 6 W2D7).
 *
 * Publishes a fake inbound-call sequence to the EventBus so the Bar's
 * status state machine + Customer-360 lookup can be demoed without a
 * real 3CX call. Useful for:
 *
 *   - Screencast / pitch demos (no need to coordinate a live caller)
 *   - Manual QA when 3CX is unavailable
 *   - Smoke tests in CI (W3+ when CI lands)
 *
 * Activated by setting the env var VOXEN_DEMO_FLOW=1 before launching ada.
 *
 * Sequence (timing approx — see SCRIPT array):
 *   t=0s    system.adapter.started already happened during boot
 *   t=10s   call.ringing  +886912345001 (王先生 — VIP from 玉山 mock)
 *   t=15s   call.answered
 *   t=25s   call.hold
 *   t=30s   call.unhold
 *   t=40s   call.ended         (Bar enters ACW)
 *   t=45s   (ACW timer expires automatically in Bar — back to Ready)
 *   t=60s   call.ringing  +886912345005 (李太太 — Risk segment)
 *   t=63s   call.ended         (abandoned — Bar back to Ready)
 *
 * Each step is logged so you can watch the cascade:
 *   main console:    `[demo] t=10000ms publishing call.ringing ...`
 *   bus subscriber:  `[bus] call.ringing                    ...`
 *   Bar:             `[bar] status: ready → ringing` + customer card pop-in
 */

import { newCallId, newEventId, type CallId, type IEventBus } from '@voxen/core'

interface DemoStep {
  /** Milliseconds after demo start to fire this step. */
  atMs: number
  /** Canonical event type. Must match @voxen/core EventType enum. */
  type: string
  /** Optional payload — phone number, etc. */
  payload?: Record<string, unknown>
  /** Optional refs.callId override; auto-generated if omitted. */
  callId?: CallId
}

const FIRST_CALL_ID = newCallId()
const SECOND_CALL_ID = newCallId()

const SCRIPT: readonly DemoStep[] = [
  // Inbound from 王先生 (VIP) — full lifecycle
  { atMs: 10_000, type: 'call.ringing',  callId: FIRST_CALL_ID,  payload: { caller: '+886912345001' } },
  { atMs: 15_000, type: 'call.answered', callId: FIRST_CALL_ID,  payload: { caller: '+886912345001' } },
  { atMs: 25_000, type: 'call.hold',     callId: FIRST_CALL_ID,  payload: {} },
  { atMs: 30_000, type: 'call.unhold',   callId: FIRST_CALL_ID,  payload: {} },
  { atMs: 40_000, type: 'call.ended',    callId: FIRST_CALL_ID,  payload: { durationSec: 25 } },

  // Abandoned ring from 李太太 (Risk) — exercises ringing→ready (no ACW)
  // Uses the local-09 format on purpose to flex normalizePhoneTW.
  { atMs: 60_000, type: 'call.ringing',  callId: SECOND_CALL_ID, payload: { caller: '0912345005' } },
  { atMs: 63_000, type: 'call.ended',    callId: SECOND_CALL_ID, payload: { durationSec: 0, abandoned: true } },
] as const

const TENANT_ID = 'tnt_01HQR0WMRP4Y3M00000000ENG5'
const SOURCE_ADAPTER = 'pbx_3cx_engsound_ada__demo'

/**
 * Schedule the synthetic call-flow against the given EventBus.
 * Returns a cancel() handle so callers can abort mid-sequence (e.g.,
 * if a real call comes in we want to stop confusing the agent).
 */
export function startDemoCallFlow(eventBus: IEventBus): () => void {
  console.log('🎬 [demo] VOXEN_DEMO_FLOW=1 — synthetic call sequence scheduled')
  console.log('   Total duration: ~63s. See src/main/demoEvents.ts for timeline.')

  const timers: Array<ReturnType<typeof setTimeout>> = []
  for (const step of SCRIPT) {
    const t = setTimeout(() => {
      const callId = step.callId ?? newCallId()
      const event = {
        id: newEventId(),
        type: step.type,
        tenantId: TENANT_ID,
        occurredAt: new Date().toISOString(),
        ingestedAt: new Date().toISOString(),
        sourceAdapterId: SOURCE_ADAPTER,
        refs: { callId },
        payload: step.payload ?? {},
        payloadSchemaVersion: 'v1',
      }
      console.log(`🎬 [demo] t=${step.atMs}ms publishing ${step.type} callId=${String(callId).slice(-8)}`)
      // Cast-through-unknown: SCRIPT types are intentionally string-loose so
      // this file doesn't have to import every Zod schema. Runtime shape
      // matches @voxen/core Event.
      void eventBus.publish(event as unknown as Parameters<IEventBus['publish']>[0])
    }, step.atMs)
    t.unref()
    timers.push(t)
  }

  return (): void => {
    console.log('🎬 [demo] cancelled — clearing remaining timers')
    for (const t of timers) clearTimeout(t)
  }
}

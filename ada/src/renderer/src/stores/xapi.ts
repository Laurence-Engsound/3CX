import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import type { EventStreamState } from '../../../core/threecx/EventStream'
import { getXapiClient } from '../composables/useXapiClient'
import { triggerScreenPop } from '../../../core/crm/ScreenPop'
import { useSettingsStore } from './settings'

export interface XapiRawLogEntry {
  at: number
  text: string
}

const MAX_LOG = 200

/** Parsed form of the 3CX ExternalCallFlowAppHookEvent envelope. */
interface ParsedEvent {
  sequence?: number
  eventType: number
  entity: string
  attachedData?: unknown
}

/** participant details — we only care about a few fields, the rest is forwarded raw. */
interface ParticipantInfo {
  raw: unknown
  callerNumber?: string
  callerName?: string
  direction?: 'inbound' | 'outbound'
  callId?: string
}

/**
 * Stores Call Control event stream state + drives XAPI Screen Pop.
 *
 * Flow:
 *  1. Raw WS event arrives (`{ event: { event_type, entity } }`)
 *  2. `appendRaw` keeps it in the log AND forwards to `processEvent`
 *  3. If entity is `/callcontrol/{dn}/participants/{id}` and event_type = 0
 *     (Upsert), we fetch `/callcontrol/{dn}/participants/{id}` to get the
 *     caller number, then trigger Screen Pop.
 *  4. event_type = 1 (Remove) clears the tracked participant.
 *
 * De-duplication: each participant key (dn/id) is only popped once per
 * session. If the same id re-appears (call transferred/resumed), that's a
 * fresh event and a fresh pop.
 */
export const useXapiStore = defineStore('xapi', () => {
  const wsState = ref<EventStreamState>('disconnected')
  const wsReason = ref<string | null>(null)
  const log = ref<XapiRawLogEntry[]>([])
  // participant key = `${dn}/${id}` → most recent known info
  const participants = ref(new Map<string, ParticipantInfo>())
  // set of keys we've already triggered Screen Pop for (to avoid duplicates)
  const popped = ref(new Set<string>())

  function setState(state: EventStreamState, reason?: string) {
    wsState.value = state
    wsReason.value = reason ?? null
  }

  function appendRaw(raw: unknown) {
    const text =
      typeof raw === 'string' ? raw : JSON.stringify(raw).slice(0, 2000)
    log.value.unshift({ at: Date.now(), text })
    if (log.value.length > MAX_LOG) log.value.length = MAX_LOG

    const parsed = parseEnvelope(raw)
    if (parsed) void processEvent(parsed)
  }

  function clear() {
    log.value = []
  }

  /**
   * Normalize the raw WS message into our ParsedEvent shape.
   *
   * Accepts both snake_case (observed on V20) and PascalCase (docs) variants.
   */
  function parseEnvelope(raw: unknown): ParsedEvent | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const ev = (o.event ?? o.Event) as Record<string, unknown> | undefined
    if (!ev) return null
    const eventType = Number(ev.event_type ?? ev.EventType ?? -1)
    const entity = String(ev.entity ?? ev.Entity ?? '')
    if (!entity || Number.isNaN(eventType)) return null
    return {
      sequence: typeof o.sequence === 'number' ? o.sequence : undefined,
      eventType,
      entity,
      attachedData: ev.attached_data ?? ev.AttachedData
    }
  }

  /** match `/callcontrol/{dn}/participants/{id}` (no trailing path). */
  function matchParticipantPath(
    entity: string
  ): { dn: string; id: string } | null {
    const m = entity.match(
      /^\/callcontrol\/([^/]+)\/participants\/([^/]+)$/
    )
    if (!m) return null
    return { dn: m[1], id: m[2] }
  }

  async function processEvent(event: ParsedEvent): Promise<void> {
    const p = matchParticipantPath(event.entity)
    if (!p) return
    const key = `${p.dn}/${p.id}`

    if (event.eventType === 1) {
      // Remove → call ended for this participant
      participants.value.delete(key)
      popped.value.delete(key)
      return
    }

    if (event.eventType !== 0) return // only Upsert drives pops

    if (popped.value.has(key)) return // already handled this leg

    // Stash a placeholder so the UI can see "we know about this participant
    // but haven't loaded details yet" without a second fetch.
    if (!participants.value.has(key)) {
      participants.value.set(key, { raw: null })
    }

    const xapi = getXapiClient()
    if (!xapi || !xapi.authenticated) return

    let info: ParticipantInfo
    try {
      const body = await xapi.getParticipant(p.dn, p.id)
      info = extractParticipant(body)
    } catch (err) {
      console.warn('[xapi] getParticipant failed', err)
      return
    }

    participants.value.set(key, info)

    // Log the fetched details for easy inspection. Limit is generous so we
    // can actually see 3CX's full participant shape during Phase 4 tuning.
    log.value.unshift({
      at: Date.now(),
      text: `↳ participant ${p.dn}/${p.id}: ${JSON.stringify(info.raw).slice(0, 2000)}`
    })
    if (log.value.length > MAX_LOG) log.value.length = MAX_LOG

    if (!info.callerNumber) return
    const settings = useSettingsStore()
    const direction: 'inbound' | 'outbound' =
      info.direction ?? 'inbound'
    await triggerScreenPop(settings.state.screenPop, {
      caller: info.callerNumber,
      callId: info.callId ?? `${p.dn}/${p.id}`,
      direction
    })
    popped.value.add(key)
  }

  /**
   * Best-effort extraction from the participant JSON. Different 3CX V20
   * builds use slightly different field names; we try a few and fall back
   * to returning raw with no derived fields (which means no Screen Pop).
   */
  function extractParticipant(body: unknown): ParticipantInfo {
    if (!body || typeof body !== 'object') return { raw: body }
    const o = body as Record<string, unknown>

    // Observed V20 participant shape (from live call logs):
    //   { id, status, dn, party_caller_name, party_dn, party_callee_id?,
    //     party_caller_id?, devices, … }
    //
    // For outbound from ext 1000 to 0889:
    //   dn = "1000"            (our side)
    //   party_dn = "ROUTER"    (routing tag, not useful as number)
    //   party_callee_id = "0889"  (the dialed number)
    //
    // For inbound from 0912345678 to ext 1000:
    //   dn = "1000"
    //   party_caller_id = "0912345678"
    //
    // We pick the first non-empty of the candidate fields. Numeric-looking
    // values win over "ROUTER"-style routing tags.
    const candidates = [
      o.party_callee_id,
      o.party_caller_id,
      o.PartyCalleeId,
      o.PartyCallerId,
      o.callee_id,
      o.caller_id,
      o.remote_number,
      o.from,
      o.to
    ]
    let remote = ''
    for (const c of candidates) {
      const v = String(c ?? '').trim()
      if (v && v !== 'ROUTER') {
        remote = v
        break
      }
    }

    const remoteName = String(
      o.party_caller_name ??
        o.party_callee_name ??
        o.PartyCallerName ??
        ''
    ).trim()

    // Direction — first try explicit fields, then fall back to `status`.
    const directionStr = String(
      o.direction ?? o.Direction ?? o.call_direction ?? ''
    ).toLowerCase()
    const status = String(o.status ?? o.Status ?? '').toLowerCase()

    let direction: 'inbound' | 'outbound' | undefined
    if (directionStr.includes('in')) direction = 'inbound'
    else if (directionStr.includes('out')) direction = 'outbound'
    // Heuristic: "Dialing" = we initiated the call, "Ringing" on our side
    // means someone's calling us.
    else if (status === 'dialing') direction = 'outbound'
    else if (status === 'ringing') direction = 'inbound'

    const callId = String(
      o.callid ?? o.call_id ?? o.CallId ?? o.id ?? o.Id ?? ''
    )

    return {
      raw: body,
      callerNumber: remote || undefined,
      callerName: remoteName || undefined,
      direction,
      callId: callId || undefined
    }
  }

  return {
    wsState,
    wsReason,
    log,
    participants,
    setState,
    appendRaw,
    clear
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useXapiStore, import.meta.hot))
}

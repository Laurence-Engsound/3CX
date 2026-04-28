<script setup lang="ts">
/**
 * BarView — Softphone Bar (Phase 6 W1D7 first cut).
 *
 * Renders inside a 40px-tall always-on-top frameless BrowserWindow
 * (see ada/src/main/barWindow.ts).
 *
 * Drag UX: the entire bar is `-webkit-app-region: drag`. Buttons opt out
 * with `no-drag`. An explicit `<div class="drag-handle">` fills the
 * spacer area so users always have somewhere obvious to grab.
 *
 * W1D8+: real call state, action handlers, EventBus subscription.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()

// W2D1: subscribe to canonical events forwarded from main process via IPC.
// W2D2: also subscribe to customer profile lookups (e.g., on incoming call).
// W2D6: derive a Bar status state machine from the same event stream.
let unsubscribeEvent: (() => void) | null = null
let unsubscribeProfile: (() => void) | null = null
const eventCount = ref(0)
const lastEventType = ref<string>('—')

interface CustomerInfo {
  displayName: string
  segment?: string
  recentCallsCount: number
  lastAgent: string | null
}
const customer = ref<CustomerInfo | null>(null)

// W2D6 — Bar status state machine.
//
//   offline ──[adapter.started / health=true]──> ready
//   ready   ──[call.ringing]──> ringing
//   ringing ──[call.answered]──> busy
//   ringing ──[call.ended]──> ready (abandoned, no answer)
//   busy    ──[call.hold/unhold/transferred]──> busy (stays)
//   busy    ──[call.ended]──> acw ──[ACW_TIMEOUT_MS]──> ready
//   any     ──[adapter.stopped/error/health=false]──> offline
//
// Initial = 'offline'. The W2D5 buffer replay flips us to 'ready' as soon
// as system.adapter.started is replayed (or first arrives live).
type BarStatus = 'offline' | 'ready' | 'ringing' | 'busy' | 'acw'
const status = ref<BarStatus>('offline')

const ACW_TIMEOUT_MS = 5_000
let acwTimer: ReturnType<typeof setTimeout> | null = null

interface VoxenEventLike {
  type?: string
  payload?: Record<string, unknown>
}

function applyEventToStatus(prev: BarStatus, event: VoxenEventLike): BarStatus {
  const t = event.type ?? ''

  // System events — connection / health
  if (t === 'system.adapter.started') return 'ready'
  if (t === 'system.adapter.stopped' || t === 'system.adapter.error') return 'offline'
  if (t === 'system.adapter.health_changed') {
    const healthy = (event.payload?.healthy as boolean | undefined) ?? false
    return healthy ? (prev === 'offline' ? 'ready' : prev) : 'offline'
  }

  // Call lifecycle
  if (t === 'call.ringing') {
    // Ignore duplicate rings if we're already in a call (consultation, etc.)
    return prev === 'busy' || prev === 'ringing' ? prev : 'ringing'
  }
  if (t === 'call.answered') return 'busy'
  if (t === 'call.hold' || t === 'call.unhold' || t === 'call.transferred') {
    return prev === 'busy' ? 'busy' : prev
  }
  if (t === 'call.ended') {
    // Ringing → ended without answer = abandoned, back to ready (no ACW).
    // Busy → ended = normal hangup, enter ACW for wrap-up.
    if (prev === 'ringing') return 'ready'
    if (prev === 'busy') return 'acw'
    return prev
  }

  return prev  // unknown event — leave status unchanged
}

function transitionStatus(next: BarStatus): void {
  if (next === status.value) return

  // Clear any pending ACW timer when leaving ACW or moving sideways
  if (acwTimer) {
    clearTimeout(acwTimer)
    acwTimer = null
  }

  // eslint-disable-next-line no-console
  console.log(`[bar] status: ${status.value} → ${next}`)
  status.value = next

  // Auto-exit ACW after timeout
  if (next === 'acw') {
    acwTimer = setTimeout(() => {
      if (status.value === 'acw') {
        // eslint-disable-next-line no-console
        console.log('[bar] ACW timeout → ready')
        status.value = 'ready'
        // Optionally clear the customer card after wrap-up (W3+ may want
        // to keep history). For now keep it visible — agent still seeing
        // the just-finished call's customer.
      }
      acwTimer = null
    }, ACW_TIMEOUT_MS)
  }
}

onMounted(async () => {
  await settings.load()

  if (window.voxen?.onEvent) {
    unsubscribeEvent = window.voxen.onEvent((event) => {
      const e = event as VoxenEventLike
      eventCount.value++
      lastEventType.value = e.type ?? 'unknown'
      // W2D6 — drive status state machine from this event
      const next = applyEventToStatus(status.value, e)
      transitionStatus(next)
      // eslint-disable-next-line no-console
      console.log('[bar] received voxen event:', event)
    })
    unsubscribeProfile = window.voxen.onCustomerProfile((profile) => {
      customer.value = {
        displayName: profile.customer.displayName ?? profile.customer.primaryPhone,
        segment: profile.customer.segment,
        recentCallsCount: profile.recentCalls.length,
        lastAgent: profile.lastAgent,
      }
      // eslint-disable-next-line no-console
      console.log('[bar] customer profile received:', profile)
    })
    // eslint-disable-next-line no-console
    console.log('[bar] subscribed to voxen events + customer profiles via IPC')
  } else {
    // eslint-disable-next-line no-console
    console.warn('[bar] window.voxen API not available')
  }
})

onUnmounted(() => {
  unsubscribeEvent?.()
  unsubscribeProfile?.()
  if (acwTimer) {
    clearTimeout(acwTimer)
    acwTimer = null
  }
})

const extension = computed(() => settings.state.profile?.extension ?? '----')
const fqdn = computed(() => settings.state.profile?.pbxFqdn ?? '(no PBX)')

// W2D4 — Bar action invocation. Renderer → main → PBXAdapter (or stub).
type BarAction = 'answer' | 'hold' | 'mute' | 'transfer' | 'keypad' | 'menu'
const lastAction = ref<string>('—')
const lastActionOk = ref<boolean | null>(null)

async function invokeAction(action: BarAction): Promise<void> {
  lastAction.value = action
  // eslint-disable-next-line no-console
  console.log('[bar] invokeAction →', action)
  try {
    const result = await window.voxen.invokeBarAction(action)
    lastActionOk.value = result.ok
    // eslint-disable-next-line no-console
    console.log('[bar] result:', result)
  } catch (err) {
    lastActionOk.value = false
    // eslint-disable-next-line no-console
    console.error('[bar] invokeAction failed:', err)
  }
}

// W2D6 — status label + dot class derived from the BarStatus state machine.
const STATUS_LABELS: Record<BarStatus, string> = {
  offline: 'Offline',
  ready: 'Ready',
  ringing: 'Ringing',
  busy: 'Busy',
  acw: 'ACW',
}
const statusLabel = computed(() => STATUS_LABELS[status.value])
const statusDotClass = computed(() => `status-dot status-${status.value}`)
</script>

<template>
  <div class="softphone-bar">
    <div class="cell brand">
      <span class="brand-name">VOXEN</span>
    </div>

    <div class="cell status">
      <span :class="statusDotClass"></span>
      <span class="status-label">{{ statusLabel }}</span>
    </div>

    <div class="separator"></div>

    <div class="cell extension">
      <span class="ext-label">Ext</span>
      <span class="ext-value">{{ extension }}</span>
    </div>

    <div class="separator"></div>

    <div class="cell pbx-info">
      <span class="pbx-fqdn">{{ fqdn }}</span>
    </div>

    <div class="separator"></div>

    <!-- W2D1 IPC verification: visible event counter -->
    <div class="cell ipc-debug" :title="`Last: ${lastEventType}`">
      <span class="ipc-label">evt</span>
      <span class="ipc-count">{{ eventCount }}</span>
    </div>

    <!-- W2D4 IPC verification: last action invoked + ok/err state -->
    <div class="cell act-debug" :class="{
        'act-ok': lastActionOk === true,
        'act-err': lastActionOk === false,
      }" :title="`Last action: ${lastAction}`">
      <span class="act-label">act</span>
      <span class="act-value">{{ lastAction }}</span>
    </div>

    <!-- W2D2: customer info from Customer-360 lookup -->
    <div v-if="customer" class="cell customer-card" :title="`Last agent: ${customer.lastAgent ?? '—'}`">
      <span class="cust-icon">👤</span>
      <span class="cust-name">{{ customer.displayName }}</span>
      <span v-if="customer.segment" class="cust-segment" :class="`seg-${customer.segment.toLowerCase()}`">
        {{ customer.segment }}
      </span>
      <span class="cust-history">{{ customer.recentCallsCount }} 通</span>
    </div>

    <!-- Drag handle fills remaining space. Explicit drag region. -->
    <div class="drag-handle"></div>

    <div class="actions">
      <button class="action-btn" title="Answer" @click="invokeAction('answer')">📞</button>
      <button class="action-btn" title="Hold" @click="invokeAction('hold')">⏸</button>
      <button class="action-btn" title="Mute" @click="invokeAction('mute')">🔇</button>
      <button class="action-btn" title="Transfer" @click="invokeAction('transfer')">🔀</button>
      <button class="action-btn" title="Keypad" @click="invokeAction('keypad')">⌨</button>
      <button class="action-btn" title="Menu" @click="invokeAction('menu')">☰</button>
    </div>
  </div>
</template>

<style scoped>
/* The whole bar acts as default drag region. Specific elements opt out. */
.softphone-bar {
  -webkit-app-region: drag;
  user-select: none;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 14px;
  gap: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #1e293b;
}

.cell {
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.brand-name {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: #0f766e;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-ready { background: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
.status-busy { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
.status-offline { background: #94a3b8; }
.status-ringing {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
  animation: ring-pulse 1s ease-in-out infinite;
}
.status-acw {
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
@keyframes ring-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  50%      { transform: scale(1.25); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.30); }
}
.status-label {
  font-weight: 500;
  color: #475569;
}

.separator {
  -webkit-app-region: drag;
  width: 1px;
  height: 18px;
  background: #e2e8f0;
  flex-shrink: 0;
}

.extension {
  align-items: baseline !important;
}
.ext-label {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}
.ext-value {
  color: #1e293b;
  font-weight: 600;
  font-family: 'SF Mono', monospace;
  font-size: 14px;
}

.pbx-info {
  color: #64748b;
  font-size: 11.5px;
  font-family: 'SF Mono', monospace;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* W2D1 IPC verification — visible event counter */
.ipc-debug {
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 4px;
  padding: 2px 8px;
  align-items: baseline !important;
}
.ipc-label {
  color: #0f766e;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.ipc-count {
  color: #0f766e;
  font-weight: 700;
  font-size: 13px;
  font-family: 'SF Mono', monospace;
  min-width: 16px;
  text-align: right;
}

/* W2D4 — last-action indicator */
.act-debug {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 8px;
  align-items: baseline !important;
  transition: background 0.15s, border-color 0.15s;
}
.act-debug.act-ok {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.act-debug.act-err {
  background: #fef2f2;
  border-color: #fecaca;
}
.act-label {
  color: #64748b;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.act-debug.act-ok .act-label { color: #047857; }
.act-debug.act-err .act-label { color: #b91c1c; }
.act-value {
  color: #1e293b;
  font-weight: 600;
  font-size: 11px;
  font-family: 'SF Mono', monospace;
  min-width: 32px;
  text-align: left;
}
.act-debug.act-ok .act-value { color: #047857; }
.act-debug.act-err .act-value { color: #b91c1c; }

/* W2D2 — customer card from Customer-360 lookup */
.customer-card {
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 4px;
  padding: 2px 8px;
  gap: 6px !important;
  margin-left: 4px;
}
.cust-icon {
  font-size: 12px;
}
.cust-name {
  font-weight: 600;
  color: #92400e;
  font-size: 13px;
}
.cust-segment {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  border-radius: 2px;
  background: #fff;
  color: #475569;
}
.cust-segment.seg-vip {
  background: #f59e0b;
  color: #fff;
}
.cust-segment.seg-risk {
  background: #ef4444;
  color: #fff;
}
.cust-history {
  font-size: 10.5px;
  color: #92400e;
  font-family: 'SF Mono', monospace;
}

.drag-handle {
  -webkit-app-region: drag;
  flex: 1;
  height: 100%;
  min-width: 60px;
}

.actions {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.action-btn {
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.12s;
}
.action-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #e2e8f0;
}
.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

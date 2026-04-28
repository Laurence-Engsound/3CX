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
// For now: just console.log to prove the bridge works. W2D2 will translate
// events to reactive UI state (status, customer info, call timer).
let unsubscribe: (() => void) | null = null
const eventCount = ref(0)
const lastEventType = ref<string>('—')

onMounted(async () => {
  await settings.load()

  if (window.voxen?.onEvent) {
    unsubscribe = window.voxen.onEvent((event) => {
      const e = event as { type?: string }
      eventCount.value++
      lastEventType.value = e.type ?? 'unknown'
      // eslint-disable-next-line no-console
      console.log('[bar] received voxen event:', event)
    })
    // eslint-disable-next-line no-console
    console.log('[bar] subscribed to voxen events via IPC')
  } else {
    // eslint-disable-next-line no-console
    console.warn('[bar] window.voxen.onEvent not available')
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

const extension = computed(() => settings.state.profile?.extension ?? '----')
const fqdn = computed(() => settings.state.profile?.pbxFqdn ?? '(no PBX)')

// Placeholder — W1D8 wires this from EventBus / call state.
const status = ref<'ready' | 'busy' | 'offline'>('ready')
const statusLabel = computed(() => {
  if (status.value === 'ready') return 'Ready'
  if (status.value === 'busy') return 'Busy'
  return 'Offline'
})
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

    <!-- Drag handle fills remaining space. Explicit drag region. -->
    <div class="drag-handle"></div>

    <div class="actions">
      <button class="action-btn" disabled title="Answer (W1D8)">📞</button>
      <button class="action-btn" disabled title="Hold (W1D8)">⏸</button>
      <button class="action-btn" disabled title="Mute (W1D8)">🔇</button>
      <button class="action-btn" disabled title="Transfer (W1D8)">🔀</button>
      <button class="action-btn" disabled title="Keypad (W1D8)">⌨</button>
      <button class="action-btn" disabled title="Menu (W1D8)">☰</button>
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
.status-busy { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
.status-offline { background: #94a3b8; }
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

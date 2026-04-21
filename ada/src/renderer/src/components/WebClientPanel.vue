<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useWebclientStore, type WebClientEvent } from '../stores/webclient'

/**
 * Embedded 3CX Web Client wrapper.
 *
 * Lives at the App level — ALWAYS mounted — so that navigating between
 * settings/history/phone doesn't destroy the <webview>. Electron's
 * <webview> is a BrowserPlugin; removing it from the DOM (which is what
 * Vue Router or <keep-alive> would do) destroys the underlying
 * WebContents and kills any active call.
 *
 * Parent controls visibility via v-show so the element stays in the DOM.
 */
const settings = useSettingsStore()
const webclient = useWebclientStore()
const webviewRef = ref<HTMLElement | null>(null)
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const preloadPath = ref<string>('')

const webclientUrl = computed(() => {
  const fqdn = settings.state.profile?.pbxFqdn
  if (!fqdn) return ''
  return `https://${fqdn}/webclient`
})

onMounted(async () => {
  // Even if no profile yet, we still render the shell; the <webview>
  // itself is v-if'd on webclientUrl so it won't spin up until needed.
  preloadPath.value = await window.ada.paths.getWebviewPreload()
  await nextTick()

  const wv = webviewRef.value as
    | (HTMLElement & {
        addEventListener: HTMLElement['addEventListener']
        reload: () => void
        openDevTools: () => void
      })
    | null
  if (!wv) return

  wv.addEventListener('did-start-loading', () => {
    isLoading.value = true
    loadError.value = null
  })
  wv.addEventListener('did-stop-loading', () => {
    isLoading.value = false
  })
  wv.addEventListener('did-fail-load', (e: Event) => {
    const ev = e as Event & { errorCode?: number; errorDescription?: string }
    if (ev.errorCode && ev.errorCode !== -3) {
      loadError.value = `${ev.errorCode}: ${ev.errorDescription ?? 'unknown error'}`
    }
  })
  wv.addEventListener('ipc-message', (e: Event) => {
    const msg = e as Event & { channel?: string; args?: unknown[] }
    if (msg.channel === 'webclient-event' && Array.isArray(msg.args)) {
      webclient.ingest(msg.args[0] as WebClientEvent)
    }
  })
})

function reloadWebview() {
  const wv = webviewRef.value as (HTMLElement & { reload: () => void }) | null
  wv?.reload()
}

function openDevTools() {
  const wv = webviewRef.value as (HTMLElement & { openDevTools: () => void }) | null
  wv?.openDevTools()
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function summarize(ev: WebClientEvent): string {
  switch (ev.type) {
    case 'ready':
      return 'preload ready'
    case 'title':
      return `title → ${ev.title}`
    case 'url':
      return `url → ${ev.url}`
    case 'console':
      return `[${ev.level}] ${ev.args.map(String).join(' ').slice(0, 200)}`
    case 'call':
      return `call/${ev.subtype} ${ev.data.remoteNumber ?? '?'} (${ev.data.raw ?? ''})`
  }
}

defineOptions({ name: 'WebClientPanel' })
</script>

<template>
  <div class="flex h-full flex-col">
    <div
      class="flex h-9 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 text-xs"
    >
      <span class="text-slate-500">3CX Web Client</span>
      <span class="font-mono text-slate-700">{{ webclientUrl || '（請先在設定填入 PBX FQDN）' }}</span>
      <span v-if="isLoading" class="text-amber-600">載入中…</span>
      <span
        v-if="webclient.callState !== 'idle'"
        class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
      >
        {{ webclient.callState === 'incoming' ? '來電' : '通話中' }}
        <template v-if="webclient.lastCaller"> · {{ webclient.lastCaller }}</template>
      </span>
      <span class="flex-1" />
      <button
        class="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
        :class="webclient.debugPanelOpen ? 'bg-slate-100' : ''"
        title="事件除錯面板"
        @click="webclient.toggleDebugPanel"
      >
        🐞
      </button>
      <button
        class="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
        title="重新載入"
        @click="reloadWebview"
      >
        ⟳
      </button>
      <button
        class="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
        title="開啟 webview DevTools"
        @click="openDevTools"
      >
        ⌘
      </button>
    </div>

    <div
      v-if="loadError"
      class="m-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
    >
      載入 3CX Web Client 失敗：{{ loadError }}
    </div>

    <div class="flex flex-1 overflow-hidden">
      <webview
        v-if="webclientUrl && preloadPath"
        ref="webviewRef"
        :src="webclientUrl"
        :preload="preloadPath"
        class="h-full flex-1"
        allowpopups
        partition="persist:3cx"
        useragent="Mozilla/5.0 (ADA Webview) 3CX-Agent-Desktop/0.1"
      />

      <aside
        v-if="webclient.debugPanelOpen"
        class="flex w-96 shrink-0 flex-col border-l border-slate-200 bg-slate-50"
      >
        <header
          class="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 text-xs font-medium"
        >
          <span>Web Client 事件（{{ webclient.events.length }}）</span>
          <button
            class="text-slate-500 hover:text-slate-700"
            @click="webclient.clear"
          >
            清除
          </button>
        </header>
        <div class="flex-1 overflow-auto px-2 py-1 font-mono text-[11px]">
          <div
            v-for="(e, i) in webclient.events"
            :key="i"
            class="border-b border-slate-200 py-1 last:border-b-0"
            :class="{
              'text-rose-700':
                e.event.type === 'console' && e.event.level === 'error',
              'text-amber-700':
                e.event.type === 'console' && e.event.level === 'warn',
              'text-emerald-700 font-semibold': e.event.type === 'call'
            }"
          >
            <span class="text-slate-400">{{ formatTime(e.at) }}</span>
            <span class="ml-2">{{ summarize(e.event) }}</span>
          </div>
          <div
            v-if="webclient.events.length === 0"
            class="py-4 text-center text-slate-400"
          >
            （尚無事件。按下 ⟳ 重新載入觸發首批事件）
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
webview {
  display: inline-flex;
  width: 100%;
  flex: 1 1 auto;
}
</style>

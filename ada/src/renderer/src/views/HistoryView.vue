<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getXapiClient } from '../composables/useXapiClient'
import { useSettingsStore } from '../stores/settings'

defineOptions({ name: 'HistoryView' })

interface CdrRow {
  raw: Record<string, unknown>
  time: string
  from: string
  to: string
  direction: 'inbound' | 'outbound' | 'internal' | 'unknown'
  durationSeconds: number
}

const settings = useSettingsStore()
const router = useRouter()
const loading = ref(false)
const errorMsg = ref<string | null>(null)
/**
 * xapi-available = XAPI endpoints worked; table is populated.
 * xapi-forbidden = 403 on all CDR endpoints (User role limitation); show
 *                  a hint and a one-click jump to the embedded Web Client.
 * xapi-missing   = nothing found; same UX as forbidden.
 */
const mode = ref<'loading' | 'xapi-available' | 'xapi-blocked'>('loading')
const endpoint = ref<string | null>(null)
const rows = ref<CdrRow[]>([])
const rawBody = ref<string | null>(null)

function normalize(entry: unknown, myExt?: string): CdrRow {
  const o = (entry && typeof entry === 'object'
    ? (entry as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const time =
    (o.StartTime as string) ??
    (o.CallTime as string) ??
    (o.TimeStart as string) ??
    ''
  const from = String(o.SourceCallerId ?? o.CallerId ?? o.From ?? '')
  const to = String(o.DestinationCallerId ?? o.Destination ?? o.To ?? '')
  const durationRaw = String(
    o.Duration ?? o.CallDuration ?? o.TotalDuration ?? ''
  )
  let durationSeconds = 0
  if (/^\d+$/.test(durationRaw)) durationSeconds = parseInt(durationRaw, 10)
  else if (durationRaw.includes(':')) {
    const parts = durationRaw.split(':').map((p) => parseInt(p, 10) || 0)
    if (parts.length === 3)
      durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1]
  }
  let direction: CdrRow['direction'] = 'unknown'
  if (myExt) {
    if (from === myExt) direction = 'outbound'
    else if (to === myExt) direction = 'inbound'
    else direction = 'internal'
  }
  return { raw: o, time, from, to, direction, durationSeconds }
}

function formatTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-TW', { hour12: false })
}

function formatDuration(sec: number): string {
  if (!sec) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

async function reload() {
  loading.value = true
  errorMsg.value = null
  rows.value = []
  rawBody.value = null
  mode.value = 'loading'

  const client = getXapiClient()
  if (!client) {
    errorMsg.value = '尚未連線 XAPI — 請到設定頁按「測試連線」。'
    mode.value = 'xapi-blocked'
    loading.value = false
    return
  }
  if (!client.authenticated) {
    errorMsg.value = 'XAPI token 已過期 — 請到設定頁按「測試連線」。'
    mode.value = 'xapi-blocked'
    loading.value = false
    return
  }
  try {
    const myExt = settings.state.profile?.extension
    const result = await client.listCallHistory({ extension: myExt, top: 50 })
    endpoint.value = result.endpoint
    rows.value = result.entries.map((e) => normalize(e, myExt))
    rawBody.value = JSON.stringify(result.entries.slice(0, 3), null, 2)
    mode.value = 'xapi-available'
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
    mode.value = 'xapi-blocked'
  } finally {
    loading.value = false
  }
}

/**
 * Jump to the phone view and programmatically navigate the embedded
 * webview to 3CX's own Calls history page. This works regardless of
 * XAPI permissions because the Web Client session uses the user's own
 * credentials (full access to their own call log).
 */
function openWebClientHistory() {
  router.push('/phone').then(() => {
    // Find the <webview> element in the persistent WebClientPanel and
    // send it to the Calls history URL.
    const wv = document.querySelector('webview') as
      | (HTMLElement & {
          loadURL?: (url: string) => Promise<void>
          getURL?: () => string
        })
      | null
    const fqdn = settings.state.profile?.pbxFqdn
    if (wv && fqdn && typeof wv.loadURL === 'function') {
      void wv.loadURL(`https://${fqdn}/webclient/#/call_history`)
    }
  })
}

onMounted(reload)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-3 flex items-center gap-3">
      <h1 class="text-xl font-semibold">通話紀錄</h1>
      <span v-if="endpoint" class="text-xs text-slate-400">
        {{ endpoint }}
      </span>
      <span class="flex-1" />
      <button
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="loading"
        @click="reload"
      >
        {{ loading ? '載入中…' : '重新整理' }}
      </button>
    </div>

    <!-- 如果 XAPI 讀得到 CDR，顯示表格 -->
    <table
      v-if="mode === 'xapi-available' && rows.length > 0"
      class="w-full overflow-hidden rounded-md bg-white text-sm ring-1 ring-slate-200"
    >
      <thead class="bg-slate-50 text-xs text-slate-500">
        <tr>
          <th class="px-3 py-2 text-left">時間</th>
          <th class="px-3 py-2 text-left">方向</th>
          <th class="px-3 py-2 text-left">來源</th>
          <th class="px-3 py-2 text-left">目的</th>
          <th class="px-3 py-2 text-right">時長</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in rows"
          :key="i"
          class="border-t border-slate-100 hover:bg-slate-50"
        >
          <td class="px-3 py-2 text-slate-600">{{ formatTime(r.time) }}</td>
          <td class="px-3 py-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="{
                'bg-emerald-100 text-emerald-700': r.direction === 'inbound',
                'bg-sky-100 text-sky-700': r.direction === 'outbound',
                'bg-slate-100 text-slate-600':
                  r.direction === 'internal' || r.direction === 'unknown'
              }"
            >
              {{
                r.direction === 'inbound'
                  ? '來電'
                  : r.direction === 'outbound'
                    ? '撥出'
                    : r.direction === 'internal'
                      ? '內線'
                      : '?'
              }}
            </span>
          </td>
          <td class="px-3 py-2 font-mono">{{ r.from || '-' }}</td>
          <td class="px-3 py-2 font-mono">{{ r.to || '-' }}</td>
          <td class="px-3 py-2 text-right font-mono">
            {{ formatDuration(r.durationSeconds) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 如果 XAPI 沒辦法讀（403 等） — 引導去 Web Client -->
    <div
      v-if="mode === 'xapi-blocked'"
      class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p class="font-medium">XAPI 無法讀取 CDR</p>
      <p class="mt-1 text-xs leading-relaxed">
        原因：Service Principal 的 Role 為 <code>User</code>，沒有 CDR
        報表存取權（需要 Admin 等級，但考量安全性我們選擇不升）。細節見
        <code>docs/PHASE4-TESTING.md</code> §5。
      </p>
      <p
        v-if="errorMsg"
        class="mt-2 rounded bg-amber-100 px-2 py-1 font-mono text-[11px]"
      >
        {{ errorMsg }}
      </p>
      <p class="mt-3 text-xs">
        替代方案：3CX Web Client 本身就有您自己的通話紀錄（用的是您分機的
        session，不受 ADA 的 Service Principal 限制）。
      </p>
      <button
        class="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        @click="openWebClientHistory"
      >
        在 Web Client 查看通話紀錄 →
      </button>
    </div>

    <div
      v-if="mode === 'xapi-available' && rows.length === 0 && !loading"
      class="rounded-md bg-white p-6 text-center text-sm text-slate-400 ring-1 ring-slate-200"
    >
      尚無通話紀錄
    </div>

    <details
      v-if="rawBody"
      class="mt-4 rounded-md border border-slate-200 bg-slate-50 text-xs"
    >
      <summary class="cursor-pointer select-none px-3 py-1.5 font-medium">
        原始回應樣本（前 3 筆）
      </summary>
      <pre
        class="max-h-80 overflow-auto border-t border-slate-200 p-3 font-mono"
        >{{ rawBody }}</pre
      >
    </details>
  </div>
</template>

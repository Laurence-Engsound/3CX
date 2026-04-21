<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import type { CallDirection } from '../../../shared/types'
import { recreateXapiClient } from '../composables/useXapiClient'

const settings = useSettingsStore()

const triggerInbound = computed(() =>
  settings.state.screenPop.triggerOn.includes('inbound')
)
const triggerOutbound = computed(() =>
  settings.state.screenPop.triggerOn.includes('outbound')
)

function setDirection(direction: CallDirection, on: boolean) {
  const current = new Set(settings.state.screenPop.triggerOn)
  if (on) current.add(direction)
  else current.delete(direction)
  settings.setScreenPop({
    ...settings.state.screenPop,
    triggerOn: Array.from(current) as CallDirection[]
  })
}

/* ---------- XAPI section ---------- */

const xapiForm = reactive({
  clientId: settings.state.xapi.clientId,
  clientSecret: '',
  autoConnect: settings.state.xapi.autoConnect,
  enabled: settings.state.xapi.enabled
})

const xapiBusy = ref(false)
const xapiResult = ref<{ ok: boolean; message: string } | null>(null)

function xapiKey(): string {
  const fqdn = settings.state.profile?.pbxFqdn ?? ''
  return `${fqdn}:${xapiForm.clientId || settings.state.xapi.clientId}`
}

async function saveXapi() {
  xapiBusy.value = true
  xapiResult.value = null

  try {
    await settings.setXapi({
      enabled: xapiForm.enabled,
      clientId: xapiForm.clientId.trim(),
      autoConnect: xapiForm.autoConnect
    })

    if (xapiForm.clientSecret) {
      await window.ada.credentials.save(
        'ada-xapi',
        xapiKey(),
        xapiForm.clientSecret
      )
      xapiForm.clientSecret = ''
    }

    xapiResult.value = { ok: true, message: '已儲存' }
  } catch (err) {
    xapiResult.value = {
      ok: false,
      message: err instanceof Error ? err.message : String(err)
    }
  } finally {
    xapiBusy.value = false
  }
}

async function testXapi() {
  xapiBusy.value = true
  xapiResult.value = null

  const fqdn = settings.state.profile?.pbxFqdn
  if (!fqdn) {
    xapiResult.value = { ok: false, message: '請先在登入頁設定 PBX FQDN' }
    xapiBusy.value = false
    return
  }
  const clientId = xapiForm.clientId.trim() || settings.state.xapi.clientId
  if (!clientId) {
    xapiResult.value = { ok: false, message: '請填入 Client ID' }
    xapiBusy.value = false
    return
  }

  // Secret: prefer the just-typed value, else the saved one.
  let clientSecret = xapiForm.clientSecret
  if (!clientSecret) {
    const stored = await window.ada.credentials.load('ada-xapi', xapiKey())
    if (!stored) {
      xapiResult.value = {
        ok: false,
        message: '尚未儲存 Client Secret — 請先輸入並按「儲存」'
      }
      xapiBusy.value = false
      return
    }
    clientSecret = stored
  }

  try {
    const client = await recreateXapiClient({
      pbxFqdn: fqdn,
      clientId,
      clientSecret
    })
    const result = await client.authenticate()
    if (result.ok) {
      xapiResult.value = {
        ok: true,
        message: `連線成功；access_token 已取得`
      }
    } else {
      xapiResult.value = {
        ok: false,
        message: `連線失敗：${result.error ?? 'unknown'}`
      }
    }
  } catch (err) {
    xapiResult.value = {
      ok: false,
      message: err instanceof Error ? err.message : String(err)
    }
  } finally {
    xapiBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-xl font-semibold">設定</h1>

    <!-- Screen Pop -->
    <section class="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
      <h2 class="font-medium">Screen Pop</h2>

      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          :checked="settings.state.screenPop.enabled"
          @change="
            settings.setScreenPop({
              ...settings.state.screenPop,
              enabled: ($event.target as HTMLInputElement).checked
            })
          "
        />
        <span class="text-sm">啟用來電自動開啟網頁</span>
      </label>

      <fieldset
        class="space-y-1.5 rounded-md border border-slate-200 p-2 pl-3"
        :disabled="!settings.state.screenPop.enabled"
        :class="!settings.state.screenPop.enabled ? 'opacity-50' : ''"
      >
        <legend class="px-1 text-xs text-slate-500">觸發時機</legend>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="triggerInbound"
            @change="
              setDirection('inbound', ($event.target as HTMLInputElement).checked)
            "
          />
          <span class="text-sm">來電（inbound）</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="triggerOutbound"
            @change="
              setDirection(
                'outbound',
                ($event.target as HTMLInputElement).checked
              )
            "
          />
          <span class="text-sm">撥出（outbound）</span>
        </label>
      </fieldset>

      <label class="block">
        <span class="text-sm text-slate-600">URL 模板</span>
        <input
          :value="settings.state.screenPop.urlTemplate"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none"
          placeholder="https://crm.example.com/?phone={caller}"
          @input="
            settings.setScreenPop({
              ...settings.state.screenPop,
              urlTemplate: ($event.target as HTMLInputElement).value
            })
          "
        />
        <span class="mt-1 block text-xs text-slate-400">
          支援變數：<code>{caller}</code>, <code>{callId}</code>,
          <code>{direction}</code>
        </span>
      </label>
    </section>

    <!-- XAPI -->
    <section class="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
      <h2 class="font-medium">3CX API 整合（XAPI）</h2>
      <p class="text-xs text-slate-500">
        用於同步座席狀態、讀取真實 CDR、接收官方事件流。
        請先在 3CX 管理介面 → Integrations → API 建立 Client。
      </p>

      <label class="flex items-center gap-2">
        <input v-model="xapiForm.enabled" type="checkbox" />
        <span class="text-sm">啟用 XAPI 整合</span>
      </label>

      <fieldset
        class="space-y-2"
        :disabled="!xapiForm.enabled"
        :class="!xapiForm.enabled ? 'opacity-50' : ''"
      >
        <label class="block">
          <span class="text-sm text-slate-600">Client ID</span>
          <input
            v-model="xapiForm.clientId"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none"
            placeholder="ada-client"
          />
        </label>

        <label class="block">
          <span class="text-sm text-slate-600">Client Secret</span>
          <input
            v-model="xapiForm.clientSecret"
            type="password"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none"
            autocomplete="off"
            :placeholder="
              settings.state.xapi.clientId ? '（留空沿用已儲存）' : ''
            "
          />
          <span class="mt-1 block text-xs text-slate-400">
            儲存於 OS 金鑰環；留空代表沿用已存密鑰。
          </span>
        </label>

        <label class="flex items-center gap-2">
          <input v-model="xapiForm.autoConnect" type="checkbox" />
          <span class="text-sm">ADA 啟動時自動連線</span>
        </label>

        <div class="flex gap-2 pt-1">
          <button
            type="button"
            class="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:bg-slate-300"
            :disabled="xapiBusy"
            @click="saveXapi"
          >
            儲存
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            :disabled="xapiBusy"
            @click="testXapi"
          >
            測試連線
          </button>
        </div>

        <div
          v-if="xapiResult"
          class="mt-1 rounded-md px-3 py-2 text-sm"
          :class="
            xapiResult.ok
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-rose-200 bg-rose-50 text-rose-700'
          "
        >
          {{ xapiResult.message }}
        </div>
      </fieldset>
    </section>

    <!-- 視窗 -->
    <section class="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
      <h2 class="font-medium">視窗</h2>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          :checked="settings.state.ui.alwaysOnTop"
          @change="
            settings.setUi({
              ...settings.state.ui,
              alwaysOnTop: ($event.target as HTMLInputElement).checked
            })
          "
        />
        <span class="text-sm">永遠置頂</span>
      </label>
    </section>

    <!-- 帳號 -->
    <section class="space-y-2 rounded-md bg-white p-4 ring-1 ring-slate-200">
      <h2 class="font-medium">帳號</h2>
      <p class="text-sm text-slate-600">
        目前分機：{{ settings.state.profile?.extension || '（未設定）' }}
      </p>
      <RouterLink
        to="/login"
        class="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        修改分機設定
      </RouterLink>
    </section>
  </div>
</template>

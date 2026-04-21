<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-xl font-semibold">設定</h1>

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
          支援變數：<code>{caller}</code>, <code>{callId}</code>, <code>{direction}</code>
        </span>
      </label>
    </section>

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

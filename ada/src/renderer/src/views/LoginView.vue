<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const settings = useSettingsStore()

const form = reactive({
  pbxFqdn: settings.state.profile?.pbxFqdn ?? 'engsound.3cx.com.tw',
  extension: settings.state.profile?.extension ?? '',
  displayName: settings.state.profile?.displayName ?? ''
})

const busy = ref(false)
const errorMsg = ref<string | null>(null)

async function submit() {
  busy.value = true
  errorMsg.value = null

  try {
    if (!form.pbxFqdn.trim()) {
      errorMsg.value = '請輸入 3CX 主機 FQDN'
      return
    }

    await settings.updateProfile({
      pbxFqdn: form.pbxFqdn.trim(),
      extension: form.extension.trim(),
      // Phase 2.B: SIP credentials no longer used; webview handles login.
      authId: '',
      displayName: form.displayName,
      wsUri: undefined
    })

    router.replace('/phone')
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="mb-2 text-xl font-semibold">設定 3CX 連線</h1>
    <p class="mb-4 text-sm text-slate-500">
      ADA 透過嵌入 3CX Web Client 取得通話功能。請輸入您的 3CX 主機網址，
      然後在下一頁的 Web Client 中登入您的分機。
    </p>

    <form class="space-y-3" @submit.prevent="submit">
      <label class="block">
        <span class="text-sm text-slate-600">3CX 主機 (FQDN)</span>
        <input
          v-model="form.pbxFqdn"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
          placeholder="example.3cx.com.tw"
          required
          :disabled="busy"
        />
        <span class="mt-1 block text-xs text-slate-400">
          Web Client 會在 ADA 視窗內以
          <code class="rounded bg-slate-100 px-1">https://&lt;FQDN&gt;/webclient</code>
          開啟。
        </span>
      </label>

      <label class="block">
        <span class="text-sm text-slate-600">分機號碼（選填，僅供 ADA 顯示）</span>
        <input
          v-model="form.extension"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
          placeholder="1000"
          :disabled="busy"
        />
      </label>

      <label class="block">
        <span class="text-sm text-slate-600">顯示名稱（選填）</span>
        <input
          v-model="form.displayName"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
          placeholder="Laurence Lin"
          :disabled="busy"
        />
      </label>

      <div
        v-if="errorMsg"
        class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
      >
        {{ errorMsg }}
      </div>

      <button
        type="submit"
        class="w-full rounded-md bg-brand py-2 font-medium text-white hover:bg-brand-dark disabled:bg-slate-300"
        :disabled="busy"
      >
        {{ busy ? '保存中…' : '儲存並開啟 Web Client' }}
      </button>
    </form>
  </div>
</template>

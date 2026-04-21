<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '../stores/agent'
import { useSettingsStore } from '../stores/settings'

const agent = useAgentStore()
const settings = useSettingsStore()

// Phase 2.B: SIP registration state is no longer authoritative —
// the webview handles real SIP. We show PBX target instead.
const pbxLabel = computed(() => {
  const fqdn = settings.state.profile?.pbxFqdn
  const ext = settings.state.profile?.extension
  if (!fqdn) return '未設定'
  return ext ? `${fqdn} · 分機 ${ext}` : fqdn
})
</script>

<template>
  <header
    class="flex h-10 items-center justify-between border-b border-slate-200 bg-white px-3 text-sm"
  >
    <div class="flex items-center gap-2">
      <span class="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
      <span class="text-slate-600">ADA</span>
      <span class="text-slate-400">· {{ pbxLabel }}</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        class="rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm"
        :class="agent.isReady ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-400 hover:bg-slate-500'"
        @click="agent.toggleReady"
      >
        {{ agent.isReady ? 'Ready' : 'Not Ready' }}
      </button>
    </div>
  </header>
</template>

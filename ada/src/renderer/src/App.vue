<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAgentStore } from './stores/agent'
import { useSettingsStore } from './stores/settings'
import Sidebar from './components/Sidebar.vue'
import StatusBar from './components/StatusBar.vue'

const agent = useAgentStore()
const settings = useSettingsStore()
const router = useRouter()

onMounted(async () => {
  await settings.load()

  // Tray → agent state toggle (still wired for future use)
  window.ada.on('tray:toggle-ready', () => {
    agent.toggleReady()
  })

  // Phase 2.B: No SIP auto-connect. The webview handles login itself.
  // Route guard: if no FQDN saved, go to /login; otherwise /phone.
  if (!settings.state.profile?.pbxFqdn) {
    router.replace('/login')
  } else {
    agent.setProfile(settings.state.profile)
    router.replace('/phone')
  }
})
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50 text-slate-900">
    <StatusBar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>
  </div>
</template>

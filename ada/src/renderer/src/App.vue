<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAgentStore } from './stores/agent'
import { useSettingsStore } from './stores/settings'
import Sidebar from './components/Sidebar.vue'
import StatusBar from './components/StatusBar.vue'
import WebClientPanel from './components/WebClientPanel.vue'

const agent = useAgentStore()
const settings = useSettingsStore()
const router = useRouter()
const route = useRoute()

// The phone route shows WebClientPanel; every other route uses RouterView.
const showPhone = computed(() => route.name === 'phone')

onMounted(async () => {
  await settings.load()

  window.ada.on('tray:toggle-ready', () => {
    agent.toggleReady()
  })

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
      <main class="relative flex-1 overflow-hidden">
        <!--
          WebClientPanel is always mounted. v-show toggles CSS visibility
          so the <webview> stays alive (any call in progress keeps going)
          as the user navigates between views.
        -->
        <div v-show="showPhone" class="absolute inset-0">
          <WebClientPanel />
        </div>

        <!-- Non-phone routes overlay the area while phone view is hidden. -->
        <div v-if="!showPhone" class="absolute inset-0 overflow-auto p-4">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

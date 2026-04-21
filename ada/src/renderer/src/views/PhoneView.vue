<script setup lang="ts">
/**
 * PhoneView is a route-only placeholder.
 *
 * The actual 3CX Web Client `<webview>` lives in App.vue via
 * `<WebClientPanel>` so it stays mounted across route changes (Electron
 * webview tags can't be keep-alive'd — removing them from the DOM kills
 * the underlying WebContents and any active call).
 *
 * When this route is active, App.vue shows WebClientPanel in place of
 * RouterView. This component just has to exist so the route resolves.
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'

defineOptions({ name: 'PhoneView' })

const router = useRouter()
const settings = useSettingsStore()

onMounted(() => {
  if (!settings.state.profile?.pbxFqdn) {
    router.replace('/login')
  }
})
</script>

<template>
  <!-- Intentionally empty — WebClientPanel is rendered in App.vue. -->
  <div />
</template>

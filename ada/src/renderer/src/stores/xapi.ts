import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import type { EventStreamState } from '../../../core/threecx/EventStream'

export interface XapiRawLogEntry {
  at: number
  text: string
}

const MAX_LOG = 200

/**
 * Persistent store for XAPI + Call Control event stream state.
 *
 * Kept in a Pinia store (not SettingsView local state) so that navigating
 * away from the settings page doesn't clear the log. EventStream listeners
 * are attached here once at connect() time and stay attached for the life
 * of the renderer.
 */
export const useXapiStore = defineStore('xapi', () => {
  const wsState = ref<EventStreamState>('disconnected')
  const wsReason = ref<string | null>(null)
  const log = ref<XapiRawLogEntry[]>([])

  function setState(state: EventStreamState, reason?: string) {
    wsState.value = state
    wsReason.value = reason ?? null
  }

  function appendRaw(raw: unknown) {
    const text =
      typeof raw === 'string' ? raw : JSON.stringify(raw).slice(0, 2000)
    log.value.unshift({ at: Date.now(), text })
    if (log.value.length > MAX_LOG) log.value.length = MAX_LOG
  }

  function clear() {
    log.value = []
  }

  return { wsState, wsReason, log, setState, appendRaw, clear }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useXapiStore, import.meta.hot))
}

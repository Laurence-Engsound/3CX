import { acceptHMRUpdate, defineStore } from 'pinia'
import { reactive, toRaw } from 'vue'
import type {
  AppSettings,
  ScreenPopConfig,
  ThreeCxProfile,
  XapiConfig
} from '../../../shared/types'
import { defaultSettings } from '../../../shared/types'

/**
 * Electron IPC uses structured clone, which cannot serialize Vue reactive
 * Proxies. Every object we ship over `window.ada.settings.set` must be
 * unwrapped to a plain object first. `toRaw` peels Vue's proxy layer, and
 * JSON round-trip peels any nested reactive arrays/objects too.
 */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value as unknown as object))) as T
}

export const useSettingsStore = defineStore('settings', () => {
  const state = reactive<AppSettings>(structuredClone(defaultSettings))

  async function load(): Promise<void> {
    const all = (await window.ada.settings.getAll()) as AppSettings
    Object.assign(state, all)

    // Migrate: older saved settings may only have triggerOn: ['inbound'].
    const to = state.screenPop?.triggerOn
    if (Array.isArray(to) && !to.includes('outbound')) {
      const next = {
        ...state.screenPop,
        triggerOn: [...to, 'outbound']
      }
      state.screenPop = next
      await window.ada.settings.set('screenPop', plain(next))
    }
  }

  async function updateProfile(profile: ThreeCxProfile): Promise<void> {
    const raw = plain(profile)
    state.profile = raw
    await window.ada.settings.set('profile', raw)
  }

  async function setScreenPop(cfg: ScreenPopConfig): Promise<void> {
    const raw = plain(cfg)
    state.screenPop = raw
    await window.ada.settings.set('screenPop', raw)
  }

  async function setUi(ui: AppSettings['ui']): Promise<void> {
    const raw = plain(ui)
    state.ui = raw
    await window.ada.settings.set('ui', raw)
  }

  async function setXapi(cfg: XapiConfig): Promise<void> {
    const raw = plain(cfg)
    state.xapi = raw
    await window.ada.settings.set('xapi', raw)
  }

  return { state, load, updateProfile, setScreenPop, setUi, setXapi }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}

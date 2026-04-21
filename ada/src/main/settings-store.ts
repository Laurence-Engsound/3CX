import Store from 'electron-store'
import type { AppSettings } from '../shared/types'
import { defaultSettings } from '../shared/types'

// electron-store persists JSON under the app's userData directory.
// Windows: %APPDATA%/ADA/config.json, Linux: ~/.config/ADA/config.json
const store = new Store<AppSettings>({
  name: 'config',
  defaults: defaultSettings
})

export function getSetting<K extends keyof AppSettings>(
  key: K | string
): AppSettings[K] | unknown {
  return store.get(key as keyof AppSettings)
}

export function setSetting(key: string, value: unknown): void {
  store.set(key, value as never)
}

export function getAllSettings(): AppSettings {
  return store.store
}

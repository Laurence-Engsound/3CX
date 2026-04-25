/**
 * IPC API contract shared between Main, Preload and Renderer.
 *
 * Whatever is exposed via `contextBridge.exposeInMainWorld('ada', …)` must match
 * the `AdaApi` shape below. Renderer code imports this type for autocompletion
 * on `window.ada`.
 */

export interface AdaApi {
  /** App metadata — version, platform, etc. */
  app: {
    getVersion(): Promise<string>
    getPlatform(): Promise<NodeJS.Platform>
    quit(): void
  }

  /** Settings (persisted via electron-store in main). */
  settings: {
    get<T = unknown>(key: string): Promise<T | undefined>
    set(key: string, value: unknown): Promise<void>
    getAll(): Promise<Record<string, unknown>>
  }

  /** Screen Pop — open external URL via OS default browser. */
  screenPop: {
    openUrl(url: string): Promise<void>
  }

  /** Paths to bundled resources (e.g. webview preload). */
  paths: {
    getWebviewPreload(): Promise<string>
  }

  /** XAPI helpers that require Main-process privileges. */
  xapi: {
    /**
     * Set the bearer token that Main will inject on the `/callcontrol/ws`
     * upgrade request. Pass null/empty to clear.
     */
    setWsToken(token: string | null): Promise<void>
  }

  /** Auto-update controls. */
  update: {
    getStatus(): Promise<UpdateStatus>
    check(): Promise<UpdateStatus>
    download(): Promise<void>
    install(): Promise<void>
  }

  /** Secure credential storage (keytar-backed). */
  credentials: {
    save(service: string, account: string, password: string): Promise<void>
    load(service: string, account: string): Promise<string | null>
    remove(service: string, account: string): Promise<boolean>
  }

  /** Event subscription from main → renderer (e.g., tray menu clicks). */
  on(channel: MainToRendererChannel, handler: (...args: unknown[]) => void): () => void
}

export type MainToRendererChannel =
  | 'tray:toggle-ready'
  | 'tray:show-window'
  | 'app:before-quit'
  | 'update:status'

/**
 * Mirror of main/updater.ts UpdateStatus. Keep in sync.
 */
export type UpdateStatus =
  | { phase: 'disabled'; reason: string }
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'not-available' }
  | { phase: 'available'; info: { version: string; releaseName?: string } }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; info: { version: string; releaseName?: string } }
  | { phase: 'error'; message: string }

/** Channels from renderer → main (invoke / handle pattern). */
export const IpcChannels = {
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PLATFORM: 'app:get-platform',
  APP_QUIT: 'app:quit',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',
  SCREEN_POP_OPEN: 'screen-pop:open',
  CREDENTIALS_SAVE: 'credentials:save',
  CREDENTIALS_LOAD: 'credentials:load',
  CREDENTIALS_REMOVE: 'credentials:remove',
  PATHS_WEBVIEW_PRELOAD: 'paths:webview-preload'
} as const

export type IpcInvokeChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

declare global {
  interface Window {
    ada: AdaApi
  }
}

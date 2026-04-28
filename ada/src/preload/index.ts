import { contextBridge, ipcRenderer } from 'electron'
import type { AdaApi, MainToRendererChannel, VoxenApi } from '../shared/ipc-api'
import { IpcChannels } from '../shared/ipc-api'

const allowedMainToRenderer: ReadonlySet<MainToRendererChannel> = new Set([
  'tray:toggle-ready',
  'tray:show-window',
  'app:before-quit',
  'update:status'
])

const api: AdaApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IpcChannels.APP_GET_VERSION),
    getPlatform: () => ipcRenderer.invoke(IpcChannels.APP_GET_PLATFORM),
    quit: () => ipcRenderer.send(IpcChannels.APP_QUIT)
  },

  settings: {
    get: (key) => ipcRenderer.invoke(IpcChannels.SETTINGS_GET, key),
    set: (key, value) =>
      ipcRenderer.invoke(IpcChannels.SETTINGS_SET, key, value),
    getAll: () => ipcRenderer.invoke(IpcChannels.SETTINGS_GET_ALL)
  },

  screenPop: {
    openUrl: (url) => ipcRenderer.invoke(IpcChannels.SCREEN_POP_OPEN, url)
  },

  credentials: {
    save: (service, account, password) =>
      ipcRenderer.invoke(
        IpcChannels.CREDENTIALS_SAVE,
        service,
        account,
        password
      ),
    load: (service, account) =>
      ipcRenderer.invoke(IpcChannels.CREDENTIALS_LOAD, service, account),
    remove: (service, account) =>
      ipcRenderer.invoke(IpcChannels.CREDENTIALS_REMOVE, service, account)
  },

  paths: {
    getWebviewPreload: () =>
      ipcRenderer.invoke(IpcChannels.PATHS_WEBVIEW_PRELOAD)
  },

  xapi: {
    setWsToken: (token: string | null) =>
      ipcRenderer.invoke('xapi:set-ws-token', token)
  },

  update: {
    getStatus: () => ipcRenderer.invoke('update:status'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install')
  },

  on: (channel, handler) => {
    if (!allowedMainToRenderer.has(channel)) {
      throw new Error(`Channel not allowed: ${channel}`)
    }
    const listener = (_e: unknown, ...args: unknown[]) => handler(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('ada', api)

// VOXEN platform events forwarded from main → renderer (any window).
// W2D1: main's voxenIntegration subscribes to EventBus and webContents.send's
// each canonical event on channel 'voxen:event'. Window subscribers attach
// here via window.voxen.onEvent(handler).
const voxenApi: VoxenApi = {
  onEvent(handler) {
    const listener = (_e: unknown, event: unknown): void => handler(event)
    ipcRenderer.on('voxen:event', listener)
    return () => ipcRenderer.removeListener('voxen:event', listener)
  },
  onCustomerProfile(handler) {
    const listener = (_e: unknown, profile: unknown): void =>
      handler(profile as Parameters<typeof handler>[0])
    ipcRenderer.on('voxen:customer-profile', listener)
    return () => ipcRenderer.removeListener('voxen:customer-profile', listener)
  }
}

contextBridge.exposeInMainWorld('voxen', voxenApi)

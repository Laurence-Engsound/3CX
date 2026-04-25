import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IpcChannels } from '../shared/ipc-api'
import { openExternalUrl } from './shell'
import { getSetting, setSetting, getAllSettings } from './settings-store'
import {
  saveCredential,
  loadCredential,
  removeCredential
} from './credentials'
import {
  checkForUpdates,
  downloadUpdate,
  getLastUpdateStatus,
  quitAndInstall
} from './updater'

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.APP_GET_VERSION, () => app.getVersion())
  ipcMain.handle(IpcChannels.APP_GET_PLATFORM, () => process.platform)
  ipcMain.on(IpcChannels.APP_QUIT, () => app.quit())

  ipcMain.handle(IpcChannels.SETTINGS_GET, (_e, key: string) => getSetting(key))
  ipcMain.handle(IpcChannels.SETTINGS_SET, (_e, key: string, value: unknown) =>
    setSetting(key, value)
  )
  ipcMain.handle(IpcChannels.SETTINGS_GET_ALL, () => getAllSettings())

  ipcMain.handle(IpcChannels.SCREEN_POP_OPEN, (_e, url: string) =>
    openExternalUrl(url)
  )

  ipcMain.handle(
    IpcChannels.CREDENTIALS_SAVE,
    (_e, service: string, account: string, password: string) =>
      saveCredential(service, account, password)
  )
  ipcMain.handle(
    IpcChannels.CREDENTIALS_LOAD,
    (_e, service: string, account: string) => loadCredential(service, account)
  )
  ipcMain.handle(
    IpcChannels.CREDENTIALS_REMOVE,
    (_e, service: string, account: string) =>
      removeCredential(service, account)
  )

  ipcMain.handle(IpcChannels.PATHS_WEBVIEW_PRELOAD, () => {
    // __dirname at runtime = out/main; webview-preload is at out/preload/
    const abs = join(__dirname, '..', 'preload', 'webview-preload.js')
    return pathToFileURL(abs).href
  })

  ipcMain.handle('update:status', () => getLastUpdateStatus())
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', () => downloadUpdate())
  ipcMain.handle('update:install', () => quitAndInstall())
}

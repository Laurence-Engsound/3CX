import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { createTray, destroyTray } from './tray'
import { setupAutoUpdater } from './updater'

// Enforce single-instance — second launch focuses the existing window instead.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Harden: disable remote module, enforce navigation safety.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const url = new URL(navigationUrl)
    // Allow internal dev server and loaded file://. Block everything else.
    if (url.origin !== 'http://localhost:5173' && url.protocol !== 'file:') {
      event.preventDefault()
    }
  })
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})

app.whenReady().then(() => {
  registerIpcHandlers()
  mainWindow = createMainWindow()
  createTray(mainWindow)
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
      createTray(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  // On Linux / Windows we keep the app alive in the tray.
  // Explicit quit from tray or menu will trigger app.quit().
  if (process.platform === 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  destroyTray()
})

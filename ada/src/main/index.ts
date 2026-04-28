import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { createBarWindow } from './barWindow'
import { registerIpcHandlers } from './ipc'
import { createTray, destroyTray } from './tray'
import { setupAutoUpdater } from './updater'
import { initVoxenIntegration, setBarWindow } from './voxenIntegration'

// Enforce single-instance — second launch focuses the existing window instead.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
// barWindow reference will be added in W1D8 once we need IPC into it.

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
  initVoxenIntegration()  // Phase 6 W1D2 — wire VOXEN platform into ada
  registerIpcHandlers()
  mainWindow = createMainWindow()
  const barWin = createBarWindow()  // Phase 6 W1D7 — Softphone Bar
  setBarWindow(barWin)              // W2D1 — let voxenIntegration push events to Bar
  barWin.on('closed', () => setBarWindow(null))
  createTray(mainWindow)
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
      const reBar = createBarWindow()
      setBarWindow(reBar)
      reBar.on('closed', () => setBarWindow(null))
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

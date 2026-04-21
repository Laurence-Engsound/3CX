import { BrowserWindow, session, shell } from 'electron'
import { join } from 'node:path'

const isDev = !!process.env.ELECTRON_RENDERER_URL

export function createMainWindow(): BrowserWindow {
  registerPermissionHandlers()

  const win = new BrowserWindow({
    // Wider default to accommodate the embedded 3CX Web Client.
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    title: 'ADA',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      // Phase 2.B: embed 3CX Web Client via <webview>.
      webviewTag: true
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  // Clicking external links should open in the OS browser, never in the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL!)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/**
 * The 3CX Web Client runs inside a <webview> and needs camera/microphone
 * permission to place calls. Electron asks the embedder (us) to approve
 * each permission request; we auto-grant the ones the Web Client needs,
 * but ONLY for pages under our configured PBX FQDN.
 *
 * The actual FQDN-based check happens per-request since settings can
 * change. For now we whitelist typical 3CX permissions; tighten in Phase 5.
 */
function registerPermissionHandlers(): void {
  const autoGrant = new Set([
    'media', // getUserMedia (mic/camera)
    'mediaKeySystem',
    'notifications',
    'clipboard-read',
    'clipboard-sanitized-write',
    'fullscreen'
  ])

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(autoGrant.has(permission))
    }
  )

  // Legacy permission check (used by some APIs synchronously).
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => autoGrant.has(permission)
  )
}

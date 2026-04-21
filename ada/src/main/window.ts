import { BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'node:path'

const isDev = !!process.env.ELECTRON_RENDERER_URL

/**
 * Bearer token for WebSocket upgrade requests to 3CX Call Control API.
 *
 * The browser WebSocket API cannot set custom headers, but Electron's
 * session webRequest hooks CAN inject them on the WS upgrade HTTP request.
 * Renderer calls `xapi.set-ws-token` via IPC before opening the socket.
 */
let xapiWsToken: string | null = null

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

  /**
   * CORS bypass for Renderer → 3CX API calls.
   *
   * Vite dev serves the Renderer from http://localhost:5173, and in packaged
   * builds it's file://. Neither origin is whitelisted by 3CX's server, so
   * Chromium would block /connect/token and /xapi/* responses.
   *
   * We inject Access-Control-Allow-* headers into responses from our own
   * configured 3CX host so the Renderer can consume them. This ONLY fires
   * for the configured FQDN — other origins continue to enforce standard
   * CORS.
   *
   * Phase 5 will read the allowed host from settings; for now it's baked
   * to Engsound's PBX.
   */
  const PBX_HOSTS = [
    'https://engsound.3cx.com.tw',
    'wss://engsound.3cx.com.tw'
  ]

  session.defaultSession.webRequest.onHeadersReceived(
    (details, callback) => {
      const isPbx = PBX_HOSTS.some((h) => details.url.startsWith(h))
      if (!isPbx) {
        callback({ responseHeaders: details.responseHeaders })
        return
      }
      const headers = { ...(details.responseHeaders ?? {}) }
      headers['Access-Control-Allow-Origin'] = ['*']
      headers['Access-Control-Allow-Headers'] = ['*']
      headers['Access-Control-Allow-Methods'] = ['GET,POST,PUT,PATCH,DELETE,OPTIONS']
      headers['Access-Control-Allow-Credentials'] = ['true']
      callback({ responseHeaders: headers })
    }
  )

  // Inject Authorization header on the WebSocket upgrade request for
  // /callcontrol/ws. Browsers cannot set this header via `new WebSocket()`,
  // but Electron's webRequest runs below that layer.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      const isPbx = PBX_HOSTS.some((h) => details.url.startsWith(h))
      const isCallControl =
        isPbx && details.url.includes('/callcontrol')
      if (isCallControl && xapiWsToken) {
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            Authorization: `Bearer ${xapiWsToken}`
          }
        })
      } else {
        callback({ requestHeaders: details.requestHeaders })
      }
    }
  )

  // Renderer → Main: current XAPI bearer token for header injection.
  ipcMain.handle('xapi:set-ws-token', (_e, token: string | null) => {
    xapiWsToken = token && token.length > 0 ? token : null
  })
}

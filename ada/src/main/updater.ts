import { app, BrowserWindow } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

/**
 * Thin wrapper around electron-updater.
 *
 * Behavior:
 *   - In DEV (not packaged) → all operations are no-ops that return a
 *     disabled status; this prevents noisy errors during `npm run dev`.
 *   - In packaged builds → checks the publish URL configured in
 *     electron-builder.yml. See docs/PHASE5-DEPLOYMENT.md for how to wire
 *     a real server.
 *
 * The renderer drives the UX via IPC:
 *   update:check        → triggers a check
 *   update:download     → triggers download (call after 'available')
 *   update:install      → quits and installs the downloaded update
 * Status events are forwarded to all open windows via 'update:status'.
 */
export type UpdateStatus =
  | { phase: 'disabled'; reason: string }
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'not-available' }
  | { phase: 'available'; info: UpdateInfo }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; info: UpdateInfo }
  | { phase: 'error'; message: string }

let lastStatus: UpdateStatus = { phase: 'idle' }

function broadcast(status: UpdateStatus): void {
  lastStatus = status
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:status', status)
  }
}

export function getLastUpdateStatus(): UpdateStatus {
  return lastStatus
}

export function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    lastStatus = {
      phase: 'disabled',
      reason: 'Auto-updater disabled in dev (app.isPackaged is false).'
    }
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => broadcast({ phase: 'checking' }))
  autoUpdater.on('update-available', (info: UpdateInfo) =>
    broadcast({ phase: 'available', info })
  )
  autoUpdater.on('update-not-available', () =>
    broadcast({ phase: 'not-available' })
  )
  autoUpdater.on('error', (err) =>
    broadcast({
      phase: 'error',
      message: err instanceof Error ? err.message : String(err)
    })
  )
  autoUpdater.on('download-progress', (p) =>
    broadcast({ phase: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info: UpdateInfo) =>
    broadcast({ phase: 'downloaded', info })
  )

  // One check on startup, 30s after launch so the app is responsive first.
  setTimeout(() => {
    void checkForUpdates().catch(() => {
      // broadcast('error') already fired inside electron-updater
    })
  }, 30_000)
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) return lastStatus
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    broadcast({
      phase: 'error',
      message: err instanceof Error ? err.message : String(err)
    })
  }
  return lastStatus
}

export async function downloadUpdate(): Promise<void> {
  if (!app.isPackaged) return
  await autoUpdater.downloadUpdate()
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return
  autoUpdater.quitAndInstall(false, true)
}

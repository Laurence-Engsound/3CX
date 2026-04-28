/**
 * Softphone Bar window — Phase 6 W1D7 first cut.
 *
 * A frameless 40px-tall always-on-top BrowserWindow that loads the
 * `/bar` Vue route. Coexists with the main ADA window during early
 * development; W1D8+ may flip to "Bar instead of main window".
 *
 * Window features:
 *   - frameless (no titlebar / OS chrome)
 *   - always-on-top so it stays visible above CRM / 工單 / browser
 *   - 40px tall × 600px wide default
 *   - draggable via the BarView's CSS `-webkit-app-region: drag`
 *   - skipTaskbar: false (still in taskbar so user can find it)
 *   - resizable: false (height fixed at 40px)
 *
 * See: docs/projects/ada-phase6/PROJECT-CHARTER.md (Bar UI deliverable)
 */

import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

const isDev = !!process.env.ELECTRON_RENDERER_URL

const BAR_WIDTH = 820
const BAR_HEIGHT = 40

export function createBarWindow(): BrowserWindow {
  // Position at top-center of primary display by default.
  const primary = screen.getPrimaryDisplay()
  const { width: screenW } = primary.workAreaSize
  const x = Math.round((screenW - BAR_WIDTH) / 2)
  const y = 8  // small gap from top

  const win = new BrowserWindow({
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    x,
    y,
    minWidth: 480,
    minHeight: BAR_HEIGHT,
    maxHeight: BAR_HEIGHT,
    show: false,
    frame: false,
    resizable: true,         // allow horizontal resize; height is locked
    alwaysOnTop: true,
    autoHideMenuBar: true,
    title: 'VOXEN Softphone',
    skipTaskbar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  // Pin to "always above other windows" but don't steal focus.
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  win.once('ready-to-show', () => {
    win.show()
  })

  // Load Bar's dedicated HTML entry (NOT the main index.html).
  // bar.html mounts BarView directly via bar-main.ts — no App.vue wrapper,
  // no vue-router, no StatusBar/Sidebar layout to fight with.
  if (isDev) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL!}/bar.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/bar.html'))
  }

  return win
}

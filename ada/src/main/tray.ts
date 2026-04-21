import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'

let tray: Tray | null = null

export function createTray(win: BrowserWindow): Tray {
  // resources/ is bundled next to out/main at package time.
  const iconPath = join(
    __dirname,
    process.platform === 'win32' ? '../../resources/icon.ico' : '../../resources/icon.png'
  )

  let icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    // Fallback: a 16x16 transparent image so dev builds don't crash before an icon exists.
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('ADA — 3CX Agent Desktop')

  const menu = Menu.buildFromTemplate([
    {
      label: '顯示主視窗',
      click: () => {
        win.show()
        win.focus()
      }
    },
    { type: 'separator' },
    {
      label: '切換 Ready / Not Ready',
      click: () => {
        win.webContents.send('tray:toggle-ready')
      }
    },
    { type: 'separator' },
    {
      label: '離開',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => {
    if (win.isVisible()) {
      win.focus()
    } else {
      win.show()
    }
  })

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

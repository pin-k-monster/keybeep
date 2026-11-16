import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import icon from '../../resources/icon.png?asset'
import { getSettings, onSettingsChanged } from './settings'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false
let hiddenToTray = false
let initialized = false
let unsubscribeSettings: (() => void) | null = null
let createWindowFactory: (() => void) | null = null

function handleBeforeQuit(): void {
  isQuitting = true
}

function showMainWindow(): void {
  hiddenToTray = false

  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindowFactory?.()
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function quitApplication(): void {
  isQuitting = true
  app.quit()
}

function createTray(): void {
  if (tray || isQuitting) return

  const source = nativeImage.createFromPath(icon)
  if (source.isEmpty()) {
    console.error('[KeyBeep] The tray icon could not be loaded.')
    return
  }

  const image = process.platform === 'win32' ? source.resize({ width: 16, height: 16 }) : source
  tray = new Tray(image)
  tray.setToolTip('KeyBeep')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: showMainWindow },
    { type: 'separator' },
    { label: 'Quit', click: quitApplication }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', showMainWindow)

  console.info('[KeyBeep] Tray icon created.')
}

function destroyTray(): void {
  if (!tray) return

  tray.destroy()
  tray = null
  console.info('[KeyBeep] Tray icon removed.')
}

function syncTray(enabled: boolean = getSettings().minimizeToTray): void {
  if (enabled) createTray()
  else destroyTray()

  // Turning the option off while the window is hidden would otherwise leave
  // it running with no tray icon and no taskbar entry.
  if (!enabled && hiddenToTray) showMainWindow()
}

/** Wires minimize/close behavior for the application window. */
export function attachMainWindow(window: BrowserWindow): void {
  mainWindow = window

  window.on('minimize', () => {
    if (!getSettings().minimizeToTray) return

    // The minimize event is not cancellable, so hide the window once it has
    // minimized; the tray "Open" action restores it.
    hiddenToTray = true
    window.hide()
    syncTray(true)
  })

  window.on('close', (event) => {
    if (isQuitting || !getSettings().minimizeToTray) return

    event.preventDefault()
    hiddenToTray = true
    window.hide()
    syncTray(true)
  })

  window.on('show', () => {
    hiddenToTray = false
  })

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
}

/** Creates the tray singleton, if enabled, and keeps it in sync with settings. */
export function initializeTray(createWindow?: () => void): void {
  if (initialized) return
  initialized = true
  createWindowFactory = createWindow ?? null

  app.on('before-quit', handleBeforeQuit)
  unsubscribeSettings = onSettingsChanged((next) => syncTray(next.minimizeToTray))
  syncTray()
}

export function disposeTray(): void {
  unsubscribeSettings?.()
  unsubscribeSettings = null
  app.removeListener('before-quit', handleBeforeQuit)
  destroyTray()
  initialized = false
  createWindowFactory = null
  mainWindow = null
  hiddenToTray = false
  isQuitting = false
}

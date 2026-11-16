import { BrowserWindow, ipcMain } from 'electron'
import { getDomCodeFromNativeKeycode } from './keyMapper'
import {
  KEYBOARD_IPC,
  type KeyboardHookEvent,
  type KeyboardHookStatus
} from '../preload/keyboardIpc'

type UiohookModule = typeof import('uiohook-napi')
type UiohookKeyboardEvent = import('uiohook-napi').UiohookKeyboardEvent
type KeyboardEventListener = (event: KeyboardHookEvent) => void

const SUPPORTED_PLATFORM = process.platform === 'win32'

let nativeModule: UiohookModule | null | undefined
let running = false
let nativeHandler: ((event: UiohookKeyboardEvent) => void) | null = null
let eventListener: KeyboardEventListener | null = null
let status: KeyboardHookStatus = 'stopped'
const pressedNativeCodes = new Set<number>()

/**
 * Loads the native module lazily so a missing or incompatible binary cannot
 * prevent the rest of the app from starting.
 */
function loadNativeModule(): UiohookModule | null {
  if (nativeModule !== undefined) return nativeModule

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeModule = require('uiohook-napi') as UiohookModule
  } catch (error) {
    nativeModule = null
    console.error('[KeyBeep] The native keyboard hook could not be loaded.', error)
  }

  return nativeModule
}

function broadcastStatus(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed() || window.webContents.isDestroyed()) continue
    window.webContents.send(KEYBOARD_IPC.status, status)
  }
}

function updateStatus(next: KeyboardHookStatus): void {
  if (status === next) return
  status = next
  broadcastStatus()
}

function handleNativeKey(event: UiohookKeyboardEvent, module: UiohookModule): void {
  if (!running) return

  const code = getDomCodeFromNativeKeycode(event.keycode)
  if (!code) return

  if (event.type === module.EventType.EVENT_KEY_PRESSED) {
    // Holding a key produces repeated keydown events without a keyup. Only the
    // first one should reach the renderer.
    if (pressedNativeCodes.has(event.keycode)) return
    pressedNativeCodes.add(event.keycode)
    eventListener?.({ type: 'keydown', code })
    return
  }

  if (event.type === module.EventType.EVENT_KEY_RELEASED) {
    if (!pressedNativeCodes.delete(event.keycode)) return
    eventListener?.({ type: 'keyup', code })
  }
}

/** Starts the global hook, or returns the current status when already active. */
export function startKeyboardHook(listener: KeyboardEventListener): KeyboardHookStatus {
  eventListener = listener

  if (running) return status

  if (!SUPPORTED_PLATFORM) {
    updateStatus('unsupported')
    return status
  }

  const module = loadNativeModule()
  if (!module) {
    updateStatus('failed')
    return status
  }

  const handler = (event: UiohookKeyboardEvent): void => handleNativeKey(event, module)

  try {
    module.uIOhook.on('keydown', handler)
    module.uIOhook.on('keyup', handler)
    module.uIOhook.start()
  } catch (error) {
    module.uIOhook.off('keydown', handler)
    module.uIOhook.off('keyup', handler)
    try {
      module.uIOhook.stop()
    } catch {
      // The hook never started.
    }
    pressedNativeCodes.clear()
    console.error('[KeyBeep] The global keyboard hook could not start.', error)
    updateStatus('failed')
    return status
  }

  nativeHandler = handler
  running = true
  pressedNativeCodes.clear()
  updateStatus('started')
  return status
}

/** Stops the hook and releases the native listener. Safe to call repeatedly. */
export function stopKeyboardHook(): KeyboardHookStatus {
  const module = nativeModule ?? null

  if (nativeHandler && module) {
    module.uIOhook.off('keydown', nativeHandler)
    module.uIOhook.off('keyup', nativeHandler)
  }

  if (running && module) {
    try {
      module.uIOhook.stop()
    } catch (error) {
      console.error('[KeyBeep] The global keyboard hook could not stop cleanly.', error)
    }
  }

  running = false
  nativeHandler = null
  eventListener = null
  pressedNativeCodes.clear()
  updateStatus(SUPPORTED_PLATFORM ? 'stopped' : 'unsupported')

  return status
}

/** Registers the single IPC entry point used by the renderer. */
export function registerKeyboardHookIpc(): void {
  ipcMain.handle(KEYBOARD_IPC.setListening, (event, enabled: unknown) => {
    if (enabled !== true) return stopKeyboardHook()

    const sender = event.sender
    return startKeyboardHook((keyEvent) => {
      if (sender.isDestroyed()) return
      sender.send(KEYBOARD_IPC.keyEvent, keyEvent)
    })
  })
}

/** Stops the hook and removes the IPC handler during application shutdown. */
export function disposeKeyboardHook(): void {
  stopKeyboardHook()
  ipcMain.removeHandler(KEYBOARD_IPC.setListening)
}

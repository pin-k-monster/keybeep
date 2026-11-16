import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  KEYBOARD_IPC,
  type KeybeepApi,
  type KeyboardHookEvent,
  type KeyboardHookStatus
} from './keyboardIpc'
import { SETTINGS_IPC, type PersistedSettings, type SettingsPatch } from './settingsIpc'

const INITIAL_SETTINGS_ARG = '--keybeep-initial-settings='

/**
 * The main process serializes the saved settings into the renderer's arguments
 * so the very first paint can use them. Falls back to `null` (and then to the
 * asynchronous `get()` call) if the value is missing or malformed.
 */
function readInitialSettings(): PersistedSettings | null {
  const argument = process.argv.find((value) => value.startsWith(INITIAL_SETTINGS_ARG))
  if (!argument) return null

  try {
    return JSON.parse(
      decodeURIComponent(argument.slice(INITIAL_SETTINGS_ARG.length))
    ) as PersistedSettings
  } catch {
    return null
  }
}

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)

  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: KeybeepApi = {
  keyboard: {
    setListening: (enabled) =>
      ipcRenderer.invoke(KEYBOARD_IPC.setListening, enabled) as Promise<KeyboardHookStatus>,
    onKeyEvent: (callback) => subscribe<KeyboardHookEvent>(KEYBOARD_IPC.keyEvent, callback),
    onStatus: (callback) => subscribe<KeyboardHookStatus>(KEYBOARD_IPC.status, callback)
  },
  settings: {
    get: () => ipcRenderer.invoke(SETTINGS_IPC.get) as Promise<PersistedSettings>,
    update: (patch: SettingsPatch) =>
      ipcRenderer.invoke(SETTINGS_IPC.update, patch) as Promise<PersistedSettings>,
    initial: readInitialSettings()
  }
}

// Only the narrow keyboard and settings contracts are exposed to the renderer.
// No Node or generic Electron APIs are reachable from page code.
contextBridge.exposeInMainWorld('api', api)

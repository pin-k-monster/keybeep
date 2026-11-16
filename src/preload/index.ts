import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  KEYBOARD_IPC,
  type KeybeepApi,
  type KeyboardHookEvent,
  type KeyboardHookStatus
} from './keyboardIpc'
import {
  CUSTOM_SOUNDS_IPC,
  type CustomSound,
  type CustomSoundRemoveResult,
  type CustomSoundUploadRequest,
  type CustomSoundUploadResult
} from './customSoundsIpc'
import { SETTINGS_IPC, type PersistedSettings, type SettingsPatch } from './settingsIpc'

const INITIAL_SETTINGS_ARG = '--keybeep-initial-settings='
const INITIAL_SOUNDS_ARG = '--keybeep-initial-sounds='

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

/** Mirrors `readInitialSettings` for the custom sound library snapshot. */
function readInitialSounds(): CustomSound[] | null {
  const argument = process.argv.find((value) => value.startsWith(INITIAL_SOUNDS_ARG))
  if (!argument) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(argument.slice(INITIAL_SOUNDS_ARG.length)))
    return Array.isArray(parsed) ? (parsed as CustomSound[]) : null
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
  },
  customSounds: {
    list: () => ipcRenderer.invoke(CUSTOM_SOUNDS_IPC.list) as Promise<CustomSound[]>,
    upload: (request: CustomSoundUploadRequest) =>
      ipcRenderer.invoke(CUSTOM_SOUNDS_IPC.upload, request) as Promise<CustomSoundUploadResult>,
    rename: (id, name) =>
      ipcRenderer.invoke(CUSTOM_SOUNDS_IPC.rename, id, name) as Promise<CustomSound[]>,
    remove: (id) =>
      ipcRenderer.invoke(CUSTOM_SOUNDS_IPC.remove, id) as Promise<CustomSoundRemoveResult>,
    read: async (id) => {
      const data = (await ipcRenderer.invoke(CUSTOM_SOUNDS_IPC.read, id)) as Uint8Array | null
      if (!data) return null
      // Copy into a standalone ArrayBuffer so no extra bytes cross the bridge.
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    },
    initial: readInitialSounds()
  }
}

// Only the narrow keyboard, settings and custom sound contracts are exposed to
// the renderer. No Node or generic Electron APIs are reachable from page code.
contextBridge.exposeInMainWorld('api', api)

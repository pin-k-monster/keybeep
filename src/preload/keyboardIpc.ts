/**
 * Contract shared by the main process, the preload bridge, and the renderer
 * typings for the global keyboard hook.
 *
 * Payloads only ever contain a physical key code and whether it was pressed or
 * released. No typed characters, timestamps, or keyboard history are included.
 */
import type { CustomSoundsApi } from './customSoundsIpc'
import type { SettingsApi } from './settingsIpc'

export type KeyboardHookEventType = 'keydown' | 'keyup'

export interface KeyboardHookEvent {
  type: KeyboardHookEventType
  code: string
}

export type KeyboardHookStatus = 'started' | 'stopped' | 'unsupported' | 'failed'

export interface KeyboardApi {
  /** Starts or stops the native hook. Resolves with the resulting status. */
  setListening(enabled: boolean): Promise<KeyboardHookStatus>
  /** Subscribes to press/release events. Returns an unsubscribe function. */
  onKeyEvent(listener: (event: KeyboardHookEvent) => void): () => void
  /** Subscribes to hook status changes. Returns an unsubscribe function. */
  onStatus(listener: (status: KeyboardHookStatus) => void): () => void
}

export interface KeybeepApi {
  keyboard: KeyboardApi
  settings: SettingsApi
  customSounds: CustomSoundsApi
}

export const KEYBOARD_IPC = {
  setListening: 'keyboard:set-listening',
  keyEvent: 'keyboard:key-event',
  status: 'keyboard:status'
} as const

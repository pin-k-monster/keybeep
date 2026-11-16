/**
 * Contract shared by the main process, the preload bridge, and the renderer
 * for the user's custom sound library.
 *
 * Uploaded WAV files are stored as real files in the application's persistent
 * user-data directory. Only metadata and audio bytes travel over IPC; the
 * renderer never receives a filesystem path.
 */
import type { PersistedSettings } from './settingsIpc'

/** Prefix that keeps user-uploaded ids from colliding with bundled presets. */
export const CUSTOM_SOUND_ID_PREFIX = 'custom-'

/** Only WAV files are accepted. */
export const CUSTOM_SOUND_EXTENSION = '.wav'

/** Hard cap on the size of an uploaded file. */
export const MAX_CUSTOM_SOUND_BYTES = 8 * 1024 * 1024

/** Playable duration limits, in seconds. */
export const MIN_CUSTOM_SOUND_SECONDS = 0.05
export const MAX_CUSTOM_SOUND_SECONDS = 15

export interface CustomSound {
  id: string
  /** User-facing name. Editable; defaults to the file name without extension. */
  name: string
  /** Name of the file the user originally uploaded. */
  originalFileName: string
  /** Playable duration in seconds. */
  duration: number
  /** Stored file size in bytes. */
  fileSize: number
  /** Creation time, epoch milliseconds. */
  createdAt: number
  /** False when the underlying file is missing or unreadable. */
  available: boolean
}

export type CustomSoundErrorCode =
  | 'invalid-extension'
  | 'too-large'
  | 'too-long'
  | 'too-short'
  | 'invalid-audio'
  | 'duplicate'
  | 'storage'
  | 'unknown'

export interface CustomSoundUploadRequest {
  fileName: string
  data: Uint8Array
}

export type CustomSoundUploadResult =
  | { ok: true; sound: CustomSound; sounds: CustomSound[] }
  | { ok: false; code: CustomSoundErrorCode; message: string }

export interface CustomSoundRemoveResult {
  ok: boolean
  sounds: CustomSound[]
  /** Settings after every reference to the deleted sound was scrubbed. */
  settings: PersistedSettings
}

export interface CustomSoundsApi {
  /** Lists the library. Safe to call repeatedly. */
  list(): Promise<CustomSound[]>
  /** Validates and stores a WAV file. */
  upload(request: CustomSoundUploadRequest): Promise<CustomSoundUploadResult>
  /** Renames a sound and returns the updated library. */
  rename(id: string, name: string): Promise<CustomSound[]>
  /** Deletes a sound, its file and every assignment that referenced it. */
  remove(id: string): Promise<CustomSoundRemoveResult>
  /** Reads the raw bytes of a sound, or null when it is unavailable. */
  read(id: string): Promise<ArrayBuffer | null>
  /**
   * Snapshot captured when the window was created, so the library is present on
   * the first paint. `null` when it could not be provided; `list()` reconciles.
   */
  initial: CustomSound[] | null
}

export const CUSTOM_SOUNDS_IPC = {
  list: 'custom-sounds:list',
  upload: 'custom-sounds:upload',
  rename: 'custom-sounds:rename',
  remove: 'custom-sounds:remove',
  read: 'custom-sounds:read'
} as const

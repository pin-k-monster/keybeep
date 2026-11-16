/**
 * Contract shared by the main process, the preload bridge, and the renderer
 * for persisted application settings.
 *
 * Only user preferences are stored here. No typed text or keyboard history is
 * ever persisted.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

export const SOUND_PRESET_IDS = [
  'mechanical-default',
  'linear-switch',
  'tactile-switch',
  'clicky-switch',
  'soft-keyboard'
] as const

export type SoundPresetId = (typeof SOUND_PRESET_IDS)[number]

/** The preset used by a fresh install and by "Reset all button sounds". */
export const ORIGINAL_DEFAULT_SOUND_ID: SoundPresetId = 'mechanical-default'

export interface PersistedSettings {
  version: 1
  soundsEnabled: boolean
  masterVolume: number
  muted: boolean
  /**
   * Global sound used by every button that has no individual override. Either a
   * bundled preset id or a custom sound id. References are validated before
   * playback, so a stale id safely falls back to the original default.
   */
  defaultSoundId: string
  /** Per-key overrides, keyed by physical `KeyboardEvent.code`. */
  soundAssignments: Record<string, string>
  launchAtStartup: boolean
  minimizeToTray: boolean
  theme: ThemePreference
}

export type SettingsPatch = Partial<Omit<PersistedSettings, 'version'>>

export interface SettingsApi {
  /** Loads the settings that were restored at application startup. */
  get(): Promise<PersistedSettings>
  /** Persists a partial update and applies any OS-level side effects. */
  update(patch: SettingsPatch): Promise<PersistedSettings>
  /**
   * Snapshot captured when the window was created. Used so the first paint
   * already matches the saved configuration instead of flashing defaults.
   * `null` when it could not be provided; `get()` remains authoritative.
   */
  initial: PersistedSettings | null
}

export const SETTINGS_DEFAULTS: PersistedSettings = {
  version: 1,
  soundsEnabled: true,
  masterVolume: 72,
  muted: false,
  defaultSoundId: ORIGINAL_DEFAULT_SOUND_ID,
  soundAssignments: {},
  launchAtStartup: false,
  minimizeToTray: true,
  theme: 'system'
}

export const SETTINGS_IPC = {
  get: 'settings:get',
  update: 'settings:update'
} as const

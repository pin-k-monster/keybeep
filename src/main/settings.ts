import { app, ipcMain } from 'electron'
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  SETTINGS_DEFAULTS,
  SETTINGS_IPC,
  SOUND_PRESET_IDS,
  type PersistedSettings,
  type SoundPresetId,
  type ThemePreference
} from '../preload/settingsIpc'

type SettingsListener = (settings: PersistedSettings) => void

const THEME_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark']
const MAX_ASSIGNMENT_KEY_LENGTH = 48
const SUPPORTS_LOGIN_ITEM = process.platform === 'win32' || process.platform === 'darwin'

let settings: PersistedSettings = cloneSettings(SETTINGS_DEFAULTS)
let settingsFile: string | null = null
let initialized = false
const listeners = new Set<SettingsListener>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSoundPresetId(value: unknown): value is SoundPresetId {
  return typeof value === 'string' && (SOUND_PRESET_IDS as readonly string[]).includes(value)
}

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_VALUES as readonly string[]).includes(value)
}

function cloneSettings(source: PersistedSettings): PersistedSettings {
  return { ...source, soundAssignments: { ...source.soundAssignments } }
}

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.round(Math.min(100, Math.max(0, value)))
}

function sanitizeAssignments(
  value: unknown,
  fallback: Record<string, SoundPresetId>
): Record<string, SoundPresetId> {
  if (!isRecord(value)) return { ...fallback }

  const assignments: Record<string, SoundPresetId> = {}

  for (const [key, soundId] of Object.entries(value)) {
    if (key.length === 0 || key.length > MAX_ASSIGNMENT_KEY_LENGTH) continue
    if (!/^[A-Za-z0-9]+$/.test(key)) continue
    if (!isSoundPresetId(soundId)) continue
    assignments[key] = soundId
  }

  return assignments
}

/**
 * Accepts any shape and always produces a usable settings object. Invalid
 * fields fall back to `base`, which keeps a bad patch from wiping good data.
 */
function sanitizeSettings(raw: unknown, base: PersistedSettings): PersistedSettings {
  const input = isRecord(raw) ? raw : {}

  const defaultSoundId = isSoundPresetId(input.defaultSoundId)
    ? input.defaultSoundId
    : base.defaultSoundId

  return {
    version: 1,
    soundsEnabled:
      typeof input.soundsEnabled === 'boolean' ? input.soundsEnabled : base.soundsEnabled,
    masterVolume: clampVolume(input.masterVolume, base.masterVolume),
    muted: typeof input.muted === 'boolean' ? input.muted : base.muted,
    defaultSoundId,
    soundAssignments: sanitizeAssignments(input.soundAssignments, base.soundAssignments),
    launchAtStartup:
      typeof input.launchAtStartup === 'boolean' ? input.launchAtStartup : base.launchAtStartup,
    minimizeToTray:
      typeof input.minimizeToTray === 'boolean' ? input.minimizeToTray : base.minimizeToTray,
    theme: isThemePreference(input.theme) ? input.theme : base.theme
  }
}

function readSettingsFile(): unknown {
  if (!settingsFile) return null

  try {
    return JSON.parse(readFileSync(settingsFile, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[KeyBeep] Saved settings could not be read; using safe defaults.', error)
    }
    return null
  }
}

function persistSettings(): void {
  if (!settingsFile) return

  try {
    mkdirSync(dirname(settingsFile), { recursive: true })
    const temporaryFile = `${settingsFile}.tmp`
    writeFileSync(temporaryFile, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')

    try {
      renameSync(temporaryFile, settingsFile)
    } catch {
      writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
      try {
        unlinkSync(temporaryFile)
      } catch {
        // The temporary file was already replaced.
      }
    }
  } catch (error) {
    console.error('[KeyBeep] Settings could not be saved.', error)
  }
}

function notifyListeners(): void {
  const snapshot = getSettings()
  for (const listener of listeners) listener(snapshot)
}

function loginItemOptions(): { path: string; args: string[] } {
  return {
    path: process.execPath,
    args: app.isPackaged ? [] : [app.getAppPath()]
  }
}

/** Reads the real Windows login-item state rather than trusting the file. */
function readActualLaunchAtStartup(): boolean {
  if (!SUPPORTS_LOGIN_ITEM) return false

  try {
    return app.getLoginItemSettings(loginItemOptions()).openAtLogin
  } catch (error) {
    console.error('[KeyBeep] The startup configuration could not be read.', error)
    return false
  }
}

function applyLaunchAtStartup(enabled: boolean): boolean {
  if (!SUPPORTS_LOGIN_ITEM) return false

  try {
    app.setLoginItemSettings({ openAtLogin: enabled, ...loginItemOptions() })
  } catch (error) {
    console.error('[KeyBeep] The startup configuration could not be updated.', error)
  }

  return readActualLaunchAtStartup()
}

/**
 * Loads settings once at startup and reconciles the recorded startup preference
 * with the real operating-system configuration.
 */
export function initializeSettings(): void {
  if (initialized) return
  initialized = true

  settingsFile = join(app.getPath('userData'), 'settings.json')
  const loaded = sanitizeSettings(readSettingsFile(), SETTINGS_DEFAULTS)

  const actualLaunchAtStartup = readActualLaunchAtStartup()
  settings =
    actualLaunchAtStartup === loaded.launchAtStartup
      ? loaded
      : { ...loaded, launchAtStartup: applyLaunchAtStartup(loaded.launchAtStartup) }

  persistSettings()
}

export function getSettings(): PersistedSettings {
  return cloneSettings(settings)
}

/** Applies and persists a partial update, returning the effective settings. */
export function updateSettings(patch: unknown): PersistedSettings {
  if (!isRecord(patch)) return getSettings()

  const candidate = sanitizeSettings({ ...settings, ...patch, version: 1 }, settings)
  let next = candidate

  if (
    typeof patch.launchAtStartup === 'boolean' &&
    candidate.launchAtStartup !== settings.launchAtStartup
  ) {
    // The OS is the source of truth for this toggle, so read it back.
    next = { ...next, launchAtStartup: applyLaunchAtStartup(candidate.launchAtStartup) }
  }

  const changed = JSON.stringify(next) !== JSON.stringify(settings)
  settings = next

  if (changed) {
    persistSettings()
    notifyListeners()
  }

  return getSettings()
}

/** Subscribes to effective settings changes. Returns an unsubscribe function. */
export function onSettingsChanged(listener: SettingsListener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function registerSettingsIpc(): void {
  ipcMain.handle(SETTINGS_IPC.get, () => getSettings())
  ipcMain.handle(SETTINGS_IPC.update, (_event, patch: unknown) => updateSettings(patch))
}

export function disposeSettings(): void {
  ipcMain.removeHandler(SETTINGS_IPC.get)
  ipcMain.removeHandler(SETTINGS_IPC.update)
  listeners.clear()
}

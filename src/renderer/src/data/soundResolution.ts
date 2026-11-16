import type { CustomSound } from '../../../preload/customSoundsIpc'
import type { SoundAssignments } from './soundAssignments'
import { DEFAULT_SOUND_ID, getBundledSoundPreset, isBundledSoundId } from './sounds'

/**
 * Centralized effective-sound resolution.
 *
 * Every keyboard button — physical presses, on-screen clicks and previews —
 * resolves through these helpers so the priority order is defined in one place:
 *
 *   1. the key's individual assignment, when it points at a usable sound
 *   2. the global custom sound, when it is configured and usable
 *   3. the original bundled default
 */
export type SoundOrigin = 'bundled' | 'custom' | 'missing'

/**
 * Index of usable custom sound ids. Unavailable sounds (missing or unreadable
 * files) are intentionally excluded so resolution falls back safely.
 */
export function buildCustomSoundIndex(sounds: readonly CustomSound[]): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const sound of sounds) {
    if (sound.available) ids.add(sound.id)
  }
  return ids
}

export function isKnownSoundId(soundId: string, customSoundIds: ReadonlySet<string>): boolean {
  return isBundledSoundId(soundId) || customSoundIds.has(soundId)
}

export function getSoundOrigin(soundId: string, customSoundIds: ReadonlySet<string>): SoundOrigin {
  if (isBundledSoundId(soundId)) return 'bundled'
  if (customSoundIds.has(soundId)) return 'custom'
  return 'missing'
}

/** Resolves the id that should actually be played for a key. */
export function resolveEffectiveSoundId(
  assignments: SoundAssignments,
  keyCode: string,
  globalSoundId: string,
  customSoundIds: ReadonlySet<string>
): string {
  const individual = assignments[keyCode]
  if (individual && isKnownSoundId(individual, customSoundIds)) return individual
  if (isKnownSoundId(globalSoundId, customSoundIds)) return globalSoundId
  return DEFAULT_SOUND_ID
}

/**
 * Human-readable name for any sound id, including unavailable ones (so a stale
 * reference is still recognizable in the UI). Falls back to the bundled default.
 */
export function getSoundDisplayName(soundId: string, sounds: readonly CustomSound[]): string {
  const bundled = getBundledSoundPreset(soundId)
  if (bundled) return bundled.name

  const custom = sounds.find((sound) => sound.id === soundId)
  if (custom) return custom.name

  return getBundledSoundPreset(DEFAULT_SOUND_ID)?.name ?? 'Default'
}

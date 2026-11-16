import { DEFAULT_SOUND_ID } from './sounds'

/**
 * Custom per-key sound assignments.
 *
 * Keys are physical `KeyboardEvent.code` values (for example `KeyA`, `Space`,
 * `ShiftLeft`). Only keys that differ from the default sound are stored, so an
 * empty object means every key uses `Mechanical Default`.
 */
export type SoundAssignments = Readonly<Record<string, string>>

export function getAssignedSoundId(
  assignments: SoundAssignments,
  keyCode: string,
  defaultSoundId: string = DEFAULT_SOUND_ID
): string {
  return assignments[keyCode] ?? defaultSoundId
}

export function hasCustomSound(assignments: SoundAssignments, keyCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(assignments, keyCode)
}

/** Assigns a preset to one key; assigning the active default removes the override. */
export function assignSound(
  assignments: SoundAssignments,
  keyCode: string,
  soundId: string,
  defaultSoundId: string = DEFAULT_SOUND_ID
): SoundAssignments {
  if (soundId === defaultSoundId) return resetKeySound(assignments, keyCode)
  if (assignments[keyCode] === soundId) return assignments
  return { ...assignments, [keyCode]: soundId }
}

/** Removes one key's override so it falls back to the default sound. */
export function resetKeySound(assignments: SoundAssignments, keyCode: string): SoundAssignments {
  if (!hasCustomSound(assignments, keyCode)) return assignments

  const next = { ...assignments }
  delete next[keyCode]
  return next
}

/** Removes every override without mutating the previous state. */
export function resetAllSounds(): SoundAssignments {
  return {}
}

/** Drops every override that points at a deleted sound id. */
export function removeSoundReferences(
  assignments: SoundAssignments,
  soundId: string
): SoundAssignments {
  if (!Object.values(assignments).includes(soundId)) return assignments

  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(assignments)) {
    if (value === soundId) continue
    next[key] = value
  }

  return next
}

export function countCustomSounds(assignments: SoundAssignments): number {
  return Object.keys(assignments).length
}

import type { SynthProfile } from '../audio/types'
import { ORIGINAL_DEFAULT_SOUND_ID } from '../../../preload/settingsIpc'

export const DEFAULT_SOUND_ID = ORIGINAL_DEFAULT_SOUND_ID

export interface SoundPreset {
  id: string
  name: string
  description: string
  /** Playback level for this preset, applied before the master volume. */
  gain: number
  /** Configuration used by the built-in synthesizer. */
  synthesis: SynthProfile
  /**
   * Optional bundled sample. When present the audio engine fetches and decodes
   * it, and uses the resulting AudioBuffer instead of the synthesized one.
   * Keep the file local (for example under src/renderer/public/sounds).
   */
  sampleUrl?: string
}

export const soundPresets: SoundPreset[] = [
  {
    id: 'mechanical-default',
    name: 'Mechanical Default',
    description: 'Balanced, crisp key presses',
    gain: 0.62,
    synthesis: {
      duration: 0.16,
      attack: 0.0008,
      jitter: 0.02,
      body: {
        wave: 'sine',
        startFrequency: 168,
        endFrequency: 92,
        glide: 0.026,
        decay: 0.048,
        level: 0.62,
        overtone: { ratio: 2.6, level: 0.18, decay: 0.016 }
      },
      click: {
        noiseLevel: 0.5,
        noiseDecay: 0.0085,
        noiseFilter: 6800,
        brightness: 0.82,
        toneFrequency: 2450,
        toneLevel: 0.24,
        toneDecay: 0.0055
      }
    }
  },
  {
    id: 'linear-switch',
    name: 'Linear Switch',
    description: 'Smooth, quiet and consistent',
    gain: 0.42,
    synthesis: {
      duration: 0.2,
      attack: 0.0018,
      jitter: 0.01,
      body: {
        wave: 'sine',
        startFrequency: 126,
        endFrequency: 84,
        glide: 0.04,
        decay: 0.07,
        level: 0.64,
        overtone: { ratio: 2, level: 0.07, decay: 0.026 }
      },
      click: {
        noiseLevel: 0.16,
        noiseDecay: 0.015,
        noiseFilter: 3200,
        brightness: 0.42,
        toneFrequency: 1150,
        toneLevel: 0.06,
        toneDecay: 0.009
      }
    }
  },
  {
    id: 'tactile-switch',
    name: 'Tactile Switch',
    description: 'A soft, noticeable bump',
    gain: 0.54,
    synthesis: {
      duration: 0.21,
      attack: 0.001,
      jitter: 0.014,
      body: {
        wave: 'sine',
        startFrequency: 142,
        endFrequency: 88,
        glide: 0.03,
        decay: 0.055,
        level: 0.58,
        overtone: { ratio: 2.2, level: 0.1, decay: 0.02 }
      },
      thump: {
        delay: 0.016,
        startFrequency: 98,
        endFrequency: 64,
        glide: 0.028,
        decay: 0.055,
        level: 0.32
      },
      click: {
        noiseLevel: 0.26,
        noiseDecay: 0.011,
        noiseFilter: 5200,
        brightness: 0.62,
        toneFrequency: 1850,
        toneLevel: 0.13,
        toneDecay: 0.007
      }
    }
  },
  {
    id: 'clicky-switch',
    name: 'Clicky Switch',
    description: 'Sharp and audible feedback',
    gain: 0.58,
    synthesis: {
      duration: 0.15,
      attack: 0.0004,
      jitter: 0.03,
      body: {
        wave: 'triangle',
        startFrequency: 224,
        endFrequency: 118,
        glide: 0.018,
        decay: 0.032,
        level: 0.34,
        overtone: { ratio: 3.1, level: 0.16, decay: 0.01 }
      },
      click: {
        noiseLevel: 0.62,
        noiseDecay: 0.0075,
        noiseFilter: 12000,
        brightness: 0.96,
        toneFrequency: 4100,
        toneLevel: 0.4,
        toneDecay: 0.0048
      }
    }
  },
  {
    id: 'soft-keyboard',
    name: 'Soft Keyboard',
    description: 'Muted, low-profile character',
    gain: 0.36,
    synthesis: {
      duration: 0.23,
      attack: 0.0025,
      jitter: 0.012,
      body: {
        wave: 'sine',
        startFrequency: 104,
        endFrequency: 76,
        glide: 0.055,
        decay: 0.085,
        level: 0.6,
        overtone: { ratio: 1.9, level: 0.05, decay: 0.03 }
      },
      click: {
        noiseLevel: 0.07,
        noiseDecay: 0.022,
        noiseFilter: 1600,
        brightness: 0.2,
        toneFrequency: 680,
        toneLevel: 0.028,
        toneDecay: 0.014
      }
    }
  }
]

export function getSoundPreset(soundId: string): SoundPreset {
  const preset = soundPresets.find((item) => item.id === soundId)
  return preset ?? soundPresets[0]
}

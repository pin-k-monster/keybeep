import type { SynthProfile, SynthWave } from './types'

const TAU = Math.PI * 2
const PEAK_TARGET = 0.9
const TAIL_FADE_SECONDS = 0.012
const DEFAULT_JITTER_SEED = 0x9e3779b9

function hashString(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/** Small deterministic noise source so a preset always renders identically. */
function createNoise(seed: number): () => number {
  let state = seed || DEFAULT_JITTER_SEED

  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) / 4294967296) * 2 - 1
  }
}

function oscillate(wave: SynthWave, phase: number): number {
  switch (wave) {
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase))
    case 'square':
      return Math.tanh(Math.sin(phase) * 4) * 0.75
    case 'sine':
    default:
      return Math.sin(phase)
  }
}

/**
 * Renders a preset into a mono AudioBuffer entirely in memory. No sample
 * assets are required, but the result is a normal AudioBuffer, so bundled WAV
 * samples can replace it later without changing playback or UI code.
 */
export function renderSynthBuffer(
  context: BaseAudioContext,
  profile: SynthProfile,
  seedKey = 'keybeep'
): AudioBuffer {
  const sampleRate = context.sampleRate
  const duration = Math.max(profile.duration, 0.02)
  const length = Math.max(1, Math.ceil(duration * sampleRate))
  const buffer = context.createBuffer(1, length, sampleRate)
  const output = buffer.getChannelData(0)
  const noise = createNoise(hashString(seedKey))

  const attackSamples = Math.max(1, Math.round(profile.attack * sampleRate))
  const noiseFilter = Math.min(profile.click.noiseFilter, sampleRate * 0.45)
  const noiseCoefficient = 1 - Math.exp((-TAU * noiseFilter) / sampleRate)

  let bodyPhase = 0
  let overtonePhase = 0
  let thumpPhase = 0
  let softNoise = 0
  let peak = 0

  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate
    const remaining = Math.max(0, duration - time)
    const envelope = Math.min(1, index / attackSamples) * Math.min(1, remaining / TAIL_FADE_SECONDS)

    const bodyGlide = Math.exp(-time / Math.max(profile.body.glide, 0.001))
    const bodyFrequency =
      profile.body.endFrequency +
      (profile.body.startFrequency - profile.body.endFrequency) * bodyGlide
    bodyPhase += (TAU * bodyFrequency) / sampleRate

    let sample =
      oscillate(profile.body.wave, bodyPhase) *
      profile.body.level *
      Math.exp(-time / Math.max(profile.body.decay, 0.001))

    if (profile.body.overtone) {
      const overtone = profile.body.overtone
      overtonePhase += (TAU * bodyFrequency * overtone.ratio) / sampleRate
      sample +=
        Math.sin(overtonePhase) * overtone.level * Math.exp(-time / Math.max(overtone.decay, 0.001))
    }

    if (profile.thump && time >= profile.thump.delay) {
      const thumpTime = time - profile.thump.delay
      const thumpGlide = Math.exp(-thumpTime / Math.max(profile.thump.glide, 0.001))
      const thumpFrequency =
        profile.thump.endFrequency +
        (profile.thump.startFrequency - profile.thump.endFrequency) * thumpGlide
      thumpPhase += (TAU * thumpFrequency) / sampleRate
      sample +=
        Math.sin(thumpPhase) *
        profile.thump.level *
        Math.exp(-thumpTime / Math.max(profile.thump.decay, 0.001))
    }

    const white = noise()
    softNoise += noiseCoefficient * (white - softNoise)
    const brightNoise = white - softNoise
    const clickNoise =
      brightNoise * profile.click.brightness + softNoise * (1 - profile.click.brightness)
    sample +=
      clickNoise *
      profile.click.noiseLevel *
      Math.exp(-time / Math.max(profile.click.noiseDecay, 0.001))
    sample +=
      Math.sin(TAU * profile.click.toneFrequency * time) *
      profile.click.toneLevel *
      Math.exp(-time / Math.max(profile.click.toneDecay, 0.001))

    const shaped = Math.tanh(sample * 1.15) * envelope
    output[index] = shaped
    peak = Math.max(peak, Math.abs(shaped))
  }

  if (peak > 0) {
    const scale = PEAK_TARGET / peak
    for (let index = 0; index < output.length; index += 1) {
      output[index] *= scale
    }
  }

  return buffer
}

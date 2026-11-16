export type SynthWave = 'sine' | 'triangle' | 'square'

export interface SynthOvertone {
  /** Frequency multiplier relative to the body oscillator. */
  ratio: number
  level: number
  decay: number
}

export interface SynthBody {
  wave: SynthWave
  /** Initial body frequency in Hz. */
  startFrequency: number
  /** Frequency the body glides towards, in Hz. */
  endFrequency: number
  /** Time constant of the downward pitch glide, in seconds. */
  glide: number
  /** Exponential amplitude decay, in seconds. */
  decay: number
  level: number
  overtone?: SynthOvertone
}

export interface SynthClick {
  /** Level of the filtered noise transient. */
  noiseLevel: number
  /** Exponential decay of the noise transient, in seconds. */
  noiseDecay: number
  /** Low-pass cutoff used to split the noise into a soft and a bright component. */
  noiseFilter: number
  /** 0 = soft/dark noise, 1 = bright/crisp noise. */
  brightness: number
  /** Frequency of the short click tone, in Hz. */
  toneFrequency: number
  toneLevel: number
  /** Exponential decay of the click tone, in seconds. */
  toneDecay: number
}

export interface SynthThump {
  /** Delay before the thump layer starts, in seconds. */
  delay: number
  startFrequency: number
  endFrequency: number
  glide: number
  decay: number
  level: number
}

/**
 * Data-driven description of a generated key sound. The audio engine renders
 * this into an AudioBuffer once per context, then plays it with
 * AudioBufferSourceNode so every press can overlap independently.
 */
export interface SynthProfile {
  /** Total length of the rendered buffer, in seconds. */
  duration: number
  /** Attack time of the overall envelope, in seconds. */
  attack: number
  body: SynthBody
  click: SynthClick
  thump?: SynthThump
  /** Maximum random playback-rate variation, as a fraction (0.02 = ±2%). */
  jitter?: number
}

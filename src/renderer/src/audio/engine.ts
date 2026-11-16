import {
  DEFAULT_SOUND_ID,
  getSoundPreset,
  isBundledSoundId,
  soundPresets,
  type SoundPreset
} from '../data/sounds'
import { renderSynthBuffer } from './synth'

const VOLUME_RAMP_SECONDS = 0.015

/** Playback shape for a voice, independent of whether it is synth or sample. */
interface VoiceSettings {
  gain: number
  jitter: number
}

/** Custom samples play at unity gain with only a subtle pitch variation. */
const CUSTOM_VOICE: VoiceSettings = { gain: 1, jitter: 0.02 }

/** Supplies the raw bytes of a custom sound on demand. */
export type CustomSoundLoader = (soundId: string) => Promise<ArrayBuffer | null>

interface ActiveVoice {
  source: AudioBufferSourceNode
  gain: GainNode
  panner: StereoPannerNode | null
}

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Small Web Audio wrapper shared by the whole renderer.
 *
 * - One AudioContext is created lazily on the first user interaction.
 * - Every press creates a fresh AudioBufferSourceNode, so sounds overlap.
 * - Master volume and mute are applied on a single master GainNode.
 * - Synthesized buffers can be replaced by decoded samples per preset.
 */
export class KeybeepAudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private sampleLoads = new Map<string, Promise<void>>()
  /** Ids that failed to load, so a broken file is not retried on every press. */
  private failedCustom = new Set<string>()
  private customSoundLoader: CustomSoundLoader | null = null
  private activeVoices = new Set<ActiveVoice>()
  private volume = 0.72
  private muted = false
  private enabled = true
  private contextUnavailable = false
  private libraryWarm = false
  private warned = false

  get isReady(): boolean {
    return this.context !== null && this.context.state !== 'closed'
  }

  get contextState(): AudioContextState | 'uninitialized' {
    return this.context?.state ?? 'uninitialized'
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume)
    this.applyOutputGain()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyOutputGain()
  }

  /** Applies volume and mute together to avoid scheduling two gain ramps. */
  setOutput(volume: number, muted: boolean): void {
    this.volume = clampVolume(volume)
    this.muted = muted
    this.applyOutputGain()
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) this.stopAllVoices()
  }

  /**
   * Registers the source of custom sound bytes. The engine stays decoupled from
   * IPC: the renderer wires this to the preload bridge once.
   */
  setCustomSoundLoader(loader: CustomSoundLoader | null): void {
    this.customSoundLoader = loader
  }

  /** Plays a sound id. Bundled presets and custom samples are both supported. */
  play(soundId: string): void {
    if (!this.enabled || this.muted || this.volume === 0) return

    const context = this.ensureContext()
    if (!context) return

    if (isBundledSoundId(soundId)) {
      void this.playPreset(context, getSoundPreset(soundId))
    } else {
      void this.playCustom(context, soundId)
    }
    this.warmLibrary()
  }

  /**
   * Decodes the given custom sounds ahead of time. Called when the library or
   * the assignments change so key presses never wait on disk or IPC.
   */
  async preloadCustomSounds(soundIds: readonly string[]): Promise<void> {
    if (!this.enabled || soundIds.length === 0) return

    const context = this.ensureContext()
    if (!context) return

    // An explicit request is also a retry, so previously failed ids are cleared.
    for (const soundId of soundIds) this.failedCustom.delete(soundId)

    await this.ensureRunning(context)
    await Promise.all(soundIds.map((soundId) => this.resolveCustomBuffer(soundId)))
  }

  /** Releases a decoded sample, for example after its sound was deleted. */
  releaseSound(soundId: string): void {
    this.buffers.delete(soundId)
    this.sampleLoads.delete(soundId)
    this.failedCustom.delete(soundId)
  }

  /** Creates the context if needed and renders every preset into memory. */
  async preload(): Promise<void> {
    if (!this.enabled) return

    const context = this.ensureContext()
    if (!context) return

    await this.ensureRunning(context)
    this.libraryWarm = true
    await Promise.all(soundPresets.map((preset) => this.resolveBuffer(preset)))
  }

  /**
   * Registers a real sample for a preset. Bundled WAV files can be loaded with
   * loadSample(preset.id, '/sounds/preset.wav') without touching playback code.
   */
  async loadSample(soundId: string, source: string | ArrayBuffer): Promise<AudioBuffer | null> {
    const context = this.ensureContext()
    if (!context) return null

    try {
      const data =
        typeof source === 'string' ? await this.fetchArrayBuffer(source) : source.slice(0)
      const buffer = await context.decodeAudioData(data)
      this.buffers.set(soundId, buffer)
      return buffer
    } catch (error) {
      this.warn(`The sample for "${soundId}" could not be loaded.`, error)
      return null
    }
  }

  async dispose(): Promise<void> {
    this.stopAllVoices()
    const context = this.context
    this.context = null
    this.masterGain = null
    this.buffers.clear()
    this.sampleLoads.clear()
    this.failedCustom.clear()
    this.libraryWarm = false
    this.contextUnavailable = false

    if (context && context.state !== 'closed') {
      try {
        await context.close()
      } catch (error) {
        this.warn('The audio context could not be closed.', error)
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.context.state !== 'closed') return this.context
    if (this.contextUnavailable) return null

    try {
      const AudioContextClass =
        window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio API is not available')

      const context = new AudioContextClass({ latencyHint: 'interactive' })
      const compressor = context.createDynamicsCompressor()
      compressor.threshold.value = -6
      compressor.knee.value = 6
      compressor.ratio.value = 4
      compressor.attack.value = 0.002
      compressor.release.value = 0.15

      const masterGain = context.createGain()
      masterGain.gain.value = this.outputGain()
      masterGain.connect(compressor)
      compressor.connect(context.destination)

      this.context = context
      this.masterGain = masterGain

      return context
    } catch (error) {
      this.contextUnavailable = true
      this.warn('Web Audio could not be initialized.', error)
      return null
    }
  }

  private async playPreset(context: AudioContext, preset: SoundPreset): Promise<void> {
    try {
      await this.ensureRunning(context)
      if (!this.enabled || this.muted || context.state !== 'running') return

      const buffer = await this.resolveBuffer(preset)
      if (!buffer || !this.enabled || this.muted || context.state !== 'running') return

      this.startVoice(context, buffer, {
        gain: preset.gain,
        jitter: preset.synthesis.jitter ?? 0.02
      })
    } catch (error) {
      this.warn('The keyboard sound could not be played.', error)
    }
  }

  /**
   * Plays a user-uploaded sample. If the file is missing, corrupt or the bridge
   * is unavailable, the original bundled default is played instead so a press
   * never goes silent or throws.
   */
  private async playCustom(context: AudioContext, soundId: string): Promise<void> {
    try {
      await this.ensureRunning(context)
      if (!this.enabled || this.muted || context.state !== 'running') return

      const buffer = await this.resolveCustomBuffer(soundId)
      if (!buffer || !this.enabled || this.muted || context.state !== 'running') return

      this.startVoice(context, buffer, CUSTOM_VOICE)
    } catch (error) {
      this.warn('The custom keyboard sound could not be played.', error)
    }
  }

  private async resolveCustomBuffer(soundId: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(soundId)
    if (cached) return cached

    const loader = this.customSoundLoader
    if (!loader) return this.fallbackBuffer()

    if (this.failedCustom.has(soundId)) return this.fallbackBuffer()

    const pending = this.sampleLoads.get(soundId)
    if (pending) {
      await pending
      return this.buffers.get(soundId) ?? this.fallbackBuffer()
    }

    const task = (async () => {
      const data = await loader(soundId)
      if (!data) return
      await this.loadSample(soundId, data)
    })()

    this.sampleLoads.set(soundId, task)

    try {
      await task
    } finally {
      this.sampleLoads.delete(soundId)
    }

    const buffer = this.buffers.get(soundId)
    if (buffer) return buffer

    // Remember the failure so rapid presses do not re-read a broken file.
    this.failedCustom.add(soundId)
    return this.fallbackBuffer()
  }

  private async fallbackBuffer(): Promise<AudioBuffer | null> {
    return this.resolveBuffer(getSoundPreset(DEFAULT_SOUND_ID))
  }

  private async ensureRunning(context: AudioContext): Promise<void> {
    if (context.state === 'running' || context.state === 'closed') return

    try {
      await context.resume()
    } catch (error) {
      this.warn('The audio context could not be resumed.', error)
    }
  }

  private startVoice(context: AudioContext, buffer: AudioBuffer, settings: VoiceSettings): void {
    const masterGain = this.masterGain
    if (!masterGain) return

    try {
      const source = context.createBufferSource()
      source.buffer = buffer

      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * settings.jitter

      const gain = context.createGain()
      gain.gain.value = settings.gain * (0.94 + Math.random() * 0.12)

      let panner: StereoPannerNode | null = null
      if (typeof context.createStereoPanner === 'function') {
        panner = context.createStereoPanner()
        panner.pan.value = (Math.random() * 2 - 1) * 0.07
        source.connect(gain)
        gain.connect(panner)
        panner.connect(masterGain)
      } else {
        source.connect(gain)
        gain.connect(masterGain)
      }

      const voice: ActiveVoice = { source, gain, panner }
      this.activeVoices.add(voice)

      source.onended = () => {
        source.disconnect()
        gain.disconnect()
        panner?.disconnect()
        this.activeVoices.delete(voice)
      }

      source.start()
    } catch (error) {
      this.warn('A keyboard sound could not be started.', error)
    }
  }

  private stopAllVoices(): void {
    for (const voice of [...this.activeVoices]) {
      voice.source.onended = null
      try {
        voice.source.stop()
      } catch {
        // The source may already have ended.
      }
      voice.source.disconnect()
      voice.gain.disconnect()
      voice.panner?.disconnect()
      this.activeVoices.delete(voice)
    }
  }

  private warmLibrary(): void {
    if (this.libraryWarm) return
    const context = this.context
    if (!context) return

    this.libraryWarm = true
    void (async () => {
      await this.ensureRunning(context)
      for (const preset of soundPresets) {
        if (!this.buffers.has(preset.id)) await this.resolveBuffer(preset)
      }
    })().catch((error) => this.warn('The sound library could not be prepared.', error))
  }

  private async resolveBuffer(preset: SoundPreset): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(preset.id)
    if (cached) return cached

    if (preset.sampleUrl) {
      const sample = await this.loadPresetSample(preset)
      if (sample) return sample
    }

    const context = this.context
    if (!context || context.state === 'closed') return null

    try {
      const buffer = renderSynthBuffer(context, preset.synthesis, preset.id)
      this.buffers.set(preset.id, buffer)
      return buffer
    } catch (error) {
      this.warn(`The "${preset.name}" sound could not be generated.`, error)
      return null
    }
  }

  private async loadPresetSample(preset: SoundPreset): Promise<AudioBuffer | null> {
    if (!preset.sampleUrl) return null

    const pending = this.sampleLoads.get(preset.id)
    if (pending) {
      await pending
      return this.buffers.get(preset.id) ?? null
    }

    const task = this.loadSample(preset.id, preset.sampleUrl).then(() => undefined)
    this.sampleLoads.set(preset.id, task)

    try {
      await task
    } finally {
      this.sampleLoads.delete(preset.id)
    }

    return this.buffers.get(preset.id) ?? null
  }

  private async fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Request for ${url} failed with ${response.status}`)
    }
    return response.arrayBuffer()
  }

  private outputGain(): number {
    return this.muted ? 0 : this.volume
  }

  private applyOutputGain(): void {
    const context = this.context
    const masterGain = this.masterGain
    if (!context || !masterGain || context.state === 'closed') return

    const parameter = masterGain.gain
    const now = context.currentTime
    const target = this.outputGain()

    parameter.cancelAndHoldAtTime(now)
    parameter.linearRampToValueAtTime(target, now + VOLUME_RAMP_SECONDS)
  }

  private warn(message: string, error: unknown): void {
    if (this.warned) return
    this.warned = true
    console.warn(`[KeyBeep audio] ${message}`, error)
  }
}

/** Renderer-wide singleton: one AudioContext, one master output. */
export const audioEngine = new KeybeepAudioEngine()

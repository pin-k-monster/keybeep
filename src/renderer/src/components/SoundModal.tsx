import { useEffect, useRef, useState } from 'react'
import type { CustomSound } from '../../../preload/customSoundsIpc'
import type { KeyDefinition } from '../data/keyboard'
import { soundPresets } from '../data/sounds'
import { getSoundDisplayName } from '../data/soundResolution'
import { formatDuration } from '../data/soundFormat'
import Modal from './Modal'
import { AudioLinesIcon, CheckIcon, PlayIcon, ResetIcon } from './icons'

interface SoundModalProps {
  keyDefinition: KeyDefinition
  currentSoundId: string
  /** The active global sound, used when a key falls back to it. */
  defaultSoundId: string
  customSounds: CustomSound[]
  hasCustomSound: boolean
  soundsEnabled: boolean
  onApply: (soundId: string) => void
  onPreview: (soundId: string) => void
  onReset: () => void
  onManageLibrary: () => void
  onClose: () => void
}

interface SoundRow {
  id: string
  name: string
  description: string
  disabled?: boolean
}

function SoundModal({
  keyDefinition,
  currentSoundId,
  defaultSoundId,
  customSounds,
  hasCustomSound,
  soundsEnabled,
  onApply,
  onPreview,
  onReset,
  onManageLibrary,
  onClose
}: SoundModalProps): React.JSX.Element {
  const [draftSoundId, setDraftSoundId] = useState(currentSoundId)
  const [previewing, setPreviewing] = useState(false)
  const previewTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    }
  }, [])

  const handlePreview = (): void => {
    onPreview(draftSoundId)
    setPreviewing(true)

    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => setPreviewing(false), 600)
  }

  const renderRow = (row: SoundRow): React.JSX.Element => {
    const isSelected = draftSoundId === row.id
    const isGlobal = defaultSoundId === row.id

    return (
      <button
        key={row.id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={row.disabled}
        onClick={() => setDraftSoundId(row.id)}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
          isSelected
            ? 'border-accent bg-accent-soft'
            : 'border-line bg-surface-2 hover:border-line-strong hover:bg-surface'
        }`}
      >
        <span
          className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
            isSelected
              ? 'border-accent bg-accent text-on-accent'
              : 'border-line-strong text-transparent'
          }`}
        >
          <CheckIcon size={10} strokeWidth={2.4} />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[12px] font-medium ${
              isSelected ? 'text-accent-ink' : 'text-ink'
            }`}
          >
            {row.name}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">
            {row.description}
          </span>
        </span>

        {isGlobal ? (
          <span
            className={`flex-none rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] ${
              isSelected ? 'border-accent text-accent-ink' : 'border-line text-ink-faint'
            }`}
          >
            Global
          </span>
        ) : null}

        <span
          className={`flex-none text-[9px] font-semibold uppercase tracking-[0.06em] ${
            isSelected ? 'text-accent-ink' : 'text-ink-faint'
          }`}
        >
          {isSelected ? 'Selected' : ''}
        </span>
      </button>
    )
  }

  const builtInRows: SoundRow[] = soundPresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description
  }))

  const customRows: SoundRow[] = customSounds.map((sound) => ({
    id: sound.id,
    name: sound.name,
    description: sound.available
      ? `Your sound · ${formatDuration(sound.duration)}`
      : 'Your sound · file missing',
    disabled: !sound.available
  }))

  return (
    <Modal
      title="Key sound"
      description="Choose a sound for this key."
      icon={<AudioLinesIcon size={16} />}
      onClose={onClose}
      footer={
        <>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDraftSoundId(defaultSoundId)
                onReset()
              }}
              disabled={!hasCustomSound}
              title={
                hasCustomSound
                  ? 'Remove this key’s custom sound'
                  : 'This key already uses the global sound'
              }
            >
              <ResetIcon size={13} />
              Use global
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePreview}
              disabled={!soundsEnabled}
              title={
                soundsEnabled
                  ? 'Preview the selected sound'
                  : 'Keyboard sounds are disabled in settings'
              }
            >
              {previewing ? <AudioLinesIcon size={13} /> : <PlayIcon size={13} />}
              {previewing ? 'Previewing' : 'Preview'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onManageLibrary}>
              Sound library
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onApply(draftSoundId)}
            >
              Apply sound
            </button>
          </div>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-2 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="keycap flex-none rounded-md"
            data-selected="true"
            aria-hidden="true"
            style={{ width: 32, height: 32 }}
          >
            <span style={{ fontSize: keyDefinition.label.length > 3 ? 8 : 11 }}>
              {keyDefinition.label}
            </span>
          </span>
          <div className="min-w-0">
            <span className="label-overline">Selected key</span>
            <div className="mt-0.5 flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-[12px] font-semibold text-ink">
                {keyDefinition.name}
              </span>
              <span className="flex-none text-[10px] text-ink-faint">{keyDefinition.category}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-none border-l border-line pl-3 text-right">
          <span className="label-overline">Assigned</span>
          <p className="mt-0.5 max-w-[160px] truncate text-[11px] font-medium text-ink">
            {getSoundDisplayName(currentSoundId, customSounds)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="label-overline">Built-in presets</span>
        <span className="text-[10px] text-ink-faint">{soundPresets.length} bundled sounds</span>
      </div>

      <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Sound preset">
        {builtInRows.map(renderRow)}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="label-overline">Your sounds</span>
        <span className="text-[10px] text-ink-faint">
          {customSounds.length === 0 ? 'None uploaded' : `${customSounds.length} uploaded`}
        </span>
      </div>

      {customSounds.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-line bg-surface-2 px-3 py-4 text-center">
          <p className="text-[10.5px] text-ink-muted">
            Upload your own .wav files from the sound library.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Your sounds">
          {customRows.map(renderRow)}
        </div>
      )}
    </Modal>
  )
}

export default SoundModal

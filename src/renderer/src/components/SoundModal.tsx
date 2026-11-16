import { useEffect, useRef, useState } from 'react'
import type { KeyDefinition } from '../data/keyboard'
import { getSoundPreset, soundPresets } from '../data/sounds'
import Modal from './Modal'
import { AudioLinesIcon, CheckIcon, PlayIcon, ResetIcon } from './icons'

interface SoundModalProps {
  keyDefinition: KeyDefinition
  currentSoundId: string
  /** The active global default, used when a key falls back to it. */
  defaultSoundId: string
  hasCustomSound: boolean
  soundsEnabled: boolean
  onApply: (soundId: string) => void
  onPreview: (soundId: string) => void
  onReset: () => void
  onClose: () => void
}

function SoundModal({
  keyDefinition,
  currentSoundId,
  defaultSoundId,
  hasCustomSound,
  soundsEnabled,
  onApply,
  onPreview,
  onReset,
  onClose
}: SoundModalProps): React.JSX.Element {
  const [draftSoundId, setDraftSoundId] = useState(currentSoundId)
  const [previewing, setPreviewing] = useState(false)
  const previewTimer = useRef<number | null>(null)

  const currentSound = getSoundPreset(currentSoundId)

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

  return (
    <Modal
      title="Key sound"
      description="Choose a built-in sound preset for this key."
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
                  : 'This key already uses the default sound'
              }
            >
              <ResetIcon size={13} />
              Reset to default
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePreview}
              disabled={!soundsEnabled}
              title={
                soundsEnabled
                  ? 'Preview the selected preset'
                  : 'Keyboard sounds are disabled in settings'
              }
            >
              {previewing ? <AudioLinesIcon size={13} /> : <PlayIcon size={13} />}
              {previewing ? 'Previewing' : 'Preview'}
            </button>
          </div>

          <div className="flex items-center gap-2">
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
            {currentSound.name}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="label-overline">Sound library</span>
        <span className="text-[10px] text-ink-faint">{soundPresets.length} built-in presets</span>
      </div>

      <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Sound preset">
        {soundPresets.map((preset) => {
          const isSelected = draftSoundId === preset.id

          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setDraftSoundId(preset.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
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
                  {preset.name}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">
                  {preset.description}
                </span>
              </span>

              <span
                className={`flex-none text-[9px] font-semibold uppercase tracking-[0.06em] ${
                  isSelected ? 'text-accent-ink' : 'text-ink-faint'
                }`}
              >
                {isSelected ? 'Selected' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

export default SoundModal

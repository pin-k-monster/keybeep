import { useMemo, useRef, useState } from 'react'
import {
  CUSTOM_SOUND_EXTENSION,
  MAX_CUSTOM_SOUND_BYTES,
  type CustomSound
} from '../../../preload/customSoundsIpc'
import type { SoundAssignments } from '../data/soundAssignments'
import { formatDuration, formatFileSize } from '../data/soundFormat'
import Modal from './Modal'
import { AudioLinesIcon, CheckIcon, PencilIcon, PlayIcon, TrashIcon, UploadIcon } from './icons'

export type SoundUploadOutcome = { ok: true } | { ok: false; message: string }

interface SoundLibraryModalProps {
  sounds: CustomSound[]
  globalSoundId: string
  assignments: SoundAssignments
  soundsEnabled: boolean
  onUpload: (file: File) => Promise<SoundUploadOutcome>
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSetGlobal: (id: string) => void
  onPreview: (id: string) => void
  onClose: () => void
}

function SoundLibraryModal({
  sounds,
  globalSoundId,
  assignments,
  soundsEnabled,
  onUpload,
  onRename,
  onDelete,
  onSetGlobal,
  onPreview,
  onClose
}: SoundLibraryModalProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CustomSound | null>(null)

  const usage = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const soundId of Object.values(assignments)) {
      counts[soundId] = (counts[soundId] ?? 0) + 1
    }
    return counts
  }, [assignments])

  const totalBytes = useMemo(() => sounds.reduce((sum, sound) => sum + sound.fileSize, 0), [sounds])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    // Reset immediately so selecting the same file twice still fires `change`.
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith(CUSTOM_SOUND_EXTENSION)) {
      setUploadError('Only .wav files can be uploaded.')
      return
    }
    if (file.size > MAX_CUSTOM_SOUND_BYTES) {
      setUploadError(
        `WAV files must be ${Math.round(MAX_CUSTOM_SOUND_BYTES / (1024 * 1024))} MB or smaller.`
      )
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const result = await onUpload(file)
      if (!result.ok) setUploadError(result.message)
    } catch {
      setUploadError('The sound could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  const startRename = (sound: CustomSound): void => {
    setEditingId(sound.id)
    setDraftName(sound.name)
  }

  const commitRename = (): void => {
    if (editingId === null) return
    const trimmed = draftName.trim()
    if (trimmed.length > 0) onRename(editingId, trimmed)
    setEditingId(null)
  }

  const usageSummary = (sound: CustomSound): string | null => {
    const parts: string[] = []
    if (globalSoundId === sound.id) parts.push('global')
    const keyCount = usage[sound.id] ?? 0
    if (keyCount > 0) parts.push(`${keyCount} ${keyCount === 1 ? 'key' : 'keys'}`)
    return parts.length > 0 ? `Used by ${parts.join(' + ')}` : null
  }

  return (
    <Modal
      title="Sound library"
      description="Upload your own WAV files and assign them to the keyboard."
      icon={<AudioLinesIcon size={16} />}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <span className="text-[10px] text-ink-faint">
            Assign a sound to a key by double-clicking that key.
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-ink-faint">
          {sounds.length} {sounds.length === 1 ? 'sound' : 'sounds'} · {formatFileSize(totalBytes)}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,audio/wav,audio/x-wav"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <UploadIcon size={13} />
          {uploading ? 'Uploading…' : 'Upload WAV'}
        </button>
      </div>

      {uploadError ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[10.5px] leading-relaxed text-ink-muted"
        >
          {uploadError}
        </p>
      ) : null}

      {sounds.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-surface-2 px-4 py-8 text-center">
          <p className="text-[11px] font-medium text-ink">No custom sounds yet</p>
          <p className="mt-1 text-[10.5px] text-ink-muted">
            Upload a .wav file to add it to your library.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {sounds.map((sound) => {
            const isGlobal = globalSoundId === sound.id
            const isEditing = editingId === sound.id
            const summary = usageSummary(sound)

            return (
              <li
                key={sound.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  isGlobal ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2'
                }`}
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={draftName}
                      maxLength={60}
                      onChange={(event) => setDraftName(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename()
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                      className="w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-[12px] font-medium text-ink outline-none focus:border-accent"
                    />
                  ) : (
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`truncate text-[12px] font-medium ${
                          isGlobal ? 'text-accent-ink' : 'text-ink'
                        }`}
                      >
                        {sound.name}
                      </span>
                      {!sound.available ? (
                        <span className="flex-none rounded border border-line bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                          Missing
                        </span>
                      ) : null}
                    </div>
                  )}

                  <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                    {sound.originalFileName}
                    <span className="px-1 text-ink-faint">·</span>
                    {formatDuration(sound.duration)}
                    <span className="px-1 text-ink-faint">·</span>
                    {formatFileSize(sound.fileSize)}
                    {summary ? (
                      <>
                        <span className="px-1 text-ink-faint">·</span>
                        {summary}
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-0.5">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onPreview(sound.id)}
                    disabled={!soundsEnabled || !sound.available}
                    aria-label={`Preview ${sound.name}`}
                    title={
                      !sound.available
                        ? 'The sound file is missing'
                        : soundsEnabled
                          ? 'Preview sound'
                          : 'Keyboard sounds are disabled in settings'
                    }
                  >
                    <PlayIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => startRename(sound)}
                    aria-label={`Rename ${sound.name}`}
                    title="Rename"
                  >
                    <PencilIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSetGlobal(sound.id)}
                    disabled={isGlobal || !sound.available}
                    title={
                      !sound.available
                        ? 'The sound file is missing'
                        : isGlobal
                          ? 'Already the global sound'
                          : 'Use for every button without an individual sound'
                    }
                  >
                    {isGlobal ? <CheckIcon size={12} /> : null}
                    {isGlobal ? 'Global' : 'Set global'}
                  </button>
                  <button
                    type="button"
                    className="icon-button hover:text-[var(--accent-ink)]"
                    onClick={() => setPendingDelete(sound)}
                    aria-label={`Delete ${sound.name}`}
                    title="Delete"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pendingDelete ? (
        <Modal
          title={`Delete "${pendingDelete.name}"?`}
          description="The file and every assignment that uses it will be removed."
          icon={<TrashIcon size={16} />}
          size="sm"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onDelete(pendingDelete.id)
                  setPendingDelete(null)
                }}
              >
                Delete sound
              </button>
            </>
          }
        >
          <p className="text-[11px] leading-relaxed text-ink-muted">
            {globalSoundId === pendingDelete.id
              ? 'This is your global sound, so every button without an individual sound will fall back to the original default. '
              : ''}
            {usage[pendingDelete.id]
              ? `${usage[pendingDelete.id]} ${
                  usage[pendingDelete.id] === 1 ? 'key uses' : 'keys use'
                } this sound directly; they will fall back to the next available sound. `
              : ''}
            This cannot be undone.
          </p>
        </Modal>
      ) : null}
    </Modal>
  )
}

export default SoundLibraryModal

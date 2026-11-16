import { app, ipcMain } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import {
  CUSTOM_SOUNDS_IPC,
  CUSTOM_SOUND_EXTENSION,
  CUSTOM_SOUND_ID_PREFIX,
  MAX_CUSTOM_SOUND_BYTES,
  MAX_CUSTOM_SOUND_SECONDS,
  MIN_CUSTOM_SOUND_SECONDS,
  type CustomSound,
  type CustomSoundErrorCode,
  type CustomSoundRemoveResult,
  type CustomSoundUploadResult
} from '../preload/customSoundsIpc'
import { getSettings, removeSoundReferences } from './settings'

/**
 * The internal record keeps the stored file name and a content hash, which are
 * never exposed to the renderer. The public DTO adds an `available` flag that
 * reflects whether the file is currently readable.
 */
interface CustomSoundRecord {
  id: string
  name: string
  originalFileName: string
  /** Name of the file inside the sounds directory (always `<id>.wav`). */
  fileName: string
  duration: number
  fileSize: number
  /** SHA-256 of the uploaded bytes, used to reject duplicates. */
  hash: string
  createdAt: number
}

interface LibraryFile {
  version: 1
  sounds: CustomSoundRecord[]
}

const LIBRARY_VERSION = 1
const MAX_NAME_LENGTH = 60
const ID_PATTERN = /^custom-[0-9a-fA-F-]{8,64}$/
const SAFE_FILE_PATTERN = /^[A-Za-z0-9._-]+$/

let soundsDir = ''
let libraryFile: string | null = null
let sounds: CustomSoundRecord[] = []
let initialized = false

/**
 * Serializes every mutation so concurrent uploads, renames and deletions can
 * never interleave and corrupt the metadata file or the directory.
 */
let mutationQueue: Promise<unknown> = Promise.resolve()

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(task, task)
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toBuffer(value: unknown): Buffer | null {
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  return null
}

function sanitizeName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback

  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)

  return cleaned.length > 0 ? cleaned : fallback
}

function nameFromFile(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  return sanitizeName(withoutExtension, 'Custom sound')
}

function storedFilePath(record: CustomSoundRecord): string {
  return join(soundsDir, record.fileName)
}

function isFileAvailable(record: CustomSoundRecord): boolean {
  try {
    return statSync(storedFilePath(record)).isFile()
  } catch {
    return false
  }
}

function toDto(record: CustomSoundRecord): CustomSound {
  return {
    id: record.id,
    name: record.name,
    originalFileName: record.originalFileName,
    duration: record.duration,
    fileSize: record.fileSize,
    createdAt: record.createdAt,
    available: isFileAvailable(record)
  }
}

function listSounds(): CustomSound[] {
  return sounds.map(toDto)
}

/** Snapshot for the window's first paint. */
export function getCustomSounds(): CustomSound[] {
  return listSounds()
}

function persistLibrary(): void {
  if (!libraryFile) return

  const payload: LibraryFile = { version: LIBRARY_VERSION, sounds }
  const serialized = `${JSON.stringify(payload, null, 2)}\n`

  try {
    mkdirSync(soundsDir, { recursive: true })
    const temporaryFile = `${libraryFile}.tmp`
    writeFileSync(temporaryFile, serialized, 'utf8')

    try {
      renameSync(temporaryFile, libraryFile)
    } catch {
      writeFileSync(libraryFile, serialized, 'utf8')
      try {
        unlinkSync(temporaryFile)
      } catch {
        // The temporary file was already replaced.
      }
    }
  } catch (error) {
    console.error('[KeyBeep] The sound library could not be saved.', error)
  }
}

function readLibraryFile(): unknown {
  if (!libraryFile) return null

  try {
    return JSON.parse(readFileSync(libraryFile, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[KeyBeep] The saved sound library could not be read.', error)
    }
    return null
  }
}

/** Rebuilds a trusted record list from untrusted JSON on disk. */
function sanitizeRecords(raw: unknown): CustomSoundRecord[] {
  if (!isRecord(raw) || !Array.isArray(raw.sounds)) return []

  const seenIds = new Set<string>()
  const seenHashes = new Set<string>()
  const records: CustomSoundRecord[] = []

  for (const entry of raw.sounds) {
    if (!isRecord(entry)) continue

    const id = typeof entry.id === 'string' ? entry.id : ''
    if (!ID_PATTERN.test(id) || seenIds.has(id)) continue

    const hash = typeof entry.hash === 'string' ? entry.hash : ''
    if (hash.length === 0 || seenHashes.has(hash)) continue

    const fileName = `${id}${CUSTOM_SOUND_EXTENSION}`
    if (!SAFE_FILE_PATTERN.test(fileName)) continue

    const fileSize =
      typeof entry.fileSize === 'number' && Number.isFinite(entry.fileSize)
        ? Math.max(0, Math.round(entry.fileSize))
        : 0
    const duration =
      typeof entry.duration === 'number' && Number.isFinite(entry.duration)
        ? Math.max(0, entry.duration)
        : 0
    const createdAt =
      typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt)
        ? entry.createdAt
        : Date.now()

    const originalFileName =
      typeof entry.originalFileName === 'string' && entry.originalFileName.length > 0
        ? basename(entry.originalFileName)
        : fileName

    records.push({
      id,
      name: sanitizeName(entry.name, nameFromFile(originalFileName)),
      originalFileName,
      fileName,
      duration,
      fileSize,
      hash,
      createdAt
    })

    seenIds.add(id)
    seenHashes.add(hash)
  }

  return records
}

/**
 * Minimal, dependency-free WAV reader. It validates the real container and the
 * `fmt ` chunk rather than trusting the file extension or a MIME type, and
 * returns the playable duration so the caller can enforce limits.
 */
function parseWav(buffer: Buffer): { duration: number } | null {
  if (buffer.length < 44) return null
  if (buffer.toString('latin1', 0, 4) !== 'RIFF') return null
  if (buffer.toString('latin1', 8, 12) !== 'WAVE') return null

  let offset = 12
  let format: number | null = null
  let channels = 0
  let sampleRate = 0
  let bitsPerSample = 0
  let dataSize = -1

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('latin1', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const body = offset + 8

    if (chunkId === 'fmt ') {
      if (chunkSize < 16 || body + 16 > buffer.length) return null
      format = buffer.readUInt16LE(body)
      channels = buffer.readUInt16LE(body + 2)
      sampleRate = buffer.readUInt32LE(body + 4)
      bitsPerSample = buffer.readUInt16LE(body + 14)

      // WAVE_FORMAT_EXTENSIBLE stores the real format in the sub-format GUID.
      if (format === 0xfffe) {
        if (chunkSize < 40 || body + 26 > buffer.length) return null
        format = buffer.readUInt16LE(body + 24)
      }
    } else if (chunkId === 'data') {
      dataSize = Math.min(chunkSize, buffer.length - body)
    }

    // Chunks are word-aligned; the extra byte also guarantees progress.
    offset = body + chunkSize + (chunkSize % 2)
  }

  if (format === null || dataSize <= 0) return null
  // 1 = PCM, 3 = IEEE float. Compressed/ADPCM codecs are rejected.
  if (format !== 1 && format !== 3) return null
  if (channels < 1 || channels > 8) return null
  if (sampleRate < 8000 || sampleRate > 192000) return null
  if (bitsPerSample !== 8 && bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
    return null
  }

  const bytesPerFrame = channels * (bitsPerSample / 8)
  if (bytesPerFrame <= 0) return null

  const duration = dataSize / (sampleRate * bytesPerFrame)
  if (!Number.isFinite(duration) || duration <= 0) return null

  return { duration }
}

function fail(code: CustomSoundErrorCode, message: string): CustomSoundUploadResult {
  return { ok: false, code, message }
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

async function uploadSound(request: unknown): Promise<CustomSoundUploadResult> {
  return withLock(async () => {
    if (!isRecord(request)) return fail('unknown', 'The upload request was not valid.')

    const fileName = typeof request.fileName === 'string' ? request.fileName : ''
    const data = toBuffer(request.data)

    if (!fileName.toLowerCase().endsWith(CUSTOM_SOUND_EXTENSION)) {
      return fail('invalid-extension', 'Only .wav files can be uploaded.')
    }
    if (!data || data.length === 0) {
      return fail('invalid-audio', 'The selected file is empty or could not be read.')
    }
    if (data.length > MAX_CUSTOM_SOUND_BYTES) {
      return fail(
        'too-large',
        `WAV files must be ${formatMegabytes(MAX_CUSTOM_SOUND_BYTES)} or smaller.`
      )
    }

    const info = parseWav(data)
    if (!info) {
      return fail('invalid-audio', 'That file is not a valid, uncompressed WAV audio file.')
    }
    if (info.duration < MIN_CUSTOM_SOUND_SECONDS) {
      return fail('too-short', 'That sound is too short to use.')
    }
    if (info.duration > MAX_CUSTOM_SOUND_SECONDS) {
      return fail('too-long', `Sounds must be ${MAX_CUSTOM_SOUND_SECONDS} seconds or shorter.`)
    }

    const hash = createHash('sha256').update(data).digest('hex')
    if (sounds.some((sound) => sound.hash === hash)) {
      return fail('duplicate', 'That sound has already been added to your library.')
    }

    const id = `${CUSTOM_SOUND_ID_PREFIX}${randomUUID()}`
    const record: CustomSoundRecord = {
      id,
      name: nameFromFile(fileName),
      originalFileName: basename(fileName),
      fileName: `${id}${CUSTOM_SOUND_EXTENSION}`,
      duration: Math.round(info.duration * 1000) / 1000,
      fileSize: data.length,
      hash,
      createdAt: Date.now()
    }

    try {
      mkdirSync(soundsDir, { recursive: true })
      writeFileSync(storedFilePath(record), data)
    } catch (error) {
      console.error('[KeyBeep] The uploaded sound could not be saved.', error)
      return fail('storage', 'The sound could not be saved to disk.')
    }

    sounds.push(record)
    persistLibrary()

    return { ok: true, sound: toDto(record), sounds: listSounds() }
  })
}

async function renameSound(id: unknown, name: unknown): Promise<CustomSound[]> {
  return withLock(async () => {
    const record = typeof id === 'string' ? sounds.find((sound) => sound.id === id) : undefined

    if (record) {
      const next = sanitizeName(name, record.name)
      if (next !== record.name) {
        record.name = next
        persistLibrary()
      }
    }

    return listSounds()
  })
}

async function removeSound(id: unknown): Promise<CustomSoundRemoveResult> {
  return withLock(async () => {
    const soundId = typeof id === 'string' ? id : ''
    const index = sounds.findIndex((sound) => sound.id === soundId)

    if (index === -1) {
      return { ok: false, sounds: listSounds(), settings: getSettings() }
    }

    const [record] = sounds.splice(index, 1)

    try {
      unlinkSync(storedFilePath(record))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('[KeyBeep] The sound file could not be removed.', error)
      }
    }

    persistLibrary()
    // Scrub the assignments inside the same lock so a reference can never
    // outlive the sound it points at.
    const settings = removeSoundReferences(record.id)

    return { ok: true, sounds: listSounds(), settings }
  })
}

function readSoundData(id: unknown): Uint8Array | null {
  const record = typeof id === 'string' ? sounds.find((sound) => sound.id === id) : undefined
  if (!record) return null

  const filePath = storedFilePath(record)
  const resolvedDir = resolve(soundsDir)
  // Defense in depth: the file must live directly inside the sounds directory.
  if (resolve(filePath) !== join(resolvedDir, record.fileName)) return null
  if (!filePath.startsWith(resolvedDir + sep)) return null

  try {
    return new Uint8Array(readFileSync(filePath))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[KeyBeep] A sound file could not be read.', error)
    }
    return null
  }
}

/** Loads the library from disk and normalizes it. Safe to call once. */
export function initializeCustomSounds(): void {
  if (initialized) return
  initialized = true

  soundsDir = join(app.getPath('userData'), 'sounds')
  libraryFile = join(app.getPath('userData'), 'custom-sounds.json')

  try {
    mkdirSync(soundsDir, { recursive: true })
  } catch (error) {
    console.error('[KeyBeep] The sounds directory could not be created.', error)
  }

  sounds = sanitizeRecords(readLibraryFile())
  persistLibrary()
}

export function registerCustomSoundsIpc(): void {
  ipcMain.handle(CUSTOM_SOUNDS_IPC.list, () => listSounds())
  ipcMain.handle(CUSTOM_SOUNDS_IPC.upload, (_event, request: unknown) => uploadSound(request))
  ipcMain.handle(CUSTOM_SOUNDS_IPC.rename, (_event, id: unknown, name: unknown) =>
    renameSound(id, name)
  )
  ipcMain.handle(CUSTOM_SOUNDS_IPC.remove, (_event, id: unknown) => removeSound(id))
  ipcMain.handle(CUSTOM_SOUNDS_IPC.read, (_event, id: unknown) => readSoundData(id))
}

export function disposeCustomSounds(): void {
  ipcMain.removeHandler(CUSTOM_SOUNDS_IPC.list)
  ipcMain.removeHandler(CUSTOM_SOUNDS_IPC.upload)
  ipcMain.removeHandler(CUSTOM_SOUNDS_IPC.rename)
  ipcMain.removeHandler(CUSTOM_SOUNDS_IPC.remove)
  ipcMain.removeHandler(CUSTOM_SOUNDS_IPC.read)
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CustomSound } from '../../preload/customSoundsIpc'
import { audioEngine } from './audio/engine'
import AboutModal from './components/AboutModal'
import Modal from './components/Modal'
import SelectedKeyCard from './components/SelectedKeyCard'
import SettingsModal from './components/SettingsModal'
import SoundLibraryModal, { type SoundUploadOutcome } from './components/SoundLibraryModal'
import SoundModal from './components/SoundModal'
import VirtualKeyboard from './components/VirtualKeyboard'
import VolumeControl from './components/VolumeControl'
import { InfoIcon, KeyboardIcon, ResetIcon, SettingsIcon } from './components/icons'
import { DEFAULT_SELECTED_KEY_ID, getKeyDefinition, getKeyDefinitionByCode } from './data/keyboard'
import {
  assignSound,
  countCustomSounds,
  hasCustomSound,
  resetAllSounds,
  resetKeySound,
  type SoundAssignments
} from './data/soundAssignments'
import {
  buildCustomSoundIndex,
  getSoundDisplayName,
  resolveEffectiveSoundId
} from './data/soundResolution'
import { DEFAULT_SOUND_ID } from './data/sounds'
import { useTheme, type ThemeMode } from './hooks/useTheme'
import { SETTINGS_DEFAULTS } from '../../preload/settingsIpc'

function App(): React.JSX.Element {
  // The main process hands over the saved settings with the window, so the
  // first paint already matches what the user configured.
  const settingsApi = window.api?.settings
  const initialSettings = settingsApi?.initial ?? SETTINGS_DEFAULTS
  const soundsApi = window.api?.customSounds

  // Nothing to load when the bridge is absent; when a snapshot is present the
  // UI can render saved values immediately and reconcile in the background.
  const [settingsLoaded, setSettingsLoaded] = useState(!settingsApi || settingsApi.initial != null)
  const [selectedKeyId, setSelectedKeyId] = useState(DEFAULT_SELECTED_KEY_ID)
  const [assignedSounds, setAssignedSounds] = useState<SoundAssignments>(
    initialSettings.soundAssignments
  )
  const [customSounds, setCustomSounds] = useState<CustomSound[]>(soundsApi?.initial ?? [])
  const [pressedKeys, setPressedKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [volume, setVolume] = useState(initialSettings.masterVolume)
  const [muted, setMuted] = useState(initialSettings.muted)
  const [soundsEnabled, setSoundsEnabled] = useState(initialSettings.soundsEnabled)
  const [launchAtStartup, setLaunchAtStartup] = useState(initialSettings.launchAtStartup)
  const [minimizeToTray, setMinimizeToTray] = useState(initialSettings.minimizeToTray)
  const [defaultSoundId, setDefaultSoundId] = useState<string>(initialSettings.defaultSoundId)
  const [theme, setTheme] = useState<ThemeMode>(initialSettings.theme)

  const [soundModalOpen, setSoundModalOpen] = useState(false)
  const [soundLibraryOpen, setSoundLibraryOpen] = useState(false)
  const [resetAllOpen, setResetAllOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const { resolvedTheme } = useTheme(theme)
  const previewTimer = useRef<number | null>(null)
  const assignedSoundsRef = useRef(assignedSounds)
  const soundsEnabledRef = useRef(soundsEnabled)
  const defaultSoundIdRef = useRef(defaultSoundId)

  // Ids of the custom sounds that are actually usable right now. Everything
  // that resolves a sound consults this, so a missing file never plays.
  const customSoundIndex = useMemo(() => buildCustomSoundIndex(customSounds), [customSounds])
  const customSoundIndexRef = useRef(customSoundIndex)

  useLayoutEffect(() => {
    audioEngine.setEnabled(soundsEnabled)
  }, [soundsEnabled])

  useLayoutEffect(() => {
    audioEngine.setOutput(volume / 100, muted)
  }, [volume, muted])

  useLayoutEffect(() => {
    assignedSoundsRef.current = assignedSounds
    soundsEnabledRef.current = soundsEnabled
    defaultSoundIdRef.current = defaultSoundId
    customSoundIndexRef.current = customSoundIndex
  }, [assignedSounds, soundsEnabled, defaultSoundId, customSoundIndex])

  useEffect(() => {
    return () => {
      void audioEngine.dispose()
    }
  }, [])

  // The engine stays decoupled from IPC: hand it a loader for custom bytes.
  useEffect(() => {
    const api = window.api?.customSounds
    audioEngine.setCustomSoundLoader(api ? (soundId) => api.read(soundId) : null)

    return () => {
      audioEngine.setCustomSoundLoader(null)
    }
  }, [])

  // Load the persisted settings once. When the synchronous snapshot is missing
  // this is the authoritative source; otherwise it reconciles silently.
  useEffect(() => {
    const settings = window.api?.settings
    if (!settings) return

    let active = true

    settings
      .get()
      .then((loaded) => {
        if (!active) return
        setSoundsEnabled(loaded.soundsEnabled)
        setVolume(loaded.masterVolume)
        setMuted(loaded.muted)
        setDefaultSoundId(loaded.defaultSoundId)
        setAssignedSounds(loaded.soundAssignments)
        setLaunchAtStartup(loaded.launchAtStartup)
        setMinimizeToTray(loaded.minimizeToTray)
        setTheme(loaded.theme)
        setSettingsLoaded(true)
      })
      .catch((error) => {
        if (!active) return
        console.warn('[KeyBeep] Saved settings could not be loaded; using defaults.', error)
        setSettingsLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  // Load the custom sound library once; the snapshot covers the first paint.
  useEffect(() => {
    const api = window.api?.customSounds
    if (!api) return

    let active = true

    api
      .list()
      .then((list) => {
        if (active) setCustomSounds(list)
      })
      .catch((error) => {
        console.warn('[KeyBeep] The sound library could not be loaded.', error)
      })

    return () => {
      active = false
    }
  }, [])

  // Persist every change immediately by sending the full snapshot. This keeps a
  // single source of truth and avoids per-handler persistence gaps.
  useEffect(() => {
    if (!settingsLoaded) return
    const settings = window.api?.settings
    if (!settings) return

    let active = true

    settings
      .update({
        soundsEnabled,
        masterVolume: volume,
        muted,
        defaultSoundId,
        soundAssignments: assignedSounds,
        launchAtStartup,
        minimizeToTray,
        theme
      })
      .then((effective) => {
        if (!active) return
        // The operating system is authoritative for launch-at-startup, so mirror
        // any correction it made (for example if the registry write failed).
        setLaunchAtStartup((current) =>
          current === effective.launchAtStartup ? current : effective.launchAtStartup
        )
      })
      .catch((error) => {
        console.warn('[KeyBeep] Settings could not be saved.', error)
      })

    return () => {
      active = false
    }
  }, [
    settingsLoaded,
    soundsEnabled,
    volume,
    muted,
    defaultSoundId,
    assignedSounds,
    launchAtStartup,
    minimizeToTray,
    theme
  ])

  // Decode the custom sounds that are actually referenced so presses never wait
  // on disk or IPC. Re-runs whenever the library or the assignments change.
  useEffect(() => {
    if (!settingsLoaded) return

    const referenced = new Set<string>()
    if (customSoundIndex.has(defaultSoundId)) referenced.add(defaultSoundId)
    for (const soundId of Object.values(assignedSounds)) {
      if (customSoundIndex.has(soundId)) referenced.add(soundId)
    }

    if (referenced.size > 0) void audioEngine.preloadCustomSounds([...referenced])
  }, [settingsLoaded, customSoundIndex, defaultSoundId, assignedSounds])

  // The native hook is the only path for physical key presses. It starts when
  // sounds are enabled and stops (releasing the OS listener) when disabled.
  // Waiting for the saved settings avoids a start/stop blip on launch.
  useEffect(() => {
    if (!settingsLoaded) return

    const keyboard = window.api?.keyboard
    if (!keyboard) return

    if (!soundsEnabled) {
      // Stopping the hook broadcasts a status event that clears pressed keys.
      void keyboard.setListening(false)
      return
    }

    let active = true
    void audioEngine.preload()
    void keyboard
      .setListening(true)
      .then((nextStatus) => {
        if (!active || nextStatus === 'started') return
        console.warn(`[KeyBeep] Global keyboard listening is unavailable (${nextStatus}).`)
        setPressedKeys((previous) => (previous.size > 0 ? new Set() : previous))
      })
      .catch((error) => {
        if (!active) return
        console.warn('[KeyBeep] Global keyboard listening could not be started.', error)
        setPressedKeys((previous) => (previous.size > 0 ? new Set() : previous))
      })

    return () => {
      active = false
      void keyboard.setListening(false)
    }
  }, [soundsEnabled, settingsLoaded])

  // Subscribe once; refs keep the latest assignments, library and enabled state
  // without re-subscribing or re-rendering the keyboard tree on every press.
  useEffect(() => {
    const keyboard = window.api?.keyboard
    if (!keyboard) return

    const unsubscribeKeyEvent = keyboard.onKeyEvent((event) => {
      if (!soundsEnabledRef.current) return

      const key = getKeyDefinitionByCode(event.code)
      if (!key) return

      if (event.type === 'keyup') {
        setPressedKeys((previous) => {
          if (!previous.has(key.id)) return previous
          const next = new Set(previous)
          next.delete(key.id)
          return next
        })
        return
      }

      audioEngine.play(
        resolveEffectiveSoundId(
          assignedSoundsRef.current,
          key.code,
          defaultSoundIdRef.current,
          customSoundIndexRef.current
        )
      )
      setPressedKeys((previous) => {
        if (previous.has(key.id)) return previous
        const next = new Set(previous)
        next.add(key.id)
        return next
      })
    })

    const unsubscribeStatus = keyboard.onStatus((nextStatus) => {
      if (nextStatus === 'started') return
      setPressedKeys((previous) => (previous.size > 0 ? new Set() : previous))
    })

    return () => {
      unsubscribeKeyEvent()
      unsubscribeStatus()
    }
  }, [])

  const selectedKey = getKeyDefinition(selectedKeyId)
  const selectedSoundId = resolveEffectiveSoundId(
    assignedSounds,
    selectedKey.code,
    defaultSoundId,
    customSoundIndex
  )
  const selectedSoundName = getSoundDisplayName(selectedSoundId, customSounds)
  const selectedHasCustomSound = hasCustomSound(assignedSounds, selectedKey.code)
  const customSoundCount = countCustomSounds(assignedSounds)
  const isMuted = muted || volume === 0

  const handleKeyPressChange = useCallback((keyId: string, pressed: boolean) => {
    setPressedKeys((previous) => {
      if (previous.has(keyId) === pressed) return previous

      const next = new Set(previous)
      if (pressed) next.add(keyId)
      else next.delete(keyId)
      return next
    })
  }, [])

  const handleSelectKey = useCallback((keyId: string) => {
    setSelectedKeyId(keyId)
  }, [])

  const handlePlayKey = useCallback(
    (keyId: string) => {
      const key = getKeyDefinition(keyId)
      audioEngine.play(
        resolveEffectiveSoundId(assignedSounds, key.code, defaultSoundId, customSoundIndex)
      )
    },
    [assignedSounds, defaultSoundId, customSoundIndex]
  )

  const handleOpenSoundModal = useCallback(() => {
    setSoundModalOpen(true)
    void audioEngine.preload()
  }, [])

  const handleConfigureKey = useCallback(
    (keyId: string) => {
      setSelectedKeyId(keyId)
      handleOpenSoundModal()
    },
    [handleOpenSoundModal]
  )

  const flashSelectedKey = useCallback(() => {
    handleKeyPressChange(selectedKeyId, true)

    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => {
      handleKeyPressChange(selectedKeyId, false)
    }, 550)
  }, [handleKeyPressChange, selectedKeyId])

  const handlePreviewSound = useCallback(
    (soundId: string) => {
      audioEngine.play(soundId)
      flashSelectedKey()
    },
    [flashSelectedKey]
  )

  useEffect(() => {
    return () => {
      if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    }
  }, [])

  const handleApplySound = useCallback(
    (soundId: string) => {
      setAssignedSounds((previous) =>
        assignSound(previous, selectedKey.code, soundId, defaultSoundId)
      )
      setSoundModalOpen(false)
    },
    [selectedKey.code, defaultSoundId]
  )

  const handleResetSelectedSound = useCallback(() => {
    setAssignedSounds((previous) => resetKeySound(previous, selectedKey.code))
  }, [selectedKey.code])

  /**
   * Applies the chosen global sound to every button that has no individual
   * override. Individual overrides are intentionally left untouched.
   */
  const handleDefaultSoundChange = useCallback((soundId: string) => {
    setDefaultSoundId((current) => (current === soundId ? current : soundId))
  }, [])

  /** Restores every button to the original default; touches nothing else. */
  const handleResetAllSounds = useCallback(() => {
    setAssignedSounds(resetAllSounds())
    setDefaultSoundId(DEFAULT_SOUND_ID)
    setResetAllOpen(false)
  }, [])

  const handleRequestResetAll = useCallback(() => {
    setSettingsOpen(false)
    setResetAllOpen(true)
  }, [])

  const handleOpenLibrary = useCallback(() => {
    setSoundModalOpen(false)
    setSettingsOpen(false)
    setSoundLibraryOpen(true)
    void audioEngine.preload()
  }, [])

  const handlePreviewCustomSound = useCallback((soundId: string) => {
    audioEngine.play(soundId)
  }, [])

  const handleUploadSound = useCallback(async (file: File): Promise<SoundUploadOutcome> => {
    const api = window.api?.customSounds
    if (!api) return { ok: false, message: 'The sound library is unavailable.' }

    try {
      const data = new Uint8Array(await file.arrayBuffer())
      const result = await api.upload({ fileName: file.name, data })

      if (result.ok) {
        setCustomSounds(result.sounds)
        return { ok: true }
      }

      return { ok: false, message: result.message }
    } catch (error) {
      console.warn('[KeyBeep] The sound could not be uploaded.', error)
      return { ok: false, message: 'The sound could not be uploaded.' }
    }
  }, [])

  const handleRenameSound = useCallback(async (soundId: string, name: string) => {
    const api = window.api?.customSounds
    if (!api) return

    try {
      setCustomSounds(await api.rename(soundId, name))
    } catch (error) {
      console.warn('[KeyBeep] The sound could not be renamed.', error)
    }
  }, [])

  const handleDeleteSound = useCallback(async (soundId: string) => {
    const api = window.api?.customSounds
    if (!api) return

    try {
      // The main process removes the file, the metadata and every reference in
      // one locked step, so no dangling assignment can remain.
      const result = await api.remove(soundId)
      setCustomSounds(result.sounds)
      setDefaultSoundId(result.settings.defaultSoundId)
      setAssignedSounds(result.settings.soundAssignments)
      audioEngine.releaseSound(soundId)
    } catch (error) {
      console.warn('[KeyBeep] The sound could not be deleted.', error)
    }
  }, [])

  const handleVolumeChange = (nextVolume: number): void => {
    setVolume(nextVolume)
    if (nextVolume > 0) setMuted(false)
  }

  const handleToggleMute = (): void => {
    if (isMuted) {
      if (volume === 0) setVolume(50)
      setMuted(false)
    } else {
      setMuted(true)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app text-ink">
      <header className="flex h-[54px] flex-none items-center justify-between gap-4 border-b border-line bg-surface px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line bg-accent-soft text-accent-ink">
            <KeyboardIcon size={17} />
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight text-ink">KeyBeep</h1>
            <span className="hidden truncate text-[10px] text-ink-faint sm:inline">
              Mechanical keyboard sounds
            </span>
          </div>
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundsEnabled((enabled) => !enabled)}
            aria-pressed={soundsEnabled}
            title={soundsEnabled ? 'Disable keyboard sounds' : 'Enable keyboard sounds'}
            className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] font-semibold transition-colors ${
              soundsEnabled
                ? 'border-accent bg-accent-soft text-accent-ink'
                : 'border-line bg-surface-2 text-ink-faint hover:text-ink-muted'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${soundsEnabled ? 'bg-accent' : 'bg-ink-faint'}`}
            />
            {soundsEnabled ? 'Enabled' : 'Disabled'}
          </button>

          <span className="mx-0.5 h-4 w-px bg-line" aria-hidden="true" />

          <button
            type="button"
            className="icon-button"
            onClick={() => setAboutOpen(true)}
            aria-label="About KeyBeep"
            title="About KeyBeep"
          >
            <InfoIcon size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="grid flex-none gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
          <SelectedKeyCard
            keyDefinition={selectedKey}
            soundName={selectedSoundName}
            hasCustomSound={selectedHasCustomSound}
            onConfigure={handleOpenSoundModal}
          />
          <VolumeControl
            volume={volume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
          />
        </div>

        <section className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[12px] font-semibold tracking-tight text-ink">
                Virtual keyboard
              </h2>
              <span className="text-[10px] text-ink-faint">104 keys · ANSI</span>
            </div>
            <div className="hidden items-center gap-3 text-[10px] text-ink-faint sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-accent bg-accent-soft" />
                Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-accent bg-accent" />
                Pressed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1 w-1 rounded-full bg-accent" />
                Custom sound
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-surface-2">
            <div className="flex min-h-full min-w-max items-center justify-center p-4">
              <VirtualKeyboard
                selectedKeyId={selectedKeyId}
                pressedKeys={pressedKeys}
                assignedSounds={assignedSounds}
                onSelectKey={handleSelectKey}
                onConfigureKey={handleConfigureKey}
                onPressKey={handlePlayKey}
                onKeyPressChange={handleKeyPressChange}
              />
            </div>
          </div>

          <div className="flex flex-none items-center justify-between gap-3 border-t border-line px-4 py-2">
            <span className="text-[10px] text-ink-faint">
              {soundsEnabled
                ? 'Click to play and select · Double-click to assign a sound'
                : 'Keyboard sounds are disabled'}
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-[10px] text-ink-faint sm:inline">
                {customSoundCount} customized
              </span>
              {customSoundCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setResetAllOpen(true)}
                  className="text-[10px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  Reset all
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      {soundModalOpen ? (
        <SoundModal
          keyDefinition={selectedKey}
          currentSoundId={selectedSoundId}
          defaultSoundId={defaultSoundId}
          customSounds={customSounds}
          hasCustomSound={selectedHasCustomSound}
          soundsEnabled={soundsEnabled}
          onApply={handleApplySound}
          onPreview={handlePreviewSound}
          onReset={handleResetSelectedSound}
          onManageLibrary={handleOpenLibrary}
          onClose={() => setSoundModalOpen(false)}
        />
      ) : null}

      {soundLibraryOpen ? (
        <SoundLibraryModal
          sounds={customSounds}
          globalSoundId={defaultSoundId}
          assignments={assignedSounds}
          soundsEnabled={soundsEnabled}
          onUpload={handleUploadSound}
          onRename={handleRenameSound}
          onDelete={handleDeleteSound}
          onSetGlobal={handleDefaultSoundChange}
          onPreview={handlePreviewCustomSound}
          onClose={() => setSoundLibraryOpen(false)}
        />
      ) : null}

      {resetAllOpen ? (
        <Modal
          title="Reset all button sounds?"
          description="Every key will return to the original default sound."
          icon={<ResetIcon size={16} />}
          size="sm"
          onClose={() => setResetAllOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setResetAllOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleResetAllSounds}
              >
                Reset all
              </button>
            </>
          }
        >
          <p className="text-[11px] leading-relaxed text-ink-muted">
            {customSoundCount > 0
              ? `${customSoundCount} customized ${customSoundCount === 1 ? 'key' : 'keys'} will return to the original default sound. `
              : 'All keys will return to the original default sound. '}
            Startup, tray, volume and appearance settings are not affected. This cannot be undone.
          </p>
        </Modal>
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          soundsEnabled={soundsEnabled}
          onSoundsEnabledChange={setSoundsEnabled}
          launchAtStartup={launchAtStartup}
          onLaunchAtStartupChange={setLaunchAtStartup}
          minimizeToTray={minimizeToTray}
          onMinimizeToTrayChange={setMinimizeToTray}
          defaultSoundId={defaultSoundId}
          onDefaultSoundChange={handleDefaultSoundChange}
          customSounds={customSounds}
          customSoundCount={customSoundCount}
          onManageLibrary={handleOpenLibrary}
          onResetAllSounds={handleRequestResetAll}
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {aboutOpen ? <AboutModal onClose={() => setAboutOpen(false)} /> : null}
    </div>
  )
}

export default App

import type { ReactNode } from 'react'
import type { ResolvedTheme, ThemeMode } from '../hooks/useTheme'
import { soundPresets } from '../data/sounds'
import Modal from './Modal'
import { CheckIcon, MonitorIcon, MoonIcon, ResetIcon, SettingsIcon, SunIcon } from './icons'

interface SettingsModalProps {
  soundsEnabled: boolean
  onSoundsEnabledChange: (enabled: boolean) => void
  launchAtStartup: boolean
  onLaunchAtStartupChange: (enabled: boolean) => void
  minimizeToTray: boolean
  onMinimizeToTrayChange: (enabled: boolean) => void
  defaultSoundId: string
  onDefaultSoundChange: (soundId: string) => void
  customSoundCount: number
  onResetAllSounds: () => void
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  onThemeChange: (theme: ThemeMode) => void
  onClose: () => void
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

function Switch({ checked, onChange, label }: SwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`switch relative inline-flex h-[22px] w-[38px] flex-none items-center rounded-full border transition-colors ${
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-[var(--switch-off)]'
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? 'translate-x-[19px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}

interface SettingRowProps {
  title: string
  description: string
  control: ReactNode
}

function SettingRow({ title, description, control }: SettingRowProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-medium text-ink">{title}</span>
        </div>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">{description}</p>
      </div>
      {control}
    </div>
  )
}

const themeOptions = [
  { id: 'system', label: 'System', icon: MonitorIcon },
  { id: 'light', label: 'Light', icon: SunIcon },
  { id: 'dark', label: 'Dark', icon: MoonIcon }
] as const

function SettingsModal({
  soundsEnabled,
  onSoundsEnabledChange,
  launchAtStartup,
  onLaunchAtStartupChange,
  minimizeToTray,
  onMinimizeToTrayChange,
  defaultSoundId,
  onDefaultSoundChange,
  customSoundCount,
  onResetAllSounds,
  theme,
  resolvedTheme,
  onThemeChange,
  onClose
}: SettingsModalProps): React.JSX.Element {
  return (
    <Modal
      title="Settings"
      description="Sound behavior, startup options and appearance."
      icon={<SettingsIcon size={16} />}
      onClose={onClose}
      footer={
        <>
          <span className="text-[10px] text-ink-faint">Changes apply immediately.</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="label-overline">General</h3>
          <span className="text-[10px] text-ink-faint">Keyboard sounds</span>
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          <SettingRow
            title="Keyboard sounds"
            description="Enable sound feedback for key presses."
            control={
              <Switch
                checked={soundsEnabled}
                onChange={onSoundsEnabledChange}
                label="Enable keyboard sounds"
              />
            }
          />
          <SettingRow
            title="Launch at startup"
            description="Open KeyBeep automatically when you sign in to Windows."
            control={
              <Switch
                checked={launchAtStartup}
                onChange={onLaunchAtStartupChange}
                label="Launch at startup"
              />
            }
          />
          <SettingRow
            title="Minimize to tray"
            description="Keep KeyBeep running in the system tray when minimized or closed."
            control={
              <Switch
                checked={minimizeToTray}
                onChange={onMinimizeToTrayChange}
                label="Minimize to tray"
              />
            }
          />
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="label-overline">Default button sound</h3>
          <span className="text-[10px] text-ink-faint">Applied to every button</span>
        </div>

        <div
          className="grid grid-cols-2 gap-1.5"
          role="radiogroup"
          aria-label="Default button sound"
        >
          {soundPresets.map((preset) => {
            const active = defaultSoundId === preset.id

            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onDefaultSoundChange(preset.id)}
                className={`flex flex-col gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface-2 hover:border-line-strong hover:bg-surface'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border ${
                      active
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-line-strong text-transparent'
                    }`}
                  >
                    <CheckIcon size={9} strokeWidth={2.6} />
                  </span>
                  <span
                    className={`truncate text-[11px] font-medium ${
                      active ? 'text-accent-ink' : 'text-ink'
                    }`}
                  >
                    {preset.name}
                  </span>
                </span>
                <span className="truncate text-[10px] text-ink-muted">{preset.description}</span>
              </button>
            )
          })}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
          Changing the default updates every button. Individual keys can still be customized on the
          keyboard.
        </p>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="label-overline">Button sounds</h3>
          <span className="text-[10px] text-ink-faint">
            {customSoundCount} customized {customSoundCount === 1 ? 'key' : 'keys'}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface-2 px-3.5 py-3">
          <div className="min-w-0">
            <span className="text-[12px] font-medium text-ink">Reset all button sounds</span>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
              Restore every key to the original default sound. Startup, tray, volume and appearance
              are not affected.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex-none"
            onClick={onResetAllSounds}
          >
            <ResetIcon size={13} />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="label-overline">Appearance</h3>
          <span className="text-[10px] capitalize text-ink-faint">Using {resolvedTheme} theme</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Appearance theme">
          {themeOptions.map((option) => {
            const Icon = option.icon
            const active = theme === option.id

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onThemeChange(option.id)}
                className={`theme-option flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft text-accent-ink'
                    : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <Icon size={15} />
                {option.label}
              </button>
            )
          })}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
          System follows your operating system&apos;s light or dark appearance.
        </p>
      </section>
    </Modal>
  )
}

export default SettingsModal

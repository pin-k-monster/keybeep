import type { KeyDefinition } from '../data/keyboard'
import { SlidersIcon } from './icons'

interface SelectedKeyCardProps {
  keyDefinition: KeyDefinition
  soundName: string
  hasCustomSound: boolean
  onConfigure: () => void
}

function SelectedKeyCard({
  keyDefinition,
  soundName,
  hasCustomSound,
  onConfigure
}: SelectedKeyCardProps): React.JSX.Element {
  const previewFontSize =
    keyDefinition.label.length > 3 ? 8.5 : keyDefinition.label.length > 1 ? 10 : 14

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="label-overline">Selected key</span>
        <span className="text-[10px] font-medium text-ink-faint">{keyDefinition.category}</span>
      </div>

      <div className="mt-2.5 flex min-w-0 items-center gap-3">
        <div
          className="keycap flex-none rounded-[7px]"
          data-selected="true"
          aria-hidden="true"
          style={{ width: 42, height: 42, fontSize: previewFontSize }}
        >
          <span className="font-medium" style={{ fontSize: previewFontSize }}>
            {keyDefinition.label}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold tracking-tight text-ink">
              {keyDefinition.name}
            </h2>
            <span className="flex-none rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-ink-faint">
              {hasCustomSound ? 'Custom' : 'Default'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
            Sound <span className="px-0.5 text-ink-faint">·</span> {soundName}
          </p>
        </div>

        <button type="button" className="btn btn-secondary btn-sm flex-none" onClick={onConfigure}>
          <SlidersIcon size={13} />
          Configure
        </button>
      </div>
    </section>
  )
}

export default SelectedKeyCard

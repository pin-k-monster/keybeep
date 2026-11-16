import type { CSSProperties } from 'react'
import { VolumeIcon, VolumeMutedIcon } from './icons'

interface VolumeControlProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
}

function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute
}: VolumeControlProps): React.JSX.Element {
  const sliderStyle = { '--range-progress': `${volume}%` } as CSSProperties

  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="label-overline">Master volume</span>
        {muted ? (
          <span className="rounded-full border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            Muted
          </span>
        ) : (
          <span className="text-[10px] font-medium tabular-nums text-ink-faint">0–100%</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="icon-button h-7 w-7 flex-none"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute master volume' : 'Mute master volume'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeMutedIcon size={15} /> : <VolumeIcon size={15} />}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className="kb-range min-w-0 flex-1"
          style={sliderStyle}
          aria-label="Master volume"
          aria-valuetext={`${volume}%${muted ? ', muted' : ''}`}
        />

        <span className="w-9 flex-none text-right text-[12px] font-semibold tabular-nums text-ink">
          {volume}%
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-[10px] text-ink-faint">
          {muted ? 'Output muted' : 'Output level'}
        </span>
        <span className="text-[10px] text-ink-faint">Live output</span>
      </div>
    </section>
  )
}

export default VolumeControl

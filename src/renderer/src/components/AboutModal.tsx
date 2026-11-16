import Modal from './Modal'
import { ExternalLinkIcon, GithubIcon, InfoIcon, KeyboardIcon } from './icons'

interface AboutModalProps {
  onClose: () => void
}

function AboutModal({ onClose }: AboutModalProps): React.JSX.Element {
  return (
    <Modal
      title="About"
      description="Application information and credits."
      icon={<InfoIcon size={16} />}
      size="sm"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-accent-soft text-accent-ink">
          <KeyboardIcon size={28} />
        </div>
        <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-ink">KeyBeep</h3>
        <p className="mt-1 max-w-[300px] text-[11px] leading-relaxed text-ink-muted">
          An open-source desktop app that brings satisfying mechanical keyboard sounds to your
          typing.
        </p>
        <span className="mt-2.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] font-medium text-ink-faint">
          Version 1.0.0 · UI preview
        </span>
      </div>

      <div className="mt-5 divide-y divide-line overflow-hidden rounded-lg border border-line">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="text-[11px] text-ink-muted">Version</span>
          <span className="text-[11px] font-medium tabular-nums text-ink">1.0.0</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="text-[11px] text-ink-muted">Built with</span>
          <span className="text-[11px] font-medium text-ink">Electron · React · Tailwind</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="text-[11px] text-ink-muted">Repository</span>
          <a
            href="#"
            onClick={(event) => event.preventDefault()}
            title="Repository link placeholder"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:text-accent-ink"
          >
            <GithubIcon size={13} />
            GitHub
            <span className="rounded border border-line bg-surface-2 px-1 py-0.5 text-[8px] font-medium uppercase tracking-[0.06em] text-ink-faint">
              Placeholder
            </span>
            <ExternalLinkIcon size={11} className="text-ink-faint" />
          </a>
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-ink-faint">
        This build includes the interface only. Audio playback and system-wide key detection are not
        connected yet.
      </p>
    </Modal>
  )
}

export default AboutModal

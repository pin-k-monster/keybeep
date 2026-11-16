import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'

interface ModalProps {
  title: string
  description?: string
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}

const sizeClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[500px]',
  lg: 'max-w-[560px]'
}

function Modal({
  title,
  description,
  icon,
  size = 'md',
  children,
  footer,
  onClose
}: ModalProps): React.JSX.Element {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="kb-overlay absolute inset-0 bg-[var(--overlay)]"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`kb-modal relative flex max-h-[calc(100vh-2rem)] w-full ${sizeClasses[size]} flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-[var(--shadow-modal)] outline-none`}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {icon ? (
            <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line bg-surface-2 text-accent">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[14px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="icon-button -mr-1 -mt-1"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

export default Modal

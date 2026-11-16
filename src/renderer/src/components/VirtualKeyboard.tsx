import type { CSSProperties } from 'react'
import {
  keyboardLayout,
  type GridKeyDefinition,
  type KeyCell,
  type KeyboardSection,
  type KeyDefinition
} from '../data/keyboard'
import type { SoundAssignments } from '../data/soundAssignments'

interface VirtualKeyboardProps {
  selectedKeyId: string
  pressedKeys: ReadonlySet<string>
  assignedSounds: SoundAssignments
  onSelectKey: (keyId: string) => void
  onConfigureKey: (keyId: string) => void
  onPressKey: (keyId: string) => void
  onKeyPressChange: (keyId: string, pressed: boolean) => void
}

const sectionLabels: Record<string, string> = {
  main: 'Main typing area',
  navigation: 'Navigation and arrow keys',
  numpad: 'Numeric keypad'
}

function isKeyCell(cell: KeyCell): cell is KeyDefinition {
  return 'id' in cell
}

function VirtualKeyboard({
  selectedKeyId,
  pressedKeys,
  assignedSounds,
  onSelectKey,
  onConfigureKey,
  onPressKey,
  onKeyPressChange
}: VirtualKeyboardProps): React.JSX.Element {
  const renderKey = (
    definition: KeyDefinition,
    extraStyle: CSSProperties,
    fill = false
  ): React.JSX.Element => {
    const selected = selectedKeyId === definition.id
    const pressed = pressedKeys.has(definition.id)
    const wideLabel = definition.label.length > 2 || (definition.width ?? 1) >= 1.5

    return (
      <button
        key={definition.id}
        type="button"
        className={`keycap ${fill ? 'h-full w-full' : ''}`}
        data-selected={selected}
        data-pressed={pressed}
        data-tone={definition.tone ?? 'default'}
        style={extraStyle}
        aria-label={`${definition.name} key`}
        aria-pressed={selected}
        title={`${definition.name} — click to play, double-click to assign a sound`}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          onPressKey(definition.id)
          onKeyPressChange(definition.id, true)
        }}
        onPointerUp={() => onKeyPressChange(definition.id, false)}
        onPointerLeave={() => onKeyPressChange(definition.id, false)}
        onPointerCancel={() => onKeyPressChange(definition.id, false)}
        onBlur={() => onKeyPressChange(definition.id, false)}
        onClick={() => onSelectKey(definition.id)}
        onDoubleClick={() => onConfigureKey(definition.id)}
      >
        {definition.glyph ? (
          <span className="keycap-glyph">{definition.label}</span>
        ) : definition.sublabel ? (
          <>
            <span
              className="keycap-sublabel absolute"
              style={{
                left: 'calc(var(--ku) * 0.13)',
                top: 'calc(var(--ku) * 0.12)'
              }}
            >
              {definition.sublabel}
            </span>
            <span
              className="keycap-label absolute"
              style={{
                left: 'calc(var(--ku) * 0.13)',
                bottom: 'calc(var(--ku) * 0.11)'
              }}
            >
              {definition.label}
            </span>
          </>
        ) : (
          <span className={wideLabel ? 'keycap-label-sm' : 'keycap-label'}>{definition.label}</span>
        )}

        {assignedSounds[definition.code] ? (
          <span className="keycap-dot" aria-hidden="true" />
        ) : null}
      </button>
    )
  }

  const renderRowsSection = (
    section: Extract<KeyboardSection, { kind: 'rows' }>
  ): React.JSX.Element => (
    <div
      key={section.id}
      role="group"
      aria-label={sectionLabels[section.id]}
      className="flex flex-col gap-[var(--kgap)]"
    >
      {section.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-[var(--kgap)]">
          {row.map((cell, cellIndex) => {
            if (!isKeyCell(cell)) {
              return (
                <div
                  key={`spacer-${cellIndex}`}
                  aria-hidden="true"
                  style={{
                    width: `calc(var(--ku) * ${cell.spacer} - var(--kgap))`,
                    height: 'var(--kh)'
                  }}
                />
              )
            }

            return renderKey(cell, {
              width: `calc(var(--ku) * ${cell.width ?? 1} - var(--kgap))`,
              height: 'var(--kh)'
            })
          })}
        </div>
      ))}
    </div>
  )

  const renderGridSection = (
    section: Extract<KeyboardSection, { kind: 'grid' }>
  ): React.JSX.Element => (
    <div
      key={section.id}
      role="group"
      aria-label={sectionLabels[section.id]}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${section.columns}, calc(var(--ku) - var(--kgap)))`,
        gridTemplateRows: `repeat(${section.rows}, var(--kh))`,
        gap: 'var(--kgap)',
        paddingTop: section.topOffset ? 'calc(var(--kh) + var(--kgap))' : undefined
      }}
    >
      {section.keys.map((definition: GridKeyDefinition) =>
        renderKey(
          definition,
          {
            gridColumn: `${definition.column} / span ${definition.columnSpan ?? 1}`,
            gridRow: `${definition.row} / span ${definition.rowSpan ?? 1}`
          },
          true
        )
      )}
    </div>
  )

  return (
    <div className="keyboard" role="group" aria-label="Virtual ANSI keyboard">
      {keyboardLayout.map((section) =>
        section.kind === 'rows' ? renderRowsSection(section) : renderGridSection(section)
      )}
    </div>
  )
}

export default VirtualKeyboard

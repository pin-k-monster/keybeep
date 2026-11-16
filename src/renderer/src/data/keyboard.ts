export type KeyTone = 'default' | 'modifier'

export type KeyCategory =
  'Function' | 'Number' | 'Letter' | 'Punctuation' | 'Modifier' | 'Navigation' | 'Arrow' | 'Numpad'

export interface KeyDefinition {
  id: string
  /** Physical key identifier, matching KeyboardEvent.code. */
  code: string
  label: string
  name: string
  category: KeyCategory
  sublabel?: string
  width?: number
  tone?: KeyTone
  glyph?: boolean
}

export interface SpacerCell {
  spacer: number
}

export type KeyCell = KeyDefinition | SpacerCell

export interface RowsSection {
  kind: 'rows'
  id: string
  rows: KeyCell[][]
}

export interface GridKeyDefinition extends KeyDefinition {
  column: number
  row: number
  columnSpan?: number
  rowSpan?: number
}

export interface GridSection {
  kind: 'grid'
  id: string
  columns: number
  rows: number
  topOffset?: boolean
  keys: GridKeyDefinition[]
}

export type KeyboardSection = RowsSection | GridSection

const letter = (char: string): KeyDefinition => ({
  id: `key-${char.toLowerCase()}`,
  code: `Key${char.toUpperCase()}`,
  label: char.toUpperCase(),
  name: char.toUpperCase(),
  category: 'Letter'
})

const letters = (chars: string): KeyDefinition[] => [...chars].map(letter)

const digit = (value: string, shifted: string): KeyDefinition => ({
  id: `digit-${value}`,
  code: `Digit${value}`,
  label: value,
  sublabel: shifted,
  name: value,
  category: 'Number'
})

const punctuation = (
  id: string,
  code: string,
  label: string,
  shifted: string,
  name: string
): KeyDefinition => ({
  id,
  code,
  label,
  sublabel: shifted,
  name,
  category: 'Punctuation'
})

const modifier = (
  id: string,
  code: string,
  label: string,
  name: string,
  width: number
): KeyDefinition => ({
  id,
  code,
  label,
  name,
  category: 'Modifier',
  width,
  tone: 'modifier'
})

const functionKey = (label: string): KeyDefinition => ({
  id: label.toLowerCase(),
  code: label,
  label,
  name: label,
  category: 'Function'
})

const navKey = (
  id: string,
  code: string,
  label: string,
  name: string,
  column: number,
  row: number
): GridKeyDefinition => ({
  id,
  code,
  label,
  name,
  category: 'Navigation',
  column,
  row
})

const arrowKey = (
  id: string,
  code: string,
  label: string,
  name: string,
  column: number,
  row: number
): GridKeyDefinition => ({
  id,
  code,
  label,
  name,
  category: 'Arrow',
  glyph: true,
  column,
  row
})

const numpadKey = (
  id: string,
  code: string,
  label: string,
  name: string,
  column: number,
  row: number,
  spans: Pick<GridKeyDefinition, 'columnSpan' | 'rowSpan'> = {}
): GridKeyDefinition => ({
  id,
  code,
  label,
  name,
  category: 'Numpad',
  column,
  row,
  ...spans
})

export const keyboardLayout: KeyboardSection[] = [
  {
    kind: 'rows',
    id: 'main',
    rows: [
      [
        { id: 'escape', code: 'Escape', label: 'Esc', name: 'Escape', category: 'Function' },
        { spacer: 0.5 },
        functionKey('F1'),
        functionKey('F2'),
        functionKey('F3'),
        functionKey('F4'),
        { spacer: 0.5 },
        functionKey('F5'),
        functionKey('F6'),
        functionKey('F7'),
        functionKey('F8'),
        { spacer: 0.5 },
        functionKey('F9'),
        functionKey('F10'),
        functionKey('F11'),
        functionKey('F12'),
        { spacer: 0.5 }
      ],
      [
        punctuation('backtick', 'Backquote', '`', '~', 'Backtick'),
        digit('1', '!'),
        digit('2', '@'),
        digit('3', '#'),
        digit('4', '$'),
        digit('5', '%'),
        digit('6', '^'),
        digit('7', '&'),
        digit('8', '*'),
        digit('9', '('),
        digit('0', ')'),
        punctuation('minus', 'Minus', '-', '_', 'Minus'),
        punctuation('equal', 'Equal', '=', '+', 'Equal'),
        {
          id: 'backspace',
          code: 'Backspace',
          label: 'Backspace',
          name: 'Backspace',
          category: 'Modifier',
          width: 2,
          tone: 'modifier'
        }
      ],
      [
        {
          id: 'tab',
          code: 'Tab',
          label: 'Tab',
          name: 'Tab',
          category: 'Modifier',
          width: 1.5,
          tone: 'modifier'
        },
        ...letters('qwertyuiop'),
        punctuation('bracket-left', 'BracketLeft', '[', '{', 'Left Bracket'),
        punctuation('bracket-right', 'BracketRight', ']', '}', 'Right Bracket'),
        {
          id: 'backslash',
          code: 'Backslash',
          label: '\\',
          sublabel: '|',
          name: 'Backslash',
          category: 'Punctuation',
          width: 1.5
        }
      ],
      [
        {
          id: 'caps-lock',
          code: 'CapsLock',
          label: 'Caps Lock',
          name: 'Caps Lock',
          category: 'Modifier',
          width: 1.75,
          tone: 'modifier'
        },
        ...letters('asdfghjkl'),
        punctuation('semicolon', 'Semicolon', ';', ':', 'Semicolon'),
        punctuation('quote', 'Quote', "'", '"', 'Quote'),
        {
          id: 'enter',
          code: 'Enter',
          label: 'Enter',
          name: 'Enter',
          category: 'Modifier',
          width: 2.25,
          tone: 'modifier'
        }
      ],
      [
        modifier('shift-left', 'ShiftLeft', 'Shift', 'Left Shift', 2.25),
        ...letters('zxcvbnm'),
        punctuation('comma', 'Comma', ',', '<', 'Comma'),
        punctuation('period', 'Period', '.', '>', 'Period'),
        punctuation('slash', 'Slash', '/', '?', 'Slash'),
        modifier('shift-right', 'ShiftRight', 'Shift', 'Right Shift', 2.75)
      ],
      [
        modifier('ctrl-left', 'ControlLeft', 'Ctrl', 'Left Ctrl', 1.25),
        modifier('meta-left', 'MetaLeft', 'Win', 'Left Win', 1.25),
        modifier('alt-left', 'AltLeft', 'Alt', 'Left Alt', 1.25),
        {
          id: 'space',
          code: 'Space',
          label: 'Space',
          name: 'Spacebar',
          category: 'Modifier',
          width: 6.25,
          tone: 'modifier'
        },
        modifier('alt-right', 'AltRight', 'Alt', 'Right Alt', 1.25),
        modifier('meta-right', 'MetaRight', 'Win', 'Right Win', 1.25),
        modifier('menu', 'ContextMenu', 'Menu', 'Menu', 1.25),
        modifier('ctrl-right', 'ControlRight', 'Ctrl', 'Right Ctrl', 1.25)
      ]
    ]
  },
  {
    kind: 'grid',
    id: 'navigation',
    columns: 3,
    rows: 6,
    keys: [
      navKey('print-screen', 'PrintScreen', 'PrtSc', 'Print Screen', 1, 1),
      navKey('scroll-lock', 'ScrollLock', 'ScrLk', 'Scroll Lock', 2, 1),
      navKey('pause', 'Pause', 'Pause', 'Pause', 3, 1),
      navKey('insert', 'Insert', 'Ins', 'Insert', 1, 2),
      navKey('home', 'Home', 'Home', 'Home', 2, 2),
      navKey('page-up', 'PageUp', 'PgUp', 'Page Up', 3, 2),
      navKey('delete', 'Delete', 'Del', 'Delete', 1, 3),
      navKey('end', 'End', 'End', 'End', 2, 3),
      navKey('page-down', 'PageDown', 'PgDn', 'Page Down', 3, 3),
      arrowKey('arrow-up', 'ArrowUp', '↑', 'Arrow Up', 2, 5),
      arrowKey('arrow-left', 'ArrowLeft', '←', 'Arrow Left', 1, 6),
      arrowKey('arrow-down', 'ArrowDown', '↓', 'Arrow Down', 2, 6),
      arrowKey('arrow-right', 'ArrowRight', '→', 'Arrow Right', 3, 6)
    ]
  },
  {
    kind: 'grid',
    id: 'numpad',
    columns: 4,
    rows: 5,
    topOffset: true,
    keys: [
      numpadKey('numpad-num-lock', 'NumLock', 'Num Lock', 'Num Lock', 1, 1),
      numpadKey('numpad-divide', 'NumpadDivide', '/', 'Numpad Divide', 2, 1),
      numpadKey('numpad-multiply', 'NumpadMultiply', '*', 'Numpad Multiply', 3, 1),
      numpadKey('numpad-subtract', 'NumpadSubtract', '−', 'Numpad Minus', 4, 1),
      numpadKey('numpad-7', 'Numpad7', '7', 'Numpad 7', 1, 2),
      numpadKey('numpad-8', 'Numpad8', '8', 'Numpad 8', 2, 2),
      numpadKey('numpad-9', 'Numpad9', '9', 'Numpad 9', 3, 2),
      numpadKey('numpad-add', 'NumpadAdd', '+', 'Numpad Plus', 4, 2, { rowSpan: 2 }),
      numpadKey('numpad-4', 'Numpad4', '4', 'Numpad 4', 1, 3),
      numpadKey('numpad-5', 'Numpad5', '5', 'Numpad 5', 2, 3),
      numpadKey('numpad-6', 'Numpad6', '6', 'Numpad 6', 3, 3),
      numpadKey('numpad-1', 'Numpad1', '1', 'Numpad 1', 1, 4),
      numpadKey('numpad-2', 'Numpad2', '2', 'Numpad 2', 2, 4),
      numpadKey('numpad-3', 'Numpad3', '3', 'Numpad 3', 3, 4),
      numpadKey('numpad-enter', 'NumpadEnter', 'Enter', 'Numpad Enter', 4, 4, {
        rowSpan: 2
      }),
      numpadKey('numpad-0', 'Numpad0', '0', 'Numpad 0', 1, 5, { columnSpan: 2 }),
      numpadKey('numpad-decimal', 'NumpadDecimal', '.', 'Numpad Decimal', 3, 5)
    ]
  }
]

const isKeyCell = (cell: KeyCell): cell is KeyDefinition => 'id' in cell

export const keyboardKeys: KeyDefinition[] = keyboardLayout.flatMap((section) =>
  section.kind === 'rows' ? section.rows.flatMap((row) => row.filter(isKeyCell)) : section.keys
)

export const DEFAULT_SELECTED_KEY_ID = 'key-a'

export function getKeyDefinition(keyId: string): KeyDefinition {
  const key = keyboardKeys.find((item) => item.id === keyId)
  return key ?? keyboardKeys[0]
}

const keyDefinitionsByCode = new Map(keyboardKeys.map((key) => [key.code, key]))

/** Resolves a physical `KeyboardEvent.code` to its virtual key definition. */
export function getKeyDefinitionByCode(keyCode: string): KeyDefinition | undefined {
  return keyDefinitionsByCode.get(keyCode)
}

/**
 * Translation layer between libuiohook's native key codes and the physical
 * `KeyboardEvent.code` identifiers used by the virtual keyboard.
 *
 * The table is intentionally local so the app can load even when the native
 * hook module is missing. Only key identity is translated; nothing here
 * inspects, stores, or forwards typed characters.
 */
const KEY_CODES: ReadonlyArray<readonly [string, number]> = [
  ['Escape', 0x0001],

  ['Digit1', 0x0002],
  ['Digit2', 0x0003],
  ['Digit3', 0x0004],
  ['Digit4', 0x0005],
  ['Digit5', 0x0006],
  ['Digit6', 0x0007],
  ['Digit7', 0x0008],
  ['Digit8', 0x0009],
  ['Digit9', 0x000a],
  ['Digit0', 0x000b],
  ['Minus', 0x000c],
  ['Equal', 0x000d],
  ['Backspace', 0x000e],
  ['Tab', 0x000f],

  ['KeyQ', 0x0010],
  ['KeyW', 0x0011],
  ['KeyE', 0x0012],
  ['KeyR', 0x0013],
  ['KeyT', 0x0014],
  ['KeyY', 0x0015],
  ['KeyU', 0x0016],
  ['KeyI', 0x0017],
  ['KeyO', 0x0018],
  ['KeyP', 0x0019],
  ['BracketLeft', 0x001a],
  ['BracketRight', 0x001b],
  ['Enter', 0x001c],
  ['ControlLeft', 0x001d],

  ['KeyA', 0x001e],
  ['KeyS', 0x001f],
  ['KeyD', 0x0020],
  ['KeyF', 0x0021],
  ['KeyG', 0x0022],
  ['KeyH', 0x0023],
  ['KeyJ', 0x0024],
  ['KeyK', 0x0025],
  ['KeyL', 0x0026],
  ['Semicolon', 0x0027],
  ['Quote', 0x0028],
  ['Backquote', 0x0029],
  ['ShiftLeft', 0x002a],
  ['Backslash', 0x002b],

  ['KeyZ', 0x002c],
  ['KeyX', 0x002d],
  ['KeyC', 0x002e],
  ['KeyV', 0x002f],
  ['KeyB', 0x0030],
  ['KeyN', 0x0031],
  ['KeyM', 0x0032],
  ['Comma', 0x0033],
  ['Period', 0x0034],
  ['Slash', 0x0035],
  ['ShiftRight', 0x0036],
  ['NumpadMultiply', 0x0037],
  ['AltLeft', 0x0038],
  ['Space', 0x0039],
  ['CapsLock', 0x003a],

  ['F1', 0x003b],
  ['F2', 0x003c],
  ['F3', 0x003d],
  ['F4', 0x003e],
  ['F5', 0x003f],
  ['F6', 0x0040],
  ['F7', 0x0041],
  ['F8', 0x0042],
  ['F9', 0x0043],
  ['F10', 0x0044],
  ['NumLock', 0x0045],
  ['ScrollLock', 0x0046],

  ['Numpad7', 0x0047],
  ['Numpad8', 0x0048],
  ['Numpad9', 0x0049],
  ['NumpadSubtract', 0x004a],
  ['Numpad4', 0x004b],
  ['Numpad5', 0x004c],
  ['Numpad6', 0x004d],
  ['NumpadAdd', 0x004e],
  ['Numpad1', 0x004f],
  ['Numpad2', 0x0050],
  ['Numpad3', 0x0051],
  ['Numpad0', 0x0052],
  ['NumpadDecimal', 0x0053],

  ['F11', 0x0057],
  ['F12', 0x0058],

  ['NumpadEnter', 0x0e1c],
  ['ControlRight', 0x0e1d],
  ['NumpadDivide', 0x0e35],
  ['PrintScreen', 0x0e37],
  ['AltRight', 0x0e38],
  ['Pause', 0x0e45],
  ['Home', 0x0e47],
  ['PageUp', 0x0e49],
  ['ArrowLeft', 0xe04b],
  ['ArrowRight', 0xe04d],
  ['End', 0x0e4f],
  ['PageDown', 0x0e51],
  ['Insert', 0x0e52],
  ['Delete', 0x0e53],
  ['MetaLeft', 0x0e5b],
  ['MetaRight', 0x0e5c],
  ['ContextMenu', 0x0e5d],
  ['ArrowUp', 0xe048],
  ['ArrowDown', 0xe050]
]

/**
 * Extended numpad codes reported when Num Lock is off. They are folded back to
 * the matching numpad key so the virtual keyboard stays consistent.
 */
const NUMPAD_NAVIGATION_CODES: ReadonlyArray<readonly [string, number]> = [
  ['Numpad7', 0xee47],
  ['Numpad8', 0xee48],
  ['Numpad9', 0xee49],
  ['Numpad4', 0xee4b],
  ['Numpad5', 0xee4c],
  ['Numpad6', 0xee4d],
  ['Numpad1', 0xee4f],
  ['Numpad2', 0xee50],
  ['Numpad3', 0xee51],
  ['Numpad0', 0xee52],
  ['NumpadDecimal', 0xee53]
]

const nativeToDomCode = new Map<number, string>()

for (const [domCode, nativeKeycode] of [...KEY_CODES, ...NUMPAD_NAVIGATION_CODES]) {
  nativeToDomCode.set(nativeKeycode, domCode)
}

/** Returns the physical DOM key code for a native libuiohook key code. */
export function getDomCodeFromNativeKeycode(nativeKeycode: number): string | undefined {
  return nativeToDomCode.get(nativeKeycode)
}

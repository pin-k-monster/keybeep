import type { KeybeepApi } from './keyboardIpc'

declare global {
  interface Window {
    api: KeybeepApi
  }
}

export {}

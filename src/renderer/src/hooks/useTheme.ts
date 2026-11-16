import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Applies a persisted theme mode to the document and resolves the effective
 * appearance. The mode itself is owned by the caller so it can be loaded from
 * and saved to the persistent settings store.
 */
export function useTheme(theme: ThemeMode): { resolvedTheme: ResolvedTheme } {
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const handleChange = (event: MediaQueryListEvent): void => setPrefersDark(event.matches)

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  return {
    resolvedTheme: theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  }
}

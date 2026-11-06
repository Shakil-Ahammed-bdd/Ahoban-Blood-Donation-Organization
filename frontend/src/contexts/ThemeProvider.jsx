import { useLayoutEffect, useMemo, useState } from 'react'
import darkThemeStyles from '../reference-theme.css?inline'
import ThemeContext from './ThemeContext'

const STORAGE_KEY = 'ahoban-theme'

function getInitialTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch (error) {
    console.warn('Unable to read the saved theme preference.', error)
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.add('theme-transition')

    let style = document.getElementById('ahoban-dark-theme')
    if (theme === 'dark') {
      if (!style) {
        style = document.createElement('style')
        style.id = 'ahoban-dark-theme'
        style.textContent = darkThemeStyles
        document.head.append(style)
      }
    } else {
      style?.remove()
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch (error) {
      console.warn('Unable to save the theme preference.', error)
    }

    const timeout = window.setTimeout(() => root.classList.remove('theme-transition'), 250)
    return () => window.clearTimeout(timeout)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    setTheme: (nextTheme) => setTheme(nextTheme === 'dark' ? 'dark' : 'light'),
    toggleTheme: () => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark'),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider

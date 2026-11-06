import { useTheme } from '../contexts/useTheme'
import { useLanguage } from '../contexts/useLanguage'

function ThemeIcon({ theme }) {
  return theme === 'dark' ? (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M20.2 15.4A8.3 8.3 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  )
}

function ThemeToggle({ className = '', role, variant = 'toggle' }) {
  const { theme, setTheme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  if (variant === 'segmented') {
    return (
      <div aria-label={t('থিম নির্বাচন করুন')} className={`theme-mode-control ${className}`.trim()} role="group">
        {['light', 'dark'].map((mode) => (
          <button
            aria-pressed={theme === mode}
            className={`theme-mode-option${theme === mode ? ' is-active' : ''}`}
            key={mode}
            onClick={() => setTheme(mode)}
            type="button"
          >
            <ThemeIcon theme={mode} />
            <span>{t(mode === 'light' ? 'লাইট মোড' : 'ডার্ক মোড')}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <button
      aria-label={t(nextTheme === 'dark' ? 'ডার্ক মোড চালু করুন' : 'লাইট মোড চালু করুন')}
      aria-pressed={theme === 'dark'}
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      role={role}
      title={t(nextTheme === 'dark' ? 'ডার্ক মোড চালু করুন' : 'লাইট মোড চালু করুন')}
      type="button"
    >
      <ThemeIcon theme={theme} />
      <span>{t(theme === 'dark' ? 'ডার্ক মোড' : 'লাইট মোড')}</span>
    </button>
  )
}

export default ThemeToggle

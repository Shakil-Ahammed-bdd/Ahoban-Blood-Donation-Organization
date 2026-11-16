import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/useTheme'
import { useLanguage } from '../contexts/useLanguage'

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  const label = t(nextTheme === 'dark' ? 'ডার্ক মোড চালু করুন' : 'লাইট মোড চালু করুন')

  return (
    <button
      aria-label={label}
      aria-pressed={theme === 'dark'}
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2} />
    </button>
  )
}

export default ThemeToggle

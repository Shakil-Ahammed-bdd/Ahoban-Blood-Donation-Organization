import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import NotificationContext from './NotificationContext'
import { useLanguage } from './useLanguage'
import './notifications.css'

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const titles = {
  success: 'সফল',
  error: 'ত্রুটি',
  warning: 'সতর্কতা',
  info: 'তথ্য',
}

export function NotificationProvider({ children }) {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState([])
  const timers = useRef(new Map())
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, exiting: true } : notification
    )))
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id)
      setNotifications((current) => current.filter((notification) => notification.id !== id))
    }, 180))
  }, [])

  const notify = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
    const id = ++nextId.current
    const notification = {
      id,
      type: icons[type] ? type : 'info',
      title: title || titles[type] || titles.info,
      message: message || 'দুঃখিত, কাজটি সম্পন্ন করা যায়নি।',
    }
    setNotifications((current) => [...current, notification])
    if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }, [dismiss])

  useEffect(() => {
    function onNotification(event) {
      notify(event.detail || {})
    }
    window.addEventListener('app:notification', onNotification)
    return () => window.removeEventListener('app:notification', onNotification)
  }, [notify])

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer))
    timers.current.clear()
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div aria-label={t('পপআপ নোটিফিকেশন')} className="global-notifications" role="region">
        {notifications.map((notification) => {
          const Icon = icons[notification.type]
          return (
            <section
              aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
              className={`global-notification global-notification-${notification.type}${notification.exiting ? ' global-notification-exiting' : ''}`}
              key={notification.id}
              role={notification.type === 'error' ? 'alert' : 'status'}
            >
              <Icon aria-hidden="true" className="global-notification-icon" size={22} />
              <div className="global-notification-copy">
                <strong>{t(notification.title)}</strong>
                <p>{t(notification.message)}</p>
              </div>
              <button
                aria-label={t('নোটিফিকেশন বন্ধ করুন')}
                className="global-notification-close"
                onClick={() => dismiss(notification.id)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </section>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

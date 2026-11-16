import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { notificationApi } from '../services/api/notificationApi'

function NotificationBell({ mobile = false }) {
  const { t } = useLanguage()
  const { status } = useAuth()
  const authenticated = status === 'authenticated'
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await notificationApi.list({ page: 1, limit: 5 })
      setNotifications(result.notifications || [])
      setUnreadCount(result.unreadCount ?? 0)
      setError('')
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (authenticated) void Promise.resolve().then(loadNotifications)
  }, [authenticated, loadNotifications])

  useEffect(() => {
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    function refresh() {
      if (authenticated) void loadNotifications()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('ahoban-notifications-updated', refresh)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('ahoban-notifications-updated', refresh)
    }
  }, [authenticated, loadNotifications])

  async function markAllRead() {
    if (!unreadCount || saving) return
    setSaving(true)
    setError('')
    try {
      await notificationApi.markAllRead()
      window.dispatchEvent(new Event('ahoban-notifications-updated'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setSaving(false)
    }
  }

  async function openNotification(notification) {
    if (notification.status !== 'read') {
      setSaving(true)
      setError('')
      try {
        await notificationApi.markRead(notification.id)
        window.dispatchEvent(new Event('ahoban-notifications-updated'))
      } catch (requestError) {
        setError(translateErrorMessage(requestError, t))
        return
      } finally {
        setSaving(false)
      }
    }
    setOpen(false)
    navigate('/notifications', { state: { selectedId: notification.id } })
  }

  return (
    <div className={`notification-bell${mobile ? ' mobile-notification-bell' : ''}`} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={t('নোটিফিকেশন')}
        className={`notification-bell-trigger${mobile ? ' mobile-notification-trigger' : ''}`}
        onClick={() => {
          if (!authenticated) {
            navigate('/login')
            return
          }
          setOpen((current) => !current)
          if (!open) void loadNotifications()
        }}
        type="button"
      >
        <Bell aria-hidden="true" size={18} strokeWidth={2.2} />
        {authenticated && unreadCount > 0 && (
          <span className="notification-bell-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && authenticated && (
        <section aria-label={t('নোটিফিকেশন')} className="notification-bell-panel">
          <header className="notification-bell-heading">
            <div>
              <strong>{t('নোটিফিকেশন')}</strong>
              <small>{t('{count}টি অপঠিত', { count: unreadCount })}</small>
            </div>
            <button disabled={!unreadCount || saving} onClick={() => void markAllRead()} type="button">
              {saving ? t('সংরক্ষণ হচ্ছে…') : t('সব পড়া হয়েছে')}
            </button>
          </header>
          {loading ? (
            <p className="notification-bell-state" role="status">{t('নোটিফিকেশন লোড হচ্ছে…')}</p>
          ) : error ? (
            <div className="notification-bell-state is-error" role="alert">
              <p>{error}</p>
              <button onClick={() => void loadNotifications()} type="button">{t('আবার চেষ্টা করুন')}</button>
            </div>
          ) : notifications.length ? (
            <ul className="notification-bell-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    className={`notification-bell-item${notification.status !== 'read' ? ' is-unread' : ''}`}
                    disabled={saving}
                    onClick={() => void openNotification(notification)}
                    type="button"
                  >
                    <span className={`notification-priority-dot is-${notification.priority}`} />
                    <span className="notification-bell-copy">
                      <strong>{notification.payload?.patientName || t('জরুরি রক্তের আবেদন')}</strong>
                      <small>{notification.payload?.bloodGroup || '—'} · {notification.payload?.hospitalName || '—'}</small>
                    </span>
                    <span className={`notification-priority is-${notification.priority}`}>
                      {t(({ critical: 'জরুরি', high: 'উচ্চ', medium: 'মাঝারি', normal: 'স্বাভাবিক' })[notification.priority] || 'স্বাভাবিক')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notification-bell-state">{t('এখনো কোনো নোটিফিকেশন নেই।')}</p>
          )}
          <Link className="notification-bell-footer" onClick={() => setOpen(false)} to="/notifications">
            {t('সব নোটিফিকেশন দেখুন')}
          </Link>
        </section>
      )}
    </div>
  )
}

export default NotificationBell

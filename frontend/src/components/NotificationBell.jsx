import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { notificationApi } from '../services/api/notificationApi'

function NotificationBell() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadNotifications = useCallback(async () => {
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
    void Promise.resolve().then(loadNotifications)
  }, [loadNotifications])

  useEffect(() => {
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    function refresh() {
      void loadNotifications()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('ahoban-notifications-updated', refresh)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('ahoban-notifications-updated', refresh)
    }
  }, [loadNotifications])

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
    <div className="notification-bell" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={t('নোটিফিকেশন')}
        className="notification-bell-trigger"
        onClick={() => {
          setOpen((current) => !current)
          if (!open) void loadNotifications()
        }}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="notification-bell-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
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

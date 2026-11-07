import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { notificationApi } from '../services/api/notificationApi'

const PAGE_LIMIT = 10

function formatDate(value, language) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function NotificationsPage() {
  const { language, t } = useLanguage()
  const location = useLocation()
  const selectedNotificationId = location.state?.selectedId || ''
  const [notifications, setNotifications] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(selectedNotificationId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async (requestedPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const result = await notificationApi.list({ page: requestedPage, limit: PAGE_LIMIT })
      setNotifications(result.notifications || [])
      setPagination(result.pagination || { page: requestedPage, pages: 1, total: 0 })
      setUnreadCount(result.unreadCount ?? 0)
      setPage(requestedPage)
      if (selectedNotificationId) setSelectedId(selectedNotificationId)
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }, [selectedNotificationId, t])

  useEffect(() => {
    void Promise.resolve().then(() => loadNotifications(1))
  }, [loadNotifications])

  const selectedNotification = notifications.find((item) => item.id === selectedId) || null

  function selectNotification(notification) {
    setSelectedId(notification.id)
  }

  async function markSelectedRead() {
    if (!selectedNotification || selectedNotification.status === 'read' || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await notificationApi.markRead(selectedNotification.id)
      setNotifications((current) => current.map((item) => (
        item.id === selectedNotification.id ? response.notification : item
      )))
      setUnreadCount((count) => Math.max(0, count - 1))
      window.dispatchEvent(new Event('ahoban-notifications-updated'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setSaving(false)
    }
  }

  async function markAllRead() {
    if (!unreadCount || saving) return
    setSaving(true)
    setError('')
    try {
      await notificationApi.markAllRead()
      setNotifications((current) => current.map((item) => ({
        ...item,
        status: 'read',
        readAt: item.readAt || new Date().toISOString(),
      })))
      setUnreadCount(0)
      window.dispatchEvent(new Event('ahoban-notifications-updated'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setSaving(false)
    }
  }

  const payload = selectedNotification?.payload || {}

  return (
    <main className="notification-page">
      <header className="notification-page-heading">
        <div>
          <span className="notification-eyebrow">{t('দাতা আপডেট')}</span>
          <h1>{t('আপনার নোটিফিকেশন')}</h1>
          <p>{t('রক্তের আবেদন ও আপনার জন্য প্রাসঙ্গিক আপডেটগুলো এখানে দেখুন।')}</p>
        </div>
        <button className="notification-action-button" disabled={!unreadCount || saving} onClick={() => void markAllRead()} type="button">
          {saving ? t('সংরক্ষণ হচ্ছে…') : t('সব পড়া হয়েছে')} · {unreadCount}
        </button>
      </header>

      {error && (
        <div className="notification-error" role="alert">
          <span>{error}</span>
          <button onClick={() => void loadNotifications(page)} type="button">{t('আবার চেষ্টা করুন')}</button>
        </div>
      )}

      <div className="notification-layout">
        <section aria-label={t('নোটিফিকেশন তালিকা')} className="notification-list-panel">
          <div className="notification-list-heading">
            <strong>{t('সাম্প্রতিক আপডেট')}</strong>
            <span>{pagination.total} {t('টি')}</span>
          </div>
          {loading ? (
            <p className="notification-empty" role="status">{t('নোটিফিকেশন লোড হচ্ছে…')}</p>
          ) : notifications.length ? (
            <>
              <ul className="notification-list">
                {notifications.map((notification) => {
                  const data = notification.payload || {}
                  return (
                    <li key={notification.id}>
                      <button
                        aria-current={selectedId === notification.id ? 'true' : undefined}
                        className={`notification-card${notification.status !== 'read' ? ' is-unread' : ''}${selectedId === notification.id ? ' is-selected' : ''}`}
                        onClick={() => selectNotification(notification)}
                        type="button"
                      >
                        <span className={`notification-priority-dot is-${notification.priority}`} />
                        <span className="notification-card-content">
                          <span className="notification-card-top">
                            <strong>{data.patientName || t('জরুরি রক্তের আবেদন')}</strong>
                            <span className={`notification-priority is-${notification.priority}`}>
                              {t(({ critical: 'জরুরি', high: 'উচ্চ', medium: 'মাঝারি', normal: 'স্বাভাবিক' })[notification.priority] || 'স্বাভাবিক')}
                            </span>
                          </span>
                          <span className="notification-card-meta">
                            <b>{data.bloodGroup || '—'}</b>
                            <span>{data.hospitalName || '—'}</span>
                          </span>
                          <small>{formatDate(notification.createdAt, language)}</small>
                        </span>
                        {notification.status !== 'read' && <span className="notification-unread-label">{t('নতুন')}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {pagination.pages > 1 && (
                <nav aria-label={t('নোটিফিকেশন পৃষ্ঠা')} className="notification-pagination">
                  <button disabled={page <= 1 || loading} onClick={() => void loadNotifications(page - 1)} type="button">{t('আগের পৃষ্ঠা')}</button>
                  <span>{page} / {pagination.pages}</span>
                  <button disabled={page >= pagination.pages || loading} onClick={() => void loadNotifications(page + 1)} type="button">{t('পরের পৃষ্ঠা')}</button>
                </nav>
              )}
            </>
          ) : (
            <div className="notification-empty">
              <span aria-hidden="true">♡</span>
              <strong>{t('এখনো কোনো নোটিফিকেশন নেই।')}</strong>
              <p>{t('আপনার রক্তের গ্রুপ ও অবস্থানের সঙ্গে মিলে গেলে নতুন আবেদন এখানে দেখাবে।')}</p>
            </div>
          )}
        </section>

        <aside aria-label={t('নোটিফিকেশন বিস্তারিত')} className="notification-detail-panel">
          {selectedNotification ? (
            <>
              <div className="notification-detail-top">
                <span className={`notification-priority is-${selectedNotification.priority}`}>
                  {t(({ critical: 'জরুরি', high: 'উচ্চ', medium: 'মাঝারি', normal: 'স্বাভাবিক' })[selectedNotification.priority] || 'স্বাভাবিক')}
                </span>
                <span>{formatDate(selectedNotification.createdAt, language)}</span>
              </div>
              <h2>{payload.patientName || t('জরুরি রক্তের আবেদন')}</h2>
              <dl className="notification-detail-grid">
                <div><dt>{t('রক্তের গ্রুপ')}</dt><dd>{payload.bloodGroup || '—'}</dd></div>
                <div><dt>{t('হাসপাতাল')}</dt><dd>{payload.hospitalName || '—'}</dd></div>
                <div><dt>{t('হাসপাতালের ঠিকানা')}</dt><dd>{payload.hospitalLocation || '—'}</dd></div>
                <div><dt>{t('জরুরিতার মাত্রা')}</dt><dd>{t(({ critical: 'জরুরি', high: 'উচ্চ', medium: 'মাঝারি', normal: 'স্বাভাবিক' })[selectedNotification.priority] || 'স্বাভাবিক')}</dd></div>
                <div><dt>{t('প্রয়োজনের সময়')}</dt><dd>{formatDate(payload.requiredAt, language)}</dd></div>
                <div><dt>{t('যোগাযোগ')}</dt><dd>{payload.requesterMobile || '—'}</dd></div>
                <div><dt>{t('আবেদনের তারিখ')}</dt><dd>{formatDate(payload.requestDate || selectedNotification.createdAt, language)}</dd></div>
              </dl>
              {selectedNotification.status !== 'read' && (
                <button className="notification-action-button" disabled={saving} onClick={() => void markSelectedRead()} type="button">
                  {saving ? t('সংরক্ষণ হচ্ছে…') : t('পড়া হয়েছে হিসেবে চিহ্নিত করুন')}
                </button>
              )}
              <Link className="notification-action-link" to="/blood-requests">{t('রক্তের আবেদন দেখুন')}</Link>
            </>
          ) : (
            <div className="notification-empty notification-detail-empty">
              <span aria-hidden="true">◉</span>
              <strong>{t('একটি নোটিফিকেশন নির্বাচন করুন')}</strong>
              <p>{t('রোগী, হাসপাতাল ও যোগাযোগের তথ্য এখানে দেখা যাবে।')}</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

export default NotificationsPage

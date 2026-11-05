import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { adminApi } from '../services/api/adminApi'
import { donorApi } from '../services/api/donorApi'
import { experienceApi } from '../services/api/experienceApi'
import { useLanguage } from '../contexts/useLanguage'
import BlogManagement from '../components/admin/BlogManagement'

const EMPTY_DASHBOARD = {
  overview: null,
  admins: [],
  pendingExperiences: [],
  pendingPagination: null,
  bloodRequestCounts: { pending: 0, approved: 0, rejected: 0 },
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function AdminDashboardPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const isSuperAdmin = user?.role === 'super_admin'
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [pendingPage, setPendingPage] = useState(1)
  const [viewedExperienceId, setViewedExperienceId] = useState('')
  const [bloodRequestPage, setBloodRequestPage] = useState(1)
  const [bloodRequestStatus, setBloodRequestStatus] = useState('pending')
  const [bloodRequestRows, setBloodRequestRows] = useState([])
  const [bloodRequestPagination, setBloodRequestPagination] = useState(null)
  const [bloodRequestLoading, setBloodRequestLoading] = useState(false)
  const [bloodRequestError, setBloodRequestError] = useState('')
  const [viewedBloodRequestId, setViewedBloodRequestId] = useState('')
  const [selectedStat, setSelectedStat] = useState('')
  const [viewedRecordId, setViewedRecordId] = useState('')
  const [detailsPage, setDetailsPage] = useState(1)
  const [details, setDetails] = useState({ requestKey: '', rows: [], pagination: null, error: '' })
  const [detailsRefresh, setDetailsRefresh] = useState(0)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', role: 'admin' })
  const [newAdmin, setNewAdmin] = useState({ fullName: '', email: '', phone: '', password: '' })
  const detailRequestPage = ['users', 'donors', 'stories'].includes(selectedStat) ? detailsPage : 1

  useEffect(() => {
    let active = true
    Promise.all([
      adminApi.overview(),
      adminApi.pendingExperiences({ page: pendingPage, limit: 20 }),
      adminApi.bloodRequests({ page: 1, limit: 20, status: 'pending' }),
      isSuperAdmin ? adminApi.list() : Promise.resolve({ admins: [] }),
    ]).then(
      ([overviewResponse, pendingResponse, bloodRequestsResponse, adminsResponse]) => {
        if (!active) return
        if (pendingPage > Math.max(1, pendingResponse.pagination.pages)) {
          setPendingPage(Math.max(1, pendingResponse.pagination.pages))
          return
        }
        setDashboard({
          overview: overviewResponse.overview,
          admins: adminsResponse.admins,
          pendingExperiences: pendingResponse.experiences,
          pendingPagination: pendingResponse.pagination,
          bloodRequestCounts: bloodRequestsResponse.counts,
        })
      },
      (requestError) => {
        if (active) setError(requestError.message || 'The dashboard could not be loaded.')
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [isSuperAdmin, pendingPage, refreshVersion])

  useEffect(() => {
    if (selectedStat !== 'bloodRequests') return undefined
    let active = true
    adminApi.bloodRequests({ page: bloodRequestPage, limit: 20, status: bloodRequestStatus }).then(
      (response) => {
        if (!active) return
        if (bloodRequestPage > Math.max(1, response.pagination.pages)) {
          setBloodRequestPage(Math.max(1, response.pagination.pages))
          return
        }
        setBloodRequestRows(response.requests)
        setBloodRequestPagination(response.pagination)
        setDashboard((current) => ({ ...current, bloodRequestCounts: response.counts }))
      },
      (requestError) => {
        if (active) setBloodRequestError(requestError.message || t('রক্তের আবেদন লোড করা যায়নি।'))
      },
    ).finally(() => {
      if (active) setBloodRequestLoading(false)
    })
    return () => { active = false }
  }, [bloodRequestPage, bloodRequestStatus, refreshVersion, selectedStat, t])

  useEffect(() => {
    if (!selectedStat || ['approval', 'bloodRequests'].includes(selectedStat)) return undefined
    let active = true
    const requestKey = `${selectedStat}:${detailRequestPage}:${detailsRefresh}:${refreshVersion}`

    async function loadDetails() {
      try {
        let rows
        let pagination
        if (selectedStat === 'accounts') {
          const [firstPage, adminsResponse] = await Promise.all([
            adminApi.users({ page: 1, limit: 50 }),
            adminApi.list(),
          ])
          if (!active) return
          const users = [...firstPage.users]
          for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
            if (!active) return
            const response = await adminApi.users({ page, limit: 50 })
            users.push(...response.users)
          }
          rows = [...users, ...adminsResponse.admins]
          if (isSuperAdmin && !rows.some((account) => account.id === user?.id)) {
            rows.push({
              ...user,
              role: 'super_admin',
              isActive: user.isActive !== false,
            })
          }
          rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        } else if (selectedStat === 'users') {
          const response = await adminApi.users({ page: detailRequestPage, limit: 20 })
          rows = response.users
          pagination = response.pagination
        } else if (selectedStat === 'donors') {
          const response = await donorApi.list({ page: detailRequestPage, limit: 20, sort: 'recent' })
          rows = response.donors
          pagination = response.pagination
        } else if (selectedStat === 'stories') {
          const response = await experienceApi.list({ page: detailRequestPage, limit: 20 })
          rows = response.experiences
          pagination = response.pagination
        } else {
          const response = await adminApi.list()
          rows = selectedStat === 'activeAdmins'
            ? response.admins.filter((admin) => admin.isActive)
            : response.admins
        }
        if (active) {
          setDetails({ requestKey, rows, pagination, error: '' })
        }
      } catch (requestError) {
        if (active) {
          setDetails({
            requestKey,
            rows: [],
            pagination: null,
            error: requestError.message || 'The selected dashboard details could not be loaded.',
          })
        }
      }
    }

    loadDetails()
    return () => { active = false }
  }, [detailRequestPage, detailsRefresh, isSuperAdmin, refreshVersion, selectedStat, user])

  function refreshDashboard() {
    setError('')
    setLoading(true)
    if (selectedStat === 'bloodRequests') {
      setBloodRequestLoading(true)
      setBloodRequestError('')
    }
    setRefreshVersion((current) => current + 1)
  }

  async function createAdmin(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.create(newAdmin)
      setNewAdmin({ fullName: '', email: '', phone: '', password: '' })
      setNotice('Admin account created.')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin account could not be created.')
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(admin) {
    setEditingId(admin.id)
    setEditForm({ fullName: admin.fullName, phone: admin.phone, role: admin.role })
    setError('')
    setNotice('')
  }

  async function updateAdmin(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.update(editingId, editForm)
      setEditingId('')
      setNotice('Admin account updated.')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin account could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAdmin(admin) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.update(admin.id, { isActive: !admin.isActive })
      setNotice(`Admin account ${admin.isActive ? 'deactivated' : 'activated'}.`)
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin status could not be changed.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAdmin(admin) {
    if (!window.confirm(`Permanently delete the admin account for ${admin.fullName}?`)) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.delete(admin.id)
      setNotice('Admin account deleted.')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin account could not be deleted.')
    } finally {
      setSaving(false)
    }
  }

  async function moderateExperience(experience, action) {
    if (action === 'reject' && !window.confirm(t('আপনি কি এই অনুভূতিটি প্রত্যাখ্যান করতে নিশ্চিত?'))) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (action === 'approve') {
        await adminApi.approveExperience(experience.id)
        setNotice(t('অনুভূতিটি অনুমোদন করা হয়েছে।'))
      } else {
        await adminApi.rejectExperience(experience.id)
        setNotice(t('অনুভূতিটি প্রত্যাখ্যান করা হয়েছে।'))
      }
      setDashboard((current) => {
        const total = Math.max(0, (current.pendingPagination?.total ?? current.pendingExperiences.length) - 1)
        const limit = current.pendingPagination?.limit ?? 20
        return {
          ...current,
          pendingExperiences: current.pendingExperiences.filter(({ id }) => id !== experience.id),
          pendingPagination: current.pendingPagination
            ? { ...current.pendingPagination, total, pages: Math.ceil(total / limit) }
            : current.pendingPagination,
        }
      })
      setViewedExperienceId('')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || t('অনুভূতিটি হালনাগাদ করা যায়নি।'))
    } finally {
      setSaving(false)
    }
  }

  async function moderateBloodRequest(request, approvalStatus) {
    if (
      approvalStatus === 'rejected'
      && !window.confirm(t('আপনি কি এই রক্তের আবেদনটি প্রত্যাখ্যান করতে নিশ্চিত?'))
    ) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.moderateBloodRequest(request.id, approvalStatus)
      setViewedBloodRequestId('')
      setNotice(approvalStatus === 'approved'
        ? t('রক্তের আবেদনটি অনুমোদন করা হয়েছে।')
        : t('রক্তের আবেদনটি প্রত্যাখ্যান করা হয়েছে।'))
      setBloodRequestLoading(true)
      setRefreshVersion((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message || t('রক্তের আবেদনের অবস্থা হালনাগাদ করা যায়নি।'))
    } finally {
      setSaving(false)
    }
  }

  async function fulfillBloodRequest(request) {
    if (!window.confirm(t('আপনি কি নিশ্চিত যে প্রয়োজনীয় রক্ত পাওয়া গেছে?'))) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.fulfillBloodRequest(request.id)
      setViewedBloodRequestId('')
      setNotice(t('রক্তের আবেদনটি পূরণ হয়েছে হিসেবে চিহ্নিত করা হয়েছে।'))
      setBloodRequestLoading(true)
      setRefreshVersion((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message || t('রক্তের আবেদনের অবস্থা হালনাগাদ করা যায়নি।'))
    } finally {
      setSaving(false)
    }
  }

  const overview = dashboard.overview
  const statistics = [
    { key: 'accounts', label: 'Registered accounts', count: overview?.totalAccounts },
    { key: 'users', label: 'Users', count: overview?.totalUsers },
    { key: 'donors', label: 'Public donors', count: overview?.totalDonors },
    { key: 'stories', label: 'Public stories', count: overview?.totalExperiences },
    { key: 'admins', label: 'Admins', count: overview?.totalAdmins },
    { key: 'activeAdmins', label: 'Active admins', count: overview?.activeAdmins },
    { key: 'approval', label: t('রক্তদাতার অনুভূতি অনুমোদন'), count: dashboard.pendingPagination?.total ?? dashboard.pendingExperiences.length },
    { key: 'bloodRequests', label: t('রক্তের আবেদন ব্যবস্থাপনা'), count: dashboard.bloodRequestCounts.pending },
  ]
  const detailRequestKey = `${selectedStat}:${detailRequestPage}:${detailsRefresh}:${refreshVersion}`
  const currentDetails = details.requestKey === detailRequestKey
  const detailRows = currentDetails ? details.rows : []
  const detailPagination = currentDetails ? details.pagination : null
  const detailTitles = {
    accounts: 'Registered accounts',
    users: 'Users',
    donors: 'Public donors',
    stories: 'Public stories',
    admins: 'Admins',
    activeAdmins: 'Active admins',
    approval: t('রক্তদাতার অনুভূতি অনুমোদন'),
    bloodRequests: t('রক্তের আবেদন ব্যবস্থাপনা'),
  }
  const detailCount = statistics.find(({ key }) => key === selectedStat)?.count ?? 0
  const isClientPaginated = selectedStat === 'accounts' || selectedStat === 'admins' || selectedStat === 'activeAdmins'
  const pageSize = 20
  const displayedRows = isClientPaginated
    ? detailRows.slice((detailsPage - 1) * pageSize, detailsPage * pageSize)
    : detailRows
  const detailPages = selectedStat === 'approval'
    ? dashboard.pendingPagination?.pages ?? 0
    : detailPagination?.pages ?? Math.ceil(detailRows.length / pageSize)
  const detailPageCount = selectedStat === 'approval'
    ? dashboard.pendingPagination?.total ?? dashboard.pendingExperiences.length
    : detailPagination?.total ?? detailRows.length
  const viewedRecord = detailRows.find(({ id }) => id === viewedRecordId) || null
  const detailListIsRoleRestricted = ['accounts', 'admins', 'activeAdmins'].includes(selectedStat)
    && !isSuperAdmin
    && currentDetails
    && detailRows.length < detailCount
  const viewedExperience = dashboard.pendingExperiences.find(({ id }) => id === viewedExperienceId) || null
  const viewedBloodRequest = bloodRequestRows.find(({ id }) => id === viewedBloodRequestId) || null
  const viewedRecordStatus = viewedRecord?.isActive === false
    ? 'Inactive'
    : viewedRecord?.isActive === true
      ? 'Active'
      : selectedStat === 'donors'
        ? 'Public donor'
        : selectedStat === 'stories'
          ? 'Public story'
          : '—'

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-heading">
        <div>
          <span className="admin-eyebrow">{isSuperAdmin ? 'Super Admin' : 'Admin'} workspace</span>
          <h1>Admin Dashboard</h1>
          <p>Signed in as {user?.fullName || user?.email}.</p>
        </div>
        <button className="admin-secondary-button" disabled={loading} onClick={refreshDashboard} type="button">
          Refresh data
        </button>
      </header>

      {error && <p className="admin-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="admin-feedback is-success" role="status">{notice}</p>}
      {loading && <p className="admin-feedback" role="status">Loading dashboard data…</p>}

      {overview && (
        <section aria-label="Overview statistics" className="admin-stat-grid">
          {statistics.map(({ key, label, count }) => (
            <button
              aria-pressed={selectedStat === key}
              className={`admin-stat-card${selectedStat === key ? ' is-selected' : ''}`}
              key={key}
              onClick={() => {
                setSelectedStat(key)
                setViewedRecordId('')
                setViewedExperienceId('')
                setViewedBloodRequestId('')
                setDetailsPage(1)
                if (key === 'approval') setPendingPage(1)
                if (key === 'bloodRequests') {
                  setBloodRequestStatus('pending')
                  setBloodRequestPage(1)
                  setBloodRequestLoading(true)
                  setBloodRequestError('')
                }
                setDetailsRefresh((value) => value + 1)
              }}
              type="button"
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </section>
      )}

      {selectedStat && (
        <section aria-labelledby="admin-stat-details-title" className="admin-panel admin-stat-details">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">
                {selectedStat === 'bloodRequests'
                  ? `${dashboard.bloodRequestCounts[bloodRequestStatus] ?? 0} ${t('আবেদন')}`
                  : `${detailCount} records`}
              </span>
              <h2 id="admin-stat-details-title">{detailTitles[selectedStat]}</h2>
            </div>
            <div className="admin-stat-details-actions">
              {selectedStat === 'donors' && <Link to="/donors">Open donor directory</Link>}
              {selectedStat === 'stories' && <Link to="/donor-experiences">Open stories</Link>}
              <button
                aria-label="Close details"
                className="admin-stat-details-close"
                onClick={() => {
                  setSelectedStat('')
                  setViewedRecordId('')
                  setViewedExperienceId('')
                  setViewedBloodRequestId('')
                  setDetailsPage(1)
                }}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
          {selectedStat === 'approval' && loading && !dashboard.pendingPagination && (
            <p className="admin-feedback" role="status">{t('লোড হচ্ছে…')}</p>
          )}
          {selectedStat === 'bloodRequests' && (
            <div aria-label={t('রক্তের আবেদনের অবস্থা')} className="admin-blood-request-tabs" role="tablist">
              {[
                ['pending', t('রক্তের আবেদন অপেক্ষায়'), dashboard.bloodRequestCounts.pending],
                ['approved', t('অনুমোদিত'), dashboard.bloodRequestCounts.approved],
                ['rejected', t('প্রত্যাখ্যাত'), dashboard.bloodRequestCounts.rejected],
              ].map(([statusKey, label, count]) => (
                <button
                  aria-selected={bloodRequestStatus === statusKey}
                  className={bloodRequestStatus === statusKey ? 'is-selected' : ''}
                  key={statusKey}
                  onClick={() => {
                    setBloodRequestStatus(statusKey)
                    setBloodRequestPage(1)
                    setBloodRequestLoading(true)
                    setBloodRequestError('')
                    setViewedBloodRequestId('')
                  }}
                  role="tab"
                  type="button"
                >
                  {label}<strong>{count}</strong>
                </button>
              ))}
            </div>
          )}
          {selectedStat === 'bloodRequests' && bloodRequestError && (
            <div className="admin-stat-details-error">
              <p className="admin-feedback is-error" role="alert">{bloodRequestError}</p>
              <button className="admin-secondary-button" onClick={() => {
                setBloodRequestLoading(true)
                setBloodRequestError('')
                setRefreshVersion((current) => current + 1)
              }} type="button">
                {t('আবার চেষ্টা করুন')}
              </button>
            </div>
          )}
          {selectedStat === 'bloodRequests' && bloodRequestLoading && (
            <p className="admin-feedback" role="status">{t('রক্তের আবেদন লোড হচ্ছে…')}</p>
          )}
          {!['approval', 'bloodRequests'].includes(selectedStat) && details.requestKey === detailRequestKey && details.error && (
            <div className="admin-stat-details-error">
              <p className="admin-feedback is-error" role="alert">{details.error}</p>
              <button className="admin-secondary-button" onClick={() => setDetailsRefresh((value) => value + 1)} type="button">
                Try again
              </button>
            </div>
          )}
          {!['approval', 'bloodRequests'].includes(selectedStat) && details.requestKey !== detailRequestKey && (
            <p className="admin-feedback" role="status">Loading details…</p>
          )}
          {!['approval', 'bloodRequests'].includes(selectedStat) && detailListIsRoleRestricted && (
            <p className="admin-feedback">Some account details are limited by your role permissions.</p>
          )}
          {selectedStat === 'approval' && viewedExperience ? (
            <article className="admin-approval-detail">
              <header className="admin-approval-detail-header">
                {viewedExperience.profilePhotoUrl
                  ? <img alt="" className="admin-approval-avatar" src={viewedExperience.profilePhotoUrl} />
                  : <span aria-hidden="true" className="admin-approval-avatar admin-approval-avatar-fallback">{viewedExperience.donorName?.trim().charAt(0) || '?'}</span>}
                <div>
                  <strong>{viewedExperience.donorName}</strong>
                  <small>{viewedExperience.publicUserId} · {viewedExperience.bloodGroup}</small>
                </div>
                <button aria-label={t('পোস্টের বিস্তারিত বন্ধ করুন')} className="admin-stat-details-close" onClick={() => setViewedExperienceId('')} type="button">×</button>
              </header>
              <p className="admin-approval-full-message">{viewedExperience.message}</p>
              <div className="admin-approval-photos">
                {(viewedExperience.images?.length ? viewedExperience.images : [viewedExperience.photoUrl].filter(Boolean)).map((image, index) => (
                  <img alt={t('দাতার ছবি {number}', { number: index + 1 })} key={`${image}-${index}`} loading="lazy" src={image} />
                ))}
              </div>
              <dl className="admin-approval-detail-meta">
                <div><dt>{t('রক্তদানের তারিখ')}</dt><dd>{formatDate(viewedExperience.donationDate)}</dd></div>
                <div><dt>{t('মোট রক্তদানের সংখ্যা')}</dt><dd>{viewedExperience.donationCount ?? '—'}</dd></div>
                <div><dt>{t('জমা দেওয়ার তারিখ')}</dt><dd>{formatDateTime(viewedExperience.createdAt)}</dd></div>
                <div><dt>{t('অবস্থান')}</dt><dd>{[viewedExperience.location, viewedExperience.upazila, viewedExperience.district, viewedExperience.division].filter(Boolean).join(', ') || '—'}</dd></div>
              </dl>
              <div className="admin-approval-actions">
                <button className="admin-primary-button" disabled={saving} onClick={() => moderateExperience(viewedExperience, 'approve')} type="button">
                  {t('অনুমোদন করুন')}
                </button>
                <button className="admin-danger-button" disabled={saving} onClick={() => moderateExperience(viewedExperience, 'reject')} type="button">
                  {t('প্রত্যাখ্যান করুন')}
                </button>
                <button className="admin-secondary-button" onClick={() => setViewedExperienceId('')} type="button">
                  {t('ফিরে যান')}
                </button>
              </div>
            </article>
          ) : selectedStat === 'bloodRequests' && viewedBloodRequest ? (
            <article className="admin-blood-request-detail">
              <header>
                <div>
                  <strong>{viewedBloodRequest.patientName}</strong>
                  <span>
                    {viewedBloodRequest.bloodGroup} · {t({
                      pending: 'রক্তের আবেদন অপেক্ষায়',
                      approved: 'অনুমোদিত',
                      rejected: 'প্রত্যাখ্যাত',
                    }[viewedBloodRequest.status] || viewedBloodRequest.status)}
                  </span>
                </div>
                <button aria-label={t('বিস্তারিত বন্ধ করুন')} className="admin-stat-details-close" onClick={() => setViewedBloodRequestId('')} type="button">×</button>
              </header>
              <p>{viewedBloodRequest.patientIssue}</p>
              <dl className="admin-blood-request-detail-grid">
                <div><dt>{t('আবেদনকারী')}</dt><dd>{viewedBloodRequest.requesterName}</dd></div>
                <div><dt>{t('মোবাইল')}</dt><dd><a href={`tel:${viewedBloodRequest.phone}`}>{viewedBloodRequest.phone}</a></dd></div>
                <div><dt>{t('হাসপাতালের নাম')}</dt><dd>{viewedBloodRequest.hospitalName}</dd></div>
                <div><dt>{t('হাসপাতালের ঠিকানা')}</dt><dd>{viewedBloodRequest.hospitalLocation}</dd></div>
                <div><dt>{t('প্রয়োজনীয় রক্ত')}</dt><dd>{viewedBloodRequest.units} {t('ব্যাগ')}</dd></div>
                <div><dt>{t('রক্ত প্রয়োজনের তারিখ ও সময়')}</dt><dd>{formatDateTime(viewedBloodRequest.requiredAt)}</dd></div>
                <div><dt>{t('আবেদনের তারিখ')}</dt><dd>{formatDateTime(viewedBloodRequest.createdAt)}</dd></div>
                <div><dt>{t('আবেদনের অবস্থা')}</dt><dd>{t({
                  active: 'সক্রিয়',
                  fulfilled: 'রক্ত পাওয়া গেছে',
                  expired: 'মেয়াদোত্তীর্ণ',
                  cancelled: 'বাতিল',
                }[viewedBloodRequest.fulfillmentStatus] || viewedBloodRequest.fulfillmentStatus)}</dd></div>
              </dl>
              <div className="admin-blood-request-actions">
                {viewedBloodRequest.status === 'pending' && (
                  <>
                    <button className="admin-primary-button" disabled={saving} onClick={() => moderateBloodRequest(viewedBloodRequest, 'approved')} type="button">{t('অনুমোদন করুন')}</button>
                    <button className="admin-danger-button" disabled={saving} onClick={() => moderateBloodRequest(viewedBloodRequest, 'rejected')} type="button">{t('প্রত্যাখ্যান করুন')}</button>
                  </>
                )}
                {viewedBloodRequest.status === 'approved' && viewedBloodRequest.fulfillmentStatus !== 'fulfilled' && (
                  <button className="admin-primary-button" disabled={saving} onClick={() => fulfillBloodRequest(viewedBloodRequest)} type="button">{t('রক্ত পাওয়া গেছে হিসেবে চিহ্নিত করুন')}</button>
                )}
                <button className="admin-secondary-button" onClick={() => setViewedBloodRequestId('')} type="button">{t('তালিকায় ফিরুন')}</button>
              </div>
            </article>
          ) : selectedStat === 'bloodRequests' && !bloodRequestLoading && !bloodRequestError && bloodRequestRows.length > 0 ? (
            <>
              <ul className="admin-blood-request-list">
                {bloodRequestRows.map((request) => (
                  <li className="admin-blood-request-row" key={request.id}>
                    <strong className="admin-blood-request-patient" title={request.patientName}>{request.patientName}</strong>
                    <span className="admin-blood-request-group">{request.bloodGroup}</span>
                    <span className="admin-blood-request-condition" title={request.patientIssue}>{request.patientIssue}</span>
                    <span className="admin-blood-request-hospital" title={`${request.hospitalName} · ${request.hospitalLocation}`}>{request.hospitalName} · {request.hospitalLocation}</span>
                    <span className="admin-blood-request-contact" title={`${request.requesterName} · ${request.phone}`}>{request.requesterName} · {request.phone}</span>
                    <span className="admin-blood-request-units">{request.units} {t('ব্যাগ')}</span>
                    <span className="admin-blood-request-date">{formatDateTime(request.requiredAt)}</span>
                    <div className="admin-blood-request-row-actions">
                      <button className="admin-approval-view" onClick={() => setViewedBloodRequestId(request.id)} type="button">{t('বিস্তারিত')}</button>
                      {bloodRequestStatus === 'pending' && (
                        <>
                          <button className="admin-primary-button" disabled={saving} onClick={() => moderateBloodRequest(request, 'approved')} type="button">{t('অনুমোদন')}</button>
                          <button className="admin-danger-button" disabled={saving} onClick={() => moderateBloodRequest(request, 'rejected')} type="button">{t('প্রত্যাখ্যান')}</button>
                        </>
                      )}
                      {bloodRequestStatus === 'approved' && request.fulfillmentStatus !== 'fulfilled' && (
                        <button className="admin-primary-button" disabled={saving} onClick={() => fulfillBloodRequest(request)} type="button">{t('পূরণ হয়েছে')}</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {bloodRequestPagination?.pages > 1 && (
                <div className="admin-pagination">
                  <button className="admin-secondary-button" disabled={bloodRequestPage <= 1 || bloodRequestLoading} onClick={() => {
                    setBloodRequestLoading(true)
                    setBloodRequestPage((page) => page - 1)
                  }} type="button">{t('আগের পৃষ্ঠা')}</button>
                  <span>{t('পৃষ্ঠা')} {bloodRequestPage} / {bloodRequestPagination.pages} · {bloodRequestPagination.total}</span>
                  <button className="admin-secondary-button" disabled={bloodRequestPage >= bloodRequestPagination.pages || bloodRequestLoading} onClick={() => {
                    setBloodRequestLoading(true)
                    setBloodRequestPage((page) => page + 1)
                  }} type="button">{t('পরের পৃষ্ঠা')}</button>
                </div>
              )}
            </>
          ) : selectedStat === 'bloodRequests' && !bloodRequestLoading && !bloodRequestError ? (
            <p className="admin-empty">{t('এই বিভাগে কোনো রক্তের আবেদন নেই।')}</p>
          ) : selectedStat === 'approval' && dashboard.pendingExperiences.length > 0 ? (
            <>
              <ul className="admin-approval-record-list">
                {dashboard.pendingExperiences.map((experience) => (
                  <li className="admin-approval-record" key={experience.id}>
                    {experience.profilePhotoUrl
                      ? <img alt="" className="admin-approval-avatar" loading="lazy" src={experience.profilePhotoUrl} />
                      : <span aria-hidden="true" className="admin-approval-avatar admin-approval-avatar-fallback">{experience.donorName?.trim().charAt(0) || '?'}</span>}
                    <strong className="admin-approval-record-name" title={experience.donorName}>{experience.donorName}</strong>
                    <span className="admin-approval-record-id" title={experience.publicUserId}>{experience.publicUserId || '—'}</span>
                    <span className="admin-approval-record-email" title={experience.email || ''}>{experience.email || '—'}</span>
                    <div className="admin-approval-record-actions">
                      <button className="admin-approval-view" onClick={() => setViewedExperienceId(experience.id)} type="button">{t('দেখুন')}</button>
                      <button className="admin-primary-button" disabled={saving} onClick={() => moderateExperience(experience, 'approve')} type="button">{t('অনুমোদন করুন')}</button>
                      <button className="admin-danger-button" disabled={saving} onClick={() => moderateExperience(experience, 'reject')} type="button">{t('প্রত্যাখ্যান করুন')}</button>
                    </div>
                  </li>
                ))}
              </ul>
              {dashboard.pendingPagination?.pages > 1 && (
                <div className="admin-pagination">
                  <button className="admin-secondary-button" disabled={pendingPage <= 1 || loading} onClick={() => { setLoading(true); setPendingPage((page) => page - 1) }} type="button">
                    {t('আগের পৃষ্ঠা')}
                  </button>
                  <span>{t('পৃষ্ঠা')} {pendingPage} / {dashboard.pendingPagination.pages}</span>
                  <button className="admin-secondary-button" disabled={pendingPage >= dashboard.pendingPagination.pages || loading} onClick={() => { setLoading(true); setPendingPage((page) => page + 1) }} type="button">
                    {t('পরের পৃষ্ঠা')}
                  </button>
                </div>
              )}
            </>
          ) : selectedStat === 'approval' && !loading && !error ? (
            <p className="admin-empty">{t('অনুমোদনের জন্য কোনো অনুভূতি অপেক্ষায় নেই।')}</p>
          ) : !['approval', 'bloodRequests'].includes(selectedStat) && viewedRecord ? (
            <section aria-label={`${viewedRecord.fullName || viewedRecord.donorName} details`} className="admin-user-detail-card">
              <header className="admin-user-detail-header">
                {viewedRecord.profilePhotoUrl
                  ? <img alt="" className="admin-user-avatar is-large" src={viewedRecord.profilePhotoUrl} />
                  : <span aria-hidden="true" className="admin-user-avatar is-large is-fallback">{(viewedRecord.fullName || viewedRecord.donorName || '?').trim().charAt(0)}</span>}
                <div className="admin-user-detail-identity">
                  <h3>{viewedRecord.fullName || viewedRecord.donorName}</h3>
                  <span>{viewedRecord.userId || viewedRecord.publicUserId || '—'}</span>
                  <div className="admin-user-detail-badges">
                    <span>{viewedRecord.role === 'user' ? 'Registered user' : viewedRecord.role === 'super_admin' ? 'Super Admin' : viewedRecord.role === 'admin' ? 'Admin' : detailTitles[selectedStat]}</span>
                    <span className={viewedRecord.isActive === false ? 'is-inactive' : viewedRecord.isActive === true ? 'is-active' : ''}>
                      {viewedRecordStatus}
                    </span>
                  </div>
                </div>
                <button
                  aria-label="Close user details"
                  className="admin-stat-details-close"
                  onClick={() => setViewedRecordId('')}
                  type="button"
                >
                  ×
                </button>
              </header>
              <div className="admin-user-detail-grid">
                <div className="admin-user-detail-profile">
                  {viewedRecord.profilePhotoUrl
                    ? <img alt="" className="admin-user-avatar" src={viewedRecord.profilePhotoUrl} />
                    : <span aria-hidden="true" className="admin-user-avatar is-fallback">{(viewedRecord.fullName || viewedRecord.donorName || '?').trim().charAt(0)}</span>}
                  <span>Profile image</span>
                </div>
                {[
                  ['Email', viewedRecord.email],
                  ['Phone', viewedRecord.phone],
                  ['Blood group', viewedRecord.bloodGroup],
                  ['Location', [viewedRecord.location, viewedRecord.upazila, viewedRecord.district, viewedRecord.division].filter(Boolean).join(', ')],
                  ['Joined on', formatDate(viewedRecord.createdAt)],
                  ['Account status', viewedRecordStatus],
                  ['Total donations', viewedRecord.previousBloodDonations ?? viewedRecord.donationCount],
                  ['Member since', formatDate(viewedRecord.createdAt)],
                  ['Last donation', formatDate(viewedRecord.lastDonationDate || viewedRecord.donationDate)],
                ].map(([label, value]) => (
                  <div className="admin-user-detail-item" key={label}>
                    <span>{label}</span>
                    <strong>{value || '—'}</strong>
                  </div>
                ))}
              </div>
              {viewedRecord.message && <p className="admin-user-detail-story">{viewedRecord.message}</p>}
              <button className="admin-secondary-button admin-user-back-button" onClick={() => setViewedRecordId('')} type="button">
                Back to {selectedStat === 'users' ? 'Users' : detailTitles[selectedStat]}
              </button>
            </section>
          ) : !['approval', 'bloodRequests'].includes(selectedStat) && currentDetails && !details.error && detailRows.length > 0 ? (
            <>
              <ul className="admin-stat-record-list">
                {displayedRows.map((row) => {
                  const name = row.fullName || row.donorName || '—'
                  const accountId = row.userId || row.publicUserId || '—'
                  return (
                    <li className="admin-stat-record" key={row.id}>
                      {row.profilePhotoUrl
                        ? <img alt="" className="admin-user-avatar" loading="lazy" src={row.profilePhotoUrl} />
                        : <span aria-hidden="true" className="admin-user-avatar is-fallback">{name.trim().charAt(0) || '?'}</span>}
                      <strong className="admin-stat-record-name" title={name}>{name}</strong>
                      <span className="admin-stat-record-id" title={accountId}>{accountId}</span>
                      <span className="admin-stat-record-email" title={row.email || ''}>{row.email || '—'}</span>
                      <button className="admin-stat-record-view" onClick={() => setViewedRecordId(row.id)} type="button">View</button>
                    </li>
                  )
                })}
              </ul>
              {detailPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="admin-secondary-button"
                    disabled={detailsPage <= 1 || details.requestKey !== detailRequestKey}
                    onClick={() => setDetailsPage((page) => page - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <span>Page {detailsPage} of {detailPages} · {detailPageCount} records</span>
                  <button
                    className="admin-secondary-button"
                    disabled={detailsPage >= detailPages || details.requestKey !== detailRequestKey}
                    onClick={() => setDetailsPage((page) => page + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : null}
          {!['approval', 'bloodRequests'].includes(selectedStat) && currentDetails && !details.error && detailRows.length === 0 && (
            <p className="admin-empty">No records found for this category.</p>
          )}
        </section>
      )}

      <BlogManagement />

      {isSuperAdmin && (
        <section aria-labelledby="admin-management-title" className="admin-panel admin-management">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Super Admin only</span>
              <h2 id="admin-management-title">Admin management</h2>
            </div>
            <span>{dashboard.admins.length} admins</span>
          </div>

          <form className="admin-create-form" onSubmit={createAdmin}>
            <h3>Create an admin account</h3>
            <label>
              Full name
              <input autoComplete="name" maxLength="100" onChange={(event) => setNewAdmin((value) => ({ ...value, fullName: event.target.value }))} required value={newAdmin.fullName} />
            </label>
            <label>
              Email
              <input autoComplete="email" onChange={(event) => setNewAdmin((value) => ({ ...value, email: event.target.value }))} required type="email" value={newAdmin.email} />
            </label>
            <label>
              Phone
              <input autoComplete="tel" maxLength="16" onChange={(event) => setNewAdmin((value) => ({ ...value, phone: event.target.value }))} required value={newAdmin.phone} />
            </label>
            <label>
              Temporary password
              <input autoComplete="new-password" minLength="12" onChange={(event) => setNewAdmin((value) => ({ ...value, password: event.target.value }))} required type="password" value={newAdmin.password} />
            </label>
            <button className="admin-primary-button" disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Create admin'}
            </button>
          </form>

          <ul className="admin-account-list">
            {dashboard.admins.map((admin) => (
              <li key={admin.id}>
                {editingId === admin.id ? (
                  <form className="admin-account-edit" onSubmit={updateAdmin}>
                    <label>
                      Full name
                      <input maxLength="100" onChange={(event) => setEditForm((value) => ({ ...value, fullName: event.target.value }))} required value={editForm.fullName} />
                    </label>
                    <label>
                      Phone
                      <input maxLength="16" onChange={(event) => setEditForm((value) => ({ ...value, phone: event.target.value }))} required value={editForm.phone} />
                    </label>
                    <label>
                      Role
                      <select onChange={(event) => setEditForm((value) => ({ ...value, role: event.target.value }))} value={editForm.role}>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                    </label>
                    <div className="admin-row-actions">
                      <button className="admin-primary-button" disabled={saving} type="submit">Save</button>
                      <button className="admin-secondary-button" onClick={() => setEditingId('')} type="button">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span><strong>{admin.fullName}</strong><small>{admin.email} · {admin.userId}</small></span>
                    <span className={`admin-status${admin.isActive ? ' is-active' : ''}`}>{admin.isActive ? 'Active' : 'Inactive'}</span>
                    <div className="admin-row-actions">
                      <button className="admin-secondary-button" disabled={saving} onClick={() => beginEdit(admin)} type="button">Edit</button>
                      <button className="admin-secondary-button" disabled={saving} onClick={() => toggleAdmin(admin)} type="button">
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="admin-danger-button" disabled={saving} onClick={() => deleteAdmin(admin)} type="button">Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!dashboard.admins.length && !loading && <p className="admin-empty">No admin accounts yet.</p>}
        </section>
      )}
    </main>
  )
}

export default AdminDashboardPage

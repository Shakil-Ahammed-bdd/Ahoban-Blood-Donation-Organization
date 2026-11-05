import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/shared/SectionHeading'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { bloodRequestApi } from '../services/api/bloodRequestApi'

const EMPTY_FORM = {
  requesterName: '',
  patientName: '',
  patientIssue: '',
  hospitalName: '',
  hospitalLocation: '',
  phone: '',
  bloodGroup: '',
  units: '1',
  requiredAt: '',
  contactConsent: false,
  website: '',
}
const MANAGEMENT_STORAGE_KEY = 'blood-request-management-tokens'
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function readManagementTokens() {
  try {
    const saved = JSON.parse(localStorage.getItem(MANAGEMENT_STORAGE_KEY) || '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

function formatDateTime(value, language) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function BloodRequestsPage() {
  const { language, t } = useLanguage()
  const [requests, setRequests] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [bloodGroup, setBloodGroup] = useState('')
  const [hospitalLocation, setHospitalLocation] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [minimumDateTime, setMinimumDateTime] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [managementTokens, setManagementTokens] = useState(readManagementTokens)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let active = true
    bloodRequestApi.list({ page, bloodGroup, hospitalLocation, status }).then(
      (response) => {
        if (!active) return
        setRequests(response.requests)
        setPagination(response.pagination)
        setError('')
      },
      (requestError) => {
        if (!active) return
        setRequests([])
        setPagination(null)
        setError(translateErrorMessage(requestError, t))
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [bloodGroup, hospitalLocation, page, refreshVersion, status, t])

  useEffect(() => {
    if (!formOpen) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') setFormOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [formOpen])

  function openRequestForm() {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setMinimumDateTime(now.toISOString().slice(0, 16))
    setFormOpen(true)
  }

  function changeFilter(update) {
    setLoading(true)
    setError('')
    setPage(1)
    update()
  }

  function changeFormField(event) {
    const { name, type, value, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  function storeManagementToken(id, token) {
    const nextTokens = { ...managementTokens, [id]: token }
    setManagementTokens(nextTokens)
    try {
      localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(nextTokens))
      return true
    } catch {
      return false
    }
  }

  function removeManagementToken(id) {
    const nextTokens = { ...managementTokens }
    delete nextTokens[id]
    setManagementTokens(nextTokens)
    try {
      localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(nextTokens))
    } catch {
      setManagementTokens(nextTokens)
    }
  }

  async function submitRequest(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      const response = await bloodRequestApi.create(form)
      const tokenSaved = storeManagementToken(response.request.id, response.managementToken)
      setForm(EMPTY_FORM)
      setFormOpen(false)
      setLoading(true)
      setNotice(tokenSaved
        ? t('রক্তের আবেদনটি জমা হয়েছে। Admin অনুমোদনের পর এটি প্রকাশিত হবে।')
        : `${t('রক্তের আবেদনটি জমা হয়েছে। Admin অনুমোদনের পর এটি প্রকাশিত হবে।')} ${t('এই ব্রাউজারে আবেদন পরিচালনার কোড সংরক্ষণ করা যায়নি; এই পেজ খোলা থাকা পর্যন্ত আবেদনটি পরিচালনা করতে পারবেন।')}`)
      setPage(1)
      if (status !== 'active') setStatus('active')
      setBloodGroup('')
      setHospitalLocation('')
      setLocationSearch('')
      setRefreshVersion((value) => value + 1)
    } catch (requestError) {
      if (requestError.fieldErrors && Object.keys(requestError.fieldErrors).length) {
        setFieldErrors(requestError.fieldErrors)
      } else {
        setError(translateErrorMessage(requestError, t))
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function updateRequest(request, nextStatus) {
    const confirmation = nextStatus === 'fulfilled'
      ? t('আপনি কি নিশ্চিত যে প্রয়োজনীয় রক্ত পেয়েছেন?')
      : t('আপনি কি এই আবেদনটি বাতিল করতে নিশ্চিত?')
    if (!window.confirm(confirmation)) return

    setUpdatingId(request.id)
    setError('')
    setNotice('')
    try {
      await bloodRequestApi.updateStatus(request.id, nextStatus, managementTokens[request.id])
      removeManagementToken(request.id)
      setLoading(true)
      setNotice(nextStatus === 'fulfilled'
        ? t('আবেদনটি পূরণ হয়েছে হিসেবে চিহ্নিত করা হয়েছে।')
        : t('আবেদনটি বাতিল করা হয়েছে।'))
      setRefreshVersion((value) => value + 1)
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setUpdatingId('')
    }
  }

  function submitLocationFilter(event) {
    event.preventDefault()
    changeFilter(() => setHospitalLocation(locationSearch))
  }

  const statusLabels = {
    active: t('সক্রিয়'),
    fulfilled: t('রক্ত পাওয়া গেছে'),
    expired: t('মেয়াদোত্তীর্ণ'),
    cancelled: t('বাতিল'),
  }

  return (
    <main className="blood-requests-page">
      <section aria-labelledby="blood-requests-title" className="section blood-requests-section">
        <div className="section-container">
          <Link className="donor-directory-back" to="/">{t('← মূল পাতায় ফিরুন')}</Link>
          <SectionHeading
            description={t('রক্তের প্রয়োজন হলে আবেদন প্রকাশ করুন, অথবা আপনার এলাকার সক্রিয় আবেদন খুঁজুন।')}
            highlight={t('আবেদন')}
            id="blood-requests-title"
            kicker={t('আহ্বান রক্তদান সংস্থা')}
            title={t('রক্তের')}
          />

          <div className="blood-requests-toolbar">
            <p>{t('আপনার যোগাযোগ নম্বর আবেদনটির সঙ্গে প্রকাশিত হবে; শুধু রক্তের প্রয়োজনে যোগাযোগের জন্য দিন।')}</p>
            <button className="button button-primary blood-request-create-button" onClick={openRequestForm} type="button">
              <span aria-hidden="true">+</span> {t('রক্তের জন্য আবেদন করুন')}
            </button>
          </div>

          {notice && <p className="blood-request-feedback is-success" role="status">{notice}</p>}
          {error && <p className="blood-request-feedback is-error" role="alert">{error}</p>}

          <form className="blood-request-filters" onSubmit={submitLocationFilter}>
            <label>
              {t('রক্তের গ্রুপ')}
              <select onChange={(event) => changeFilter(() => setBloodGroup(event.target.value))} value={bloodGroup}>
                <option value="">{t('সব গ্রুপ')}</option>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>
            <label>
              {t('আবেদনের অবস্থা')}
              <select onChange={(event) => changeFilter(() => setStatus(event.target.value))} value={status}>
                <option value="active">{statusLabels.active}</option>
                <option value="fulfilled">{statusLabels.fulfilled}</option>
                <option value="expired">{statusLabels.expired}</option>
                <option value="cancelled">{statusLabels.cancelled}</option>
                <option value="all">{t('সব আবেদন')}</option>
              </select>
            </label>
            <label className="blood-request-location-filter">
              {t('হাসপাতালের অবস্থান')}
              <input maxLength="100" onChange={(event) => setLocationSearch(event.target.value)} placeholder={t('যেমন: ধানমন্ডি, ঢাকা')} value={locationSearch} />
            </label>
            <button className="button button-secondary blood-request-filter-button" type="submit">{t('ফিল্টার করুন')}</button>
          </form>

          {loading && <p className="blood-request-feedback" role="status">{t('আবেদনগুলো লোড হচ্ছে…')}</p>}
          {!loading && !error && requests.length === 0 && (
            <p className="blood-request-empty" role="status">{t('এই ফিল্টারে কোনো রক্তের আবেদন পাওয়া যায়নি।')}</p>
          )}
          {!loading && requests.length > 0 && (
            <>
              <div aria-live="polite" className="blood-request-grid">
                {requests.map((request) => {
                  const currentStatus = request.fulfillmentStatus
                  const expanded = expandedId === request.id
                  const token = managementTokens[request.id]
                  const phoneDigits = request.phone.replace(/\D/g, '')
                  return (
                    <article className={`blood-request-card${currentStatus !== 'active' ? ' is-closed' : ''}`} key={request.id}>
                      <header className="blood-request-card-header">
                        <div>
                          <span className="blood-request-patient-label">{t('রোগীর নাম')}</span>
                          <h2>{request.patientName}</h2>
                        </div>
                        <span className={`blood-request-group blood-group-${request.bloodGroup.replace('+', 'plus').replace('-', 'minus')}`}>{request.bloodGroup}</span>
                      </header>
                      <div className="blood-request-card-body">
                        <p className="blood-request-issue">{request.patientIssue}</p>
                        <dl className="blood-request-meta">
                          <div><dt>{t('হাসপাতাল')}</dt><dd>{request.hospitalName}</dd></div>
                          <div><dt>{t('হাসপাতালের অবস্থান')}</dt><dd>{request.hospitalLocation}</dd></div>
                          <div><dt>{t('আবেদনকারী')}</dt><dd>{request.requesterName}</dd></div>
                          <div><dt>{t('প্রয়োজনীয় রক্ত')}</dt><dd>{request.units} {t('ব্যাগ')}</dd></div>
                          <div><dt>{t('রক্ত প্রয়োজন')}</dt><dd>{formatDateTime(request.requiredAt, language)}</dd></div>
                          <div><dt>{t('যোগাযোগ')}</dt><dd><a href={`tel:${request.phone}`}>{request.phone}</a></dd></div>
                        </dl>
                      </div>
                      <footer className="blood-request-card-footer">
                        <span className={`blood-request-status is-${currentStatus}`}>{statusLabels[currentStatus]}</span>
                        <div className="blood-request-actions">
                          <a aria-label={`${t('এখনই কল করুন')} ${request.requesterName}`} className="blood-request-action is-call" href={`tel:${request.phone}`}>
                            {t('এখনই কল করুন')}
                          </a>
                          <a aria-label={`${t('WhatsApp')} ${request.requesterName}`} className="blood-request-action is-whatsapp" href={`https://wa.me/${phoneDigits}`} rel="noreferrer" target="_blank">
                            WhatsApp
                          </a>
                          <button aria-expanded={expanded} className="blood-request-action is-details" onClick={() => setExpandedId(expanded ? '' : request.id)} type="button">
                            {expanded ? t('বিস্তারিত বন্ধ করুন') : t('আবেদনের বিস্তারিত')}
                          </button>
                        </div>
                      </footer>
                      {expanded && (
                        <div className="blood-request-expanded-details">
                          <p>{request.patientIssue}</p>
                          <dl>
                            <div><dt>{t('আবেদন জমা')}</dt><dd>{formatDateTime(request.createdAt, language)}</dd></div>
                            <div><dt>{t('সর্বশেষ হালনাগাদ')}</dt><dd>{formatDateTime(request.updatedAt, language)}</dd></div>
                          </dl>
                          {token && ['active', 'expired'].includes(currentStatus) && (
                            <div className="blood-request-manage-actions">
                              <button disabled={updatingId === request.id} onClick={() => void updateRequest(request, 'fulfilled')} type="button">
                                {updatingId === request.id ? t('হালনাগাদ হচ্ছে…') : t('রক্ত পেয়েছি')}
                              </button>
                              <button disabled={updatingId === request.id} onClick={() => void updateRequest(request, 'cancelled')} type="button">{t('আবেদন বাতিল করুন')}</button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
              {pagination?.pages > 1 && (
                <nav aria-label={t('আবেদনের পৃষ্ঠা')} className="blood-request-pagination">
                  <button disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1) }} type="button">{t('আগের পৃষ্ঠা')}</button>
                  <span>{t('পৃষ্ঠা')} {pagination.page} / {pagination.pages} · {t('মোট')} {pagination.total}</span>
                  <button disabled={page >= pagination.pages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1) }} type="button">{t('পরের পৃষ্ঠা')}</button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      {formOpen && (
        <div className="blood-request-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFormOpen(false)
        }}>
          <section aria-labelledby="blood-request-form-title" aria-modal="true" className="blood-request-modal" role="dialog">
            <header className="blood-request-modal-header">
              <div>
                <span className="section-kicker">{t('আহ্বান রক্তদান সংস্থা')}</span>
                <h2 id="blood-request-form-title">{t('রক্তের জন্য আবেদন করুন')}</h2>
              </div>
              <button aria-label={t('বন্ধ করুন')} className="blood-request-modal-close" onClick={() => setFormOpen(false)} type="button">×</button>
            </header>
            <p className="blood-request-privacy-note">{t('আবেদনটি প্রকাশ্য হবে। মোবাইল নম্বরটি সবার কাছে দৃশ্যমান থাকবে, তাই শুধু এই আবেদনের যোগাযোগের জন্য নম্বর দিন।')}</p>
            <form className="blood-request-form" noValidate onSubmit={submitRequest}>
              <label>
                {t('আবেদনকারীর নাম')}
                <input autoComplete="name" maxLength="100" minLength="2" name="requesterName" onChange={changeFormField} required value={form.requesterName} />
                {fieldErrors.requesterName && <small>{t(fieldErrors.requesterName)}</small>}
              </label>
              <label>
                {t('রোগীর নাম')}
                <input maxLength="100" minLength="2" name="patientName" onChange={changeFormField} required value={form.patientName} />
                {fieldErrors.patientName && <small>{t(fieldErrors.patientName)}</small>}
              </label>
              <label className="blood-request-form-wide">
                {t('রোগীর সমস্যা')}
                <textarea maxLength="1000" minLength="10" name="patientIssue" onChange={changeFormField} required rows="3" value={form.patientIssue} />
                {fieldErrors.patientIssue && <small>{t(fieldErrors.patientIssue)}</small>}
              </label>
              <label>
                {t('হাসপাতালের নাম')}
                <input maxLength="120" minLength="2" name="hospitalName" onChange={changeFormField} required value={form.hospitalName} />
                {fieldErrors.hospitalName && <small>{t(fieldErrors.hospitalName)}</small>}
              </label>
              <label>
                {t('হাসপাতালের অবস্থান')}
                <input maxLength="200" minLength="4" name="hospitalLocation" onChange={changeFormField} required value={form.hospitalLocation} />
                {fieldErrors.hospitalLocation && <small>{t(fieldErrors.hospitalLocation)}</small>}
              </label>
              <label>
                {t('আবেদনকারীর মোবাইল নম্বর')}
                <input autoComplete="tel" inputMode="tel" maxLength="16" name="phone" onChange={changeFormField} placeholder="017XXXXXXXX" required value={form.phone} />
                {fieldErrors.phone && <small>{t(fieldErrors.phone)}</small>}
              </label>
              <label>
                {t('রক্তের গ্রুপ')}
                <select name="bloodGroup" onChange={changeFormField} required value={form.bloodGroup}>
                  <option value="">{t('রক্তের গ্রুপ নির্বাচন করুন')}</option>
                  {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
                {fieldErrors.bloodGroup && <small>{t(fieldErrors.bloodGroup)}</small>}
              </label>
              <label>
                {t('কত ব্যাগ রক্ত প্রয়োজন')}
                <input max="20" min="1" name="units" onChange={changeFormField} required type="number" value={form.units} />
                {fieldErrors.units && <small>{t(fieldErrors.units)}</small>}
              </label>
              <label>
                {t('রক্ত প্রয়োজনের তারিখ ও সময়')}
                <input min={minimumDateTime} name="requiredAt" onChange={changeFormField} required type="datetime-local" value={form.requiredAt} />
                {fieldErrors.requiredAt && <small>{t(fieldErrors.requiredAt)}</small>}
              </label>
              <label aria-hidden="true" className="blood-request-honeypot" tabIndex="-1">
                Website
                <input autoComplete="off" name="website" onChange={changeFormField} tabIndex="-1" value={form.website} />
              </label>
              <label className="blood-request-consent">
                <input checked={form.contactConsent} name="contactConsent" onChange={changeFormField} required type="checkbox" />
                <span>{t('আমি সম্মত যে এই আবেদনের যোগাযোগের জন্য আমার মোবাইল নম্বরটি প্রকাশ্যে দেখানো হবে।')}</span>
              </label>
              {fieldErrors.contactConsent && <small className="blood-request-field-error">{t(fieldErrors.contactConsent)}</small>}
              {error && <p className="blood-request-feedback is-error" role="alert">{error}</p>}
              <div className="blood-request-form-actions">
                <button className="button button-secondary" disabled={submitting} onClick={() => setFormOpen(false)} type="button">{t('বাতিল')}</button>
                <button className="button button-primary" disabled={submitting} type="submit">
                  {submitting ? t('জমা হচ্ছে…') : t('আবেদন প্রকাশ করুন')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default BloodRequestsPage

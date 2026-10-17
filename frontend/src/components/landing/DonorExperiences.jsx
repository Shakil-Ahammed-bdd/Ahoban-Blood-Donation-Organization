import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Reveal from '../shared/Reveal'
import { useAuth } from '../../contexts/useAuth'
import { experienceApi } from '../../services/api/experienceApi'
import DonorExperienceCard from './DonorExperienceCard'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_PHOTOS = 5
const TODAY = new Date().toISOString().slice(0, 10)

function getSubmitErrorMessage(error, t) {
  if (error.status === 401 || error.code === 'AUTH_REQUIRED') {
    return t('গল্প শেয়ার করতে আগে লগ ইন করুন।')
  }
  if (error.code === 'INVALID_PHOTO_TYPE' || error.code === 'INVALID_PHOTO_CONTENT') {
    return t('শুধু JPG, JPEG, PNG অথবা WebP ছবি নির্বাচন করুন।')
  }
  if (error.code === 'PHOTO_TOO_LARGE') return t('প্রতিটি ছবির আকার সর্বোচ্চ ৫ MB হতে হবে।')
  if (error.status >= 500 || (!error.status && error.name === 'TypeError')) {
    return t('আপনার অনুভূতি জমা দেওয়া যায়নি। পরে আবার চেষ্টা করুন।')
  }

  const fieldMessage = Object.values(error.fieldErrors || {})[0]
  if (fieldMessage) return t(fieldMessage)
  if (error.message && error.message !== 'Validation failed.') return translateErrorMessage(error, t)
  return t('চিহ্নিত তথ্যগুলো যাচাই করে আবার চেষ্টা করুন।')
}

function DonorExperiences() {
  const { t } = useLanguage()
  const translationRef = useRef(t)
  translationRef.current = t
  const { status: authStatus, user, refresh } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [feed, setFeed] = useState({ experiences: [], pagination: null })
  const [mineState, setMineState] = useState({ userId: null, experiences: [], error: '' })
  const [moderationQueueState, setModerationQueueState] = useState(null)
  const [moderationSavingId, setModerationSavingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({
    message: '',
    donationDate: '',
    donationCount: '',
    publicConsent: false,
  })
  const [photos, setPhotos] = useState([])
  const [retainedImages, setRetainedImages] = useState([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const submitting = useRef(false)
  const previews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos],
  )
  const mine = authStatus === 'authenticated' && mineState.userId === user?.id
    ? mineState.experiences
    : []
  const mineError = authStatus === 'authenticated' && mineState.userId === user?.id
    ? mineState.error
    : ''
  const moderationState = moderationQueueState?.userId === user?.id
    ? moderationQueueState
    : null
  const moderationQueue = moderationState?.experiences || []
  const moderationError = moderationState?.error || ''
  const moderationLoading = authStatus === 'authenticated' &&
    user?.isExperienceModerator &&
    !moderationState
  const ownedExperienceIds = new Set(mine.map(({ id }) => id))

  useEffect(() => () => {
    previews.forEach(({ url }) => URL.revokeObjectURL(url))
  }, [previews])

  useEffect(() => {
    let active = true
    experienceApi.list({ page, limit: 9 }).then(
      (publicResult) => {
        if (!active) return
        setFeed(publicResult)
        setLoadError('')
      },
      (requestError) => {
        if (active) setLoadError(translateErrorMessage(requestError, translationRef.current))
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [page, retry])

  const editId = searchParams.get('edit')

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user?.id) return undefined

    let active = true
    experienceApi.mine().then(
      ({ experiences }) => {
        if (active) {
          setMineState({ userId: user.id, experiences, error: '' })
          if (editId) {
            const experience = experiences.find(({ id }) => id === editId)
            if (experience) {
              openEdit(experience)
            } else {
              setError('এই রক্তদানের গল্পটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।')
            }
            setSearchParams({}, { replace: true })
          }
        }
      },
      (requestError) => {
        if (active) {
          if (requestError.status === 401) {
            void refresh()
            return
          }
          setMineState({ userId: user.id, experiences: [], error: translateErrorMessage(requestError, translationRef.current) })
          if (editId) {
            setError(translateErrorMessage(requestError, translationRef.current))
            setSearchParams({}, { replace: true })
          }
        }
      },
    )
    return () => { active = false }
  }, [authStatus, editId, refresh, retry, setSearchParams, user?.id])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user?.isExperienceModerator || !user?.id) return undefined

    let active = true
    experienceApi.moderationQueue().then(
      ({ experiences }) => {
        if (active) {
          setModerationQueueState({ userId: user.id, experiences, error: '' })
        }
      },
      (requestError) => {
        if (active) {
          setModerationQueueState({
            userId: user.id,
            experiences: [],
            error: translateErrorMessage(requestError, translationRef.current),
          })
        }
      },
    )
    return () => { active = false }
  }, [authStatus, retry, user?.id, user?.isExperienceModerator])

  function openCreate() {
    if (authStatus !== 'authenticated') {
      setModal({ type: 'login' })
      return
    }
    setError('')
    setFieldErrors({})
    setNotice('')
    setPhotos([])
    setRetainedImages([])
    setForm({ message: '', donationDate: '', donationCount: '', publicConsent: false })
    setModal({ type: 'form', experience: null })
  }

  function openEdit(experience) {
    setError('')
    setFieldErrors({})
    setNotice('')
    setPhotos([])
    setRetainedImages(experience.images?.length ? experience.images : [experience.photoUrl].filter(Boolean))
    setForm({
      message: experience.message,
      donationDate: experience.donationDate.slice(0, 10),
      donationCount: experience.donationCount || '',
      publicConsent: true,
    })
    setModal({ type: 'form', experience })
  }

  function selectPhotos(event) {
    const selected = Array.from(event.target.files || [])
    setFieldErrors((current) => ({ ...current, photos: undefined }))
    setError('')
    if (!selected.length) return
    if (retainedImages.length + photos.length + selected.length > MAX_PHOTOS) {
      setFieldErrors((current) => ({ ...current, photos: t('সর্বোচ্চ ৫টি ছবি নির্বাচন করা যাবে।') }))
      event.target.value = ''
      return
    }
    const invalidType = selected.find((file) => !PHOTO_TYPES.has(file.type))
    if (invalidType) {
      setFieldErrors((current) => ({ ...current, photos: t('শুধু JPG, JPEG, PNG অথবা WebP ছবি নির্বাচন করুন।') }))
      event.target.value = ''
      return
    }
    if (selected.some((file) => file.size > MAX_PHOTO_BYTES)) {
      setFieldErrors((current) => ({ ...current, photos: t('প্রতিটি ছবির আকার সর্বোচ্চ ৫ MB হতে হবে।') }))
      event.target.value = ''
      return
    }
    setPhotos((current) => [...current, ...selected])
    event.target.value = ''
  }

  function removeSelectedPhoto(indexToRemove) {
    setPhotos((current) => current.filter((_, index) => index !== indexToRemove))
  }

  function removeExistingImage(image) {
    setRetainedImages((current) => current.filter((url) => url !== image))
    setFieldErrors((current) => ({ ...current, photos: undefined }))
  }

  function updateForm(event) {
    const { checked, name, type, value } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  async function refreshExperiences() {
    if (!user?.id) throw new Error('Please sign in to manage your stories.')
    const [publicResult, mineResult] = await Promise.allSettled([
      experienceApi.list({ page, limit: 9 }),
      experienceApi.mine(),
    ])
    if (publicResult.status === 'rejected') throw publicResult.reason
    setFeed(publicResult.value)
    setLoadError('')
    if (mineResult.status === 'fulfilled') {
      setMineState({ userId: user.id, experiences: mineResult.value.experiences, error: '' })
    } else {
      setMineState({ userId: user.id, experiences: [], error: mineResult.reason.message })
    }
  }

  async function moderateExperience(experience, status) {
    if (moderationSavingId) return
    setModerationSavingId(experience.id)
    try {
      await experienceApi.moderate(experience.id, status)
      setModerationQueueState((current) => current?.userId === user?.id
        ? {
            ...current,
            experiences: current.experiences.filter(({ id }) => id !== experience.id),
            error: '',
          }
        : current)
      setMineState((current) => ({
        ...current,
        experiences: current.experiences.map((item) =>
          item.id === experience.id ? { ...item, status } : item,
        ),
      }))
      if (page === 1) setRetry((current) => current + 1)
      else setPage(1)
    } catch (requestError) {
      setModerationQueueState((current) => current?.userId === user?.id
        ? { ...current, error: translateErrorMessage(requestError, t) }
        : { userId: user.id, experiences: [], error: translateErrorMessage(requestError, t) })
    } finally {
      setModerationSavingId('')
    }
  }

  async function submitExperience(event) {
    event.preventDefault()
    if (submitting.current) return
    const validationErrors = {}
    if (form.message.trim().length < 20 || form.message.trim().length > 1000) {
      validationErrors.message = t('আপনার অনুভূতি ২০ থেকে ১০০০ অক্ষরের মধ্যে লিখুন।')
    }
    if (!form.donationDate) validationErrors.donationDate = t('রক্তদানের তারিখ নির্বাচন করুন।')
    const finalImageCount = retainedImages.length + photos.length
    if (finalImageCount < 1) validationErrors.photos = t('অন্তত একটি ছবি রাখতে বা আপলোড করতে হবে।')
    if (finalImageCount > MAX_PHOTOS) validationErrors.photos = t('সর্বোচ্চ ৫টি ছবি রাখা যাবে।')
    if (!form.publicConsent) validationErrors.publicConsent = t('প্রকাশের সম্মতি প্রয়োজন।')
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length) return

    submitting.current = true
    setSaving(true)
    setError('')
    const payload = new FormData()
    payload.set('message', form.message.trim())
    payload.set('donationDate', form.donationDate)
    payload.set('donationCount', form.donationCount)
    payload.set('publicConsent', String(form.publicConsent))
    if (modal.experience) payload.set('existingImages', JSON.stringify(retainedImages))
    photos.forEach((photo) => payload.append('photos', photo))

    let result
    try {
      result = modal.experience
        ? await experienceApi.update(modal.experience.id, payload)
        : await experienceApi.create(payload)
    } catch (requestError) {
      setError(getSubmitErrorMessage(requestError, t))
      setFieldErrors(requestError.fieldErrors || {})
      return
    } finally {
      submitting.current = false
      setSaving(false)
    }

    setModal(null)
    setForm({ message: '', donationDate: '', donationCount: '', publicConsent: false })
    setPhotos([])
    setRetainedImages([])
    setFieldErrors({})
    setNotice(t(result.message))
    try {
      await refreshExperiences()
      setLoadError('')
    } catch (requestError) {
      setLoadError(translateErrorMessage(requestError, t))
    }
  }

  async function deleteExperience(experience) {
    if (!window.confirm(t('আপনি কি এই রক্তদানের গল্পটি মুছে ফেলতে চান?'))) return
    setError('')
    try {
      await experienceApi.delete(experience.id)
      await refreshExperiences()
      setNotice(t('আপনার অনুভূতি মুছে ফেলা হয়েছে।'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    }
  }

  const currentExperience = modal?.experience

  return (
    <section
      aria-labelledby="donor-experiences-title"
      className="section donor-experiences-section donor-experiences-page"
    >
      <div className="section-container">
        <Reveal>
          <header className="section-heading donor-experiences-heading">
            <span className="section-kicker">{t('রক্তদানের গল্প')}</span>
            <h1 id="donor-experiences-title">{t('রক্তদাতার')} <span>{t('অনুভূতি')}</span></h1>
            <p>{t('রক্তদানের পরের সত্যিকারের অনুভূতি ও অভিজ্ঞতা দেখুন এবং আপনার গল্প অন্যদের সঙ্গে ভাগ করুন।')}</p>
            <button className="button button-primary experience-share-button" onClick={openCreate} type="button">
              {t('আপনার অনুভূতি শেয়ার করুন')} <span aria-hidden="true">↗</span>
            </button>
          </header>
        </Reveal>

        {notice && <p aria-live="polite" className="experience-notice" role="status">{t(notice)}</p>}
        {error && !modal && <p aria-live="polite" className="experience-error" role="alert">{t(error)}</p>}

        {authStatus === 'authenticated' && user?.isExperienceModerator && (
          <section aria-labelledby="experience-moderation-title" className="my-experiences">
            <h2 id="experience-moderation-title">{t('গল্প পর্যালোচনা')}</h2>
            {moderationError && <p className="experience-error" role="alert">{t(moderationError)}</p>}
            {moderationLoading && <p className="experience-state" role="status">{t('পর্যালোচনার গল্প লোড হচ্ছে…')}</p>}
            {!moderationLoading && moderationQueue.length === 0 && (
              <p className="experience-state">{t('পর্যালোচনার জন্য কোনো গল্প অপেক্ষায় নেই।')}</p>
            )}
            {moderationQueue.length > 0 && (
              <div className="experience-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {moderationQueue.map((experience) => (
                  <div key={experience.id}>
                    <DonorExperienceCard experience={experience} />
                    <div className="experience-owner-actions">
                      <button
                        disabled={Boolean(moderationSavingId)}
                        onClick={() => moderateExperience(experience, 'approved')}
                        type="button"
                      >
                        {moderationSavingId === experience.id ? t('সংরক্ষণ হচ্ছে…') : t('অনুমোদন করুন')}
                      </button>
                      <button
                        disabled={Boolean(moderationSavingId)}
                        onClick={() => moderateExperience(experience, 'rejected')}
                        type="button"
                      >
                        {t('প্রত্যাখ্যান করুন')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {authStatus === 'authenticated' && mine.length > 0 && (
          <section aria-labelledby="my-experiences-title" className="my-experiences">
            <h3 id="my-experiences-title">{t('আপনার শেয়ার করা অনুভূতি')}</h3>
            {mineError && <p className="experience-error" role="alert">{t(mineError)}</p>}
            <div className="experience-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {mine.filter(({ status }) => status !== 'approved').map((experience) => (
                <DonorExperienceCard
                  experience={experience}
                  key={`${experience.id}:${experience.updatedAt}:${experience.reactionCount}:${experience.commentCount}:${experience.currentReaction}`}
                  onDelete={deleteExperience}
                  onEdit={openEdit}
                  owner
                />
              ))}
            </div>
          </section>
        )}
        {authStatus === 'authenticated' && mineError && mine.length === 0 && (
          <p className="experience-error" role="alert">{t('আপনার শেয়ার করা অনুভূতি লোড করা যায়নি।')} {t(mineError)}</p>
        )}

        {loading && <p className="experience-state" role="status">{t('দাতাদের অনুভূতি লোড হচ্ছে…')}</p>}
        {!loading && loadError && (
          <div className="experience-state" role="alert">
            <p>{t('দাতাদের অনুভূতি এখন লোড করা যাচ্ছে না।')} {t(loadError)}</p>
            <button className="button button-secondary" onClick={() => { setLoading(true); setRetry((current) => current + 1) }} type="button">{t('আবার চেষ্টা করুন')}</button>
          </div>
        )}
        {!loading && !loadError && feed.experiences.length === 0 && (
          <p className="experience-state" role="status">{t('এখনো কোনো অনুমোদিত দাতার অনুভূতি প্রকাশিত হয়নি। আপনি চাইলে আপনার গল্পটি শেয়ার করতে পারেন।')}</p>
        )}
        {!loading && !loadError && feed.experiences.length > 0 && (
          <>
            <div aria-live="polite" className="experience-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {feed.experiences.map((experience) => {
                const owner = ownedExperienceIds.has(experience.id)
                return (
                  <DonorExperienceCard
                    experience={experience}
                    key={`${experience.id}:${experience.updatedAt}:${experience.reactionCount}:${experience.commentCount}:${experience.currentReaction}`}
                    onDelete={deleteExperience}
                    onEdit={openEdit}
                    owner={owner}
                  />
                )
              })}
            </div>
            {feed.pagination.pages > 1 && (
              <nav aria-label={t('দাতার অনুভূতির পৃষ্ঠা')} className="experience-pagination">
                <button disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1) }} type="button">{t('আগের পৃষ্ঠা')}</button>
                <span>{t('পৃষ্ঠা')} {page} / {feed.pagination.pages}</span>
                <button disabled={page >= feed.pagination.pages} onClick={() => { setLoading(true); setPage((current) => current + 1) }} type="button">{t('পরের পৃষ্ঠা')}</button>
              </nav>
            )}
          </>
        )}
      </div>

      {modal?.type === 'login' && (
        <div className="experience-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModal(null)
        }}>
          <section aria-labelledby="experience-login-title" aria-modal="true" className="experience-modal experience-login-modal" role="dialog">
            <button aria-label={t('বন্ধ করুন')} className="experience-modal-close" onClick={() => setModal(null)} type="button">×</button>
            <h3 id="experience-login-title">{t('আপনার গল্প শেয়ার করুন')}</h3>
            <p>{t('অনুভূতি শেয়ার করতে আগে আপনার দাতা অ্যাকাউন্টে লগ ইন করুন অথবা নিবন্ধন করুন।')}</p>
            <div className="experience-modal-actions">
              <button className="button button-primary" onClick={() => navigate('/login')} type="button">{t('লগ ইন')}</button>
              <button className="button button-secondary" onClick={() => navigate('/register')} type="button">{t('নিবন্ধন')}</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === 'form' && (
        <div className="experience-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setModal(null)
        }}>
          <section aria-labelledby="experience-form-title" aria-modal="true" className="experience-modal" role="dialog">
            <button aria-label={t('বন্ধ করুন')} className="experience-modal-close" disabled={saving} onClick={() => setModal(null)} type="button">×</button>
            <h3 id="experience-form-title">{currentExperience ? t('আপনার অনুভূতি সম্পাদনা করুন') : t('আপনার অনুভূতি শেয়ার করুন')}</h3>
            <p className="experience-profile-summary">
              {currentExperience
                ? `${currentExperience.donorName} · ${currentExperience.publicUserId} · ${currentExperience.bloodGroup} · ${currentExperience.division}, ${currentExperience.district}`
                : `${user?.fullName} · ${user?.userId} · ${user?.bloodGroup} · ${user?.division}, ${user?.district}`}
            </p>
            {error && <p className="experience-error" role="alert">{t(error)}</p>}
            <form className="experience-form" onSubmit={submitExperience}>
              <div className="experience-photo-field">
                <label htmlFor="experience-photos">{t('ছবি আপলোড করুন (সর্বোচ্চ ৫টি)')}{currentExperience ? ` · ${t('নতুন ছবি ঐচ্ছিক')}` : ` · ${t('অন্তত ১টি আবশ্যক')}`}</label>
                <input
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  aria-invalid={Boolean(fieldErrors.photos)}
                  disabled={retainedImages.length + photos.length >= MAX_PHOTOS}
                  id="experience-photos"
                  multiple
                  onChange={selectPhotos}
                  type="file"
                />
                <small>{t('JPG, JPEG, PNG অথবা WebP · প্রতিটি সর্বোচ্চ ৫ MB')}</small>
                  {fieldErrors.photos && <small className="experience-field-error">{t(fieldErrors.photos)}</small>}
                {currentExperience?.images?.length > 0 && (
                  <div className="experience-photo-previews">
                  {retainedImages.map((image, index) => (
                    <div className="experience-photo-preview-item" key={image}>
                      <img alt={t('বর্তমান ছবি {number}', { number: index + 1 })} className="experience-photo-preview" src={image} />
                      <button aria-label={t('বর্তমান ছবি {number} সরান', { number: index + 1 })} onClick={() => removeExistingImage(image)} type="button">×</button>
                    </div>
                  ))}
                </div>
                )}
                {photos.length > 0 && (
                  <div className="experience-photo-previews">
                    {previews.map(({ file, url }, index) => (
                      <div className="experience-photo-preview-item" key={`${file.name}-${file.lastModified}-${index}`}>
                        <img alt={t('ছবির প্রিভিউ {number}', { number: index + 1 })} className="experience-photo-preview" src={url} />
                        <button aria-label={t('ছবি {number} সরান', { number: index + 1 })} onClick={() => removeSelectedPhoto(index)} type="button">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {currentExperience && (
                  <small>{t('মোট ছবি:')} {retainedImages.length + photos.length} / 5. {t('সংরক্ষিত ছবি রাখতে বা সরাতে পারবেন।')}</small>
                )}
              </div>
              <label className="experience-form-field">
                <span>{t('রক্তদানের তারিখ')}</span>
                <input aria-invalid={Boolean(fieldErrors.donationDate)} max={TODAY} name="donationDate" onChange={updateForm} required type="date" value={form.donationDate} />
                {fieldErrors.donationDate && <small className="experience-field-error">{t(fieldErrors.donationDate)}</small>}
              </label>
              <label className="experience-form-field">
                <span>{t('আপনার অনুভূতি')}</span>
                <textarea aria-invalid={Boolean(fieldErrors.message)} maxLength={1000} minLength={20} name="message" onChange={updateForm} placeholder={t('রক্তদানের অভিজ্ঞতা ও অনুভূতি লিখুন…')} required rows={5} value={form.message} />
                <small>{form.message.length}/1000</small>
                {fieldErrors.message && <small className="experience-field-error">{t(fieldErrors.message)}</small>}
              </label>
              <label className="experience-form-field">
                <span>{t('মোট রক্তদানের সংখ্যা')} <em>({t('ঐচ্ছিক')})</em></span>
                <input max="1000" min="1" name="donationCount" onChange={updateForm} placeholder={t('যেমন ৩')} type="number" value={form.donationCount} />
                {fieldErrors.donationCount && <small className="experience-field-error">{t(fieldErrors.donationCount)}</small>}
              </label>
              <label className="experience-consent">
                <input checked={form.publicConsent} name="publicConsent" onChange={updateForm} type="checkbox" />
                <span>{t('আমার অনুভূতি ও ছবি সবার জন্য প্রকাশ করতে সম্মত। প্রকাশের আগে এটি অনুমোদনের জন্য পর্যালোচনা করা হবে।')}</span>
              </label>
              {fieldErrors.publicConsent && <small className="experience-field-error">{t(fieldErrors.publicConsent)}</small>}
              <button className="button button-primary experience-submit" disabled={saving} type="submit">
                {saving ? t('জমা হচ্ছে…') : currentExperience ? t('পর্যালোচনার জন্য পাঠান') : t('অনুভূতি জমা দিন')}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default DonorExperiences

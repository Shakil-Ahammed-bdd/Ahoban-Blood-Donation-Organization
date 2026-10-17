import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import AuthLayout from '../components/auth/AuthLayout'
import AuthSelect from '../components/auth/AuthSelect'
import { useAuth } from '../contexts/useAuth'
import { profileApi } from '../services/api/profileApi'
import { experienceApi } from '../services/api/experienceApi'
import { bangladeshDivisions, bangladeshLocations } from '../utils/bangladeshLocations'
import bangladeshUpazilas from '../utils/bangladeshUpazilas'
import { requestCurrentCoordinates } from '../utils/currentLocation'
import { formatDonationDate } from '../utils/formatDonationDate'
import DonorExperienceCard from '../components/landing/DonorExperienceCard'
import DonorBadgeSection from '../components/profile/DonorBadgeSection'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function editableValues(user) {
  return {
    fullName: user.fullName,
    phone: user.phone,
    whatsappNumber: user.whatsappNumber || '',
    bloodGroup: user.bloodGroup,
    division: user.division,
    district: user.district,
    upazila: user.upazila || '',
    location: user.location || '',
    latitude: user.latitude ?? '',
    longitude: user.longitude ?? '',
    isSearchable: Boolean(user.isSearchable),
    isContactPublic: Boolean(user.isContactPublic),
  }
}

function ProfilePage() {
  const { language, t } = useLanguage()
  const { deleteAccount, user, logout, updateUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [values, setValues] = useState(() => editableValues(user))
  const [editing, setEditing] = useState(() => new URLSearchParams(location.search).get('edit') === '1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [experiences, setExperiences] = useState([])
  const [experiencesLoading, setExperiencesLoading] = useState(true)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const [donationDate, setDonationDate] = useState('')
  const [donationDateSaving, setDonationDateSaving] = useState(false)
  const [donationDateError, setDonationDateError] = useState('')
  const editRequested = new URLSearchParams(location.search).get('edit') === '1'

  useEffect(() => {
    let active = true
    profileApi.get().then(
      ({ user: profile }) => {
        if (active) {
          updateUser(profile)
          setValues(editableValues(profile))
          setLoading(false)
        }
      },
      (requestError) => {
        if (active) {
          setError(translateErrorMessage(requestError, t))
          setLoading(false)
        }
      },
    )
    experienceApi.mine().then(
      ({ experiences: posts }) => {
        if (active) setExperiences(posts)
      },
      (requestError) => {
        if (active) setError(translateErrorMessage(requestError, t))
      },
    ).finally(() => {
      if (active) setExperiencesLoading(false)
    })
    return () => { active = false }
  }, [t, updateUser])

  function update(event) {
    const { checked, name, type, value } = event.target
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'division' ? { district: '', upazila: '' } : {}),
      ...(name === 'district' ? { upazila: '' } : {}),
    }))
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === 'division' ? { district: undefined, upazila: undefined } : {}),
      ...(name === 'district' ? { upazila: undefined } : {}),
    }))
    setError('')
    setSuccess('')
  }

  async function handleCurrentLocation() {
    setLocating(true)
    setLocationNotice(t('অবস্থানের অনুমতির জন্য অপেক্ষা করা হচ্ছে…'))
    try {
      const coordinates = await requestCurrentCoordinates()
      setValues((current) => ({ ...current, ...coordinates }))
      setLocationNotice(t('স্থানাঙ্ক সংরক্ষিত হয়েছে। ঠিকানাটি এলাকা / অবস্থান ঘরে লিখুন; কোনো নির্ভুল অবস্থান প্রকাশ করা হবে না।'))
    } catch (locationError) {
      setLocationNotice(translateErrorMessage(locationError, t))
    } finally {
      setLocating(false)
    }
  }

  async function updateProfilePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('শুধু JPG, PNG অথবা WebP ছবি ব্যবহার করুন।')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('প্রোফাইল ছবির আকার সর্বোচ্চ ৫ MB হতে হবে।')
      return
    }
    setPhotoLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const { user: profile } = await profileApi.updatePhoto(formData)
      updateUser(profile)
      setSuccess(t('প্রোফাইল ছবি সফলভাবে হালনাগাদ হয়েছে।'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setPhotoLoading(false)
    }
  }

  function validate() {
    const errors = {}
    if (values.fullName.trim().length < 2 || values.fullName.trim().length > 100) {
      errors.fullName = 'নাম ২ থেকে ১০০ অক্ষরের মধ্যে লিখুন।'
    }
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(values.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন।'
    }
    if (!bloodGroups.includes(values.bloodGroup)) errors.bloodGroup = 'রক্তের গ্রুপ নির্বাচন করুন।'
    if (!bangladeshDivisions.includes(values.division)) errors.division = 'বিভাগ নির্বাচন করুন।'
    if (!values.district || !(bangladeshLocations[values.division] || []).includes(values.district)) {
      errors.district = 'বিভাগের অন্তর্গত জেলা নির্বাচন করুন।'
    }
    if (values.upazila && !(bangladeshUpazilas[values.district] || []).includes(values.upazila)) {
      errors.upazila = 'জেলার অন্তর্গত উপজেলা নির্বাচন করুন।'
    }
    if (values.location.trim().length < 2 || values.location.trim().length > 100) {
      errors.location = 'এলাকার নাম ২ থেকে ১০০ অক্ষরের মধ্যে লিখুন।'
    }
    if (values.whatsappNumber && !/^(?:\+?88)?01[3-9]\d{8}$/.test(values.whatsappNumber.replace(/[\s-]/g, ''))) {
      errors.whatsappNumber = 'সঠিক বাংলাদেশি WhatsApp নম্বর লিখুন।'
    }
    return errors
  }

  async function saveProfile(event) {
    event.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { user: profile } = await profileApi.update({
        ...values,
        latitude: values.latitude === '' ? null : Number(values.latitude),
        longitude: values.longitude === '' ? null : Number(values.longitude),
      })
      updateUser(profile)
      setValues(editableValues(profile))
      setEditing(false)
      navigate('/profile', { replace: true })
      setSuccess(t('আপনার প্রোফাইল সফলভাবে হালনাগাদ হয়েছে।'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
      setFieldErrors(requestError.fieldErrors || {})
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setValues(editableValues(user))
    setFieldErrors({})
    setError('')
    setEditing(false)
    navigate('/profile', { replace: true })
  }

  async function handleLogout() {
    setLogoutLoading(true)
    setError('')
    try {
      await logout()
      navigate('/', { replace: true, state: { notice: 'আপনি সফলভাবে লগ আউট করেছেন।' } })
    } catch (logoutError) {
      setError(translateErrorMessage(logoutError, t))
      setLogoutLoading(false)
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      t('আপনি কি নিশ্চিত যে অ্যাকাউন্ট মুছে ফেলতে চান? আপনার প্রোফাইল, রক্তদানের ইতিহাস এবং দাতা ব্যাজের অগ্রগতি স্থায়ীভাবে মুছে যাবে।'),
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')
    try {
      await deleteAccount()
      navigate('/', { replace: true, state: { notice: 'আপনার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।' } })
    } catch (deleteError) {
      setError(translateErrorMessage(deleteError, t))
      setDeleting(false)
    }
  }

  async function handleDeleteExperience(experience) {
    if (!window.confirm(t('আপনি কি এই রক্তদানের গল্পটি মুছে ফেলতে চান?'))) return
    setError('')
    try {
      await experienceApi.delete(experience.id)
      const { experiences: posts } = await experienceApi.mine()
      setExperiences(posts)
      const { user: profile } = await profileApi.get()
      updateUser(profile)
      setSuccess(t('আপনার অনুভূতি মুছে ফেলা হয়েছে।'))
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    }
  }

  async function handleLogDonationDate(event) {
    event.preventDefault()
    setDonationDateError('')
    if (!donationDate) {
      setDonationDateError(t('রক্তদানের তারিখ নির্বাচন করুন।'))
      return
    }
    setDonationDateSaving(true)
    try {
      const { user: profile } = await profileApi.logDonationDate(donationDate)
      updateUser(profile)
      setDonationDate('')
      setSuccess(t('রক্তদানের তারিখ এবং donor badge হালনাগাদ হয়েছে।'))
    } catch (requestError) {
      setDonationDateError(
        t(requestError.fieldErrors?.donationDate) || translateErrorMessage(requestError, t),
      )
    } finally {
      setDonationDateSaving(false)
    }
  }

  return (
    <AuthLayout
      eyebrow={t('ব্যক্তিগত প্রোফাইল')}
      subtitle={t('আপনার ব্যক্তিগত তথ্য ও donor-search সম্মতি দেখুন বা হালনাগাদ করুন।')}
      title={`${t('স্বাগতম')}, ${user.fullName}`}
    >
      {location.state?.message && <p className="auth-success">{t(location.state.message)}</p>}
      {success && <p aria-live="polite" className="auth-success" role="status">{t(success)}</p>}
      {error && <p aria-live="polite" className="auth-alert" role="alert">{t(error)}</p>}
      {loading ? (
        <p className="profile-loading" role="status">{t('প্রোফাইল লোড হচ্ছে…')}</p>
      ) : editing || editRequested ? (
        <form className="auth-form profile-edit-form" noValidate onSubmit={saveProfile}>
          <AuthField autoComplete="name" error={t(fieldErrors.fullName)} label={t('পূর্ণ নাম')} maxLength={100} name="fullName" onChange={update} required value={values.fullName} />
          <div className="auth-field profile-protected">
            <span>User ID</span>
            <input disabled value={user.userId} />
            <small>{t('নিরাপত্তার জন্য User ID পরিবর্তন করা যাবে না।')}</small>
          </div>
          <div className="auth-field profile-protected">
            <span>{t('ইমেইল')}</span>
            <input disabled value={user.email} />
            <small>{t('ইমেইল পরিবর্তনের সুবিধা বর্তমানে নেই।')}</small>
          </div>
          <AuthField autoComplete="tel" error={t(fieldErrors.phone)} label={t('মোবাইল নম্বর')} maxLength={16} name="phone" onChange={update} required type="tel" value={values.phone} />
          <AuthField autoComplete="tel" error={t(fieldErrors.whatsappNumber)} label={t('WhatsApp নম্বর (ঐচ্ছিক)')} maxLength={16} name="whatsappNumber" onChange={update} type="tel" value={values.whatsappNumber} />
          <AuthSelect error={t(fieldErrors.bloodGroup)} label={t('রক্তের গ্রুপ')} name="bloodGroup" onChange={update} required value={values.bloodGroup}>
            <option value="">{t('রক্তের গ্রুপ নির্বাচন করুন')}</option>
            {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
          </AuthSelect>
          <AuthSelect error={t(fieldErrors.division)} label={t('বিভাগ')} name="division" onChange={update} required value={values.division}>
            <option value="">{t('বিভাগ নির্বাচন করুন')}</option>
            {bangladeshDivisions.map((division) => <option key={division} value={division}>{division}</option>)}
          </AuthSelect>
          <AuthSelect disabled={!values.division} error={t(fieldErrors.district)} label={t('জেলা')} name="district" onChange={update} required value={values.district}>
            <option value="">{values.division ? t('জেলা নির্বাচন করুন') : t('আগে বিভাগ নির্বাচন করুন')}</option>
            {(bangladeshLocations[values.division] || []).map((district) => <option key={district} value={district}>{district}</option>)}
          </AuthSelect>
          <AuthSelect disabled={!values.district} error={t(fieldErrors.upazila)} label={t('উপজেলা (ঐচ্ছিক)')} name="upazila" onChange={update} value={values.upazila}>
            <option value="">{values.district ? t('উপজেলা নির্বাচন করুন') : t('আগে জেলা নির্বাচন করুন')}</option>
            {(bangladeshUpazilas[values.district] || []).map((upazila) => (
              <option key={upazila} value={upazila}>{upazila}</option>
            ))}
          </AuthSelect>
          <AuthField autoComplete="address-line1" error={t(fieldErrors.location)} label={t('এলাকা / অবস্থান')} maxLength={100} name="location" onChange={update} required value={values.location} />
          <div className="current-location-control">
            <button className="auth-secondary" disabled={locating} onClick={() => void handleCurrentLocation()} type="button">
              {locating ? t('অবস্থান নেওয়া হচ্ছে…') : t('বর্তমান অবস্থান ব্যবহার করুন')}
            </button>
            <small aria-live="polite">{locationNotice || t('অনুমতি দিলে স্থানাঙ্ক সংরক্ষণ হবে; ঠিকানাটি নিজে লিখুন।')}</small>
          </div>
          <label className="auth-checkbox">
            <input checked={values.isSearchable} name="isSearchable" onChange={update} type="checkbox" />
            <span>{t('আমার নাম, রক্তের গ্রুপ ও এলাকা পাবলিক donor search-এ দেখাতে সম্মতি দিচ্ছি।')}</span>
          </label>
          <label className="auth-checkbox">
            <input checked={values.isContactPublic} name="isContactPublic" onChange={update} type="checkbox" />
            <span>{t('আমি সম্মত হলে আমার মোবাইল নম্বর এবং দেওয়া WhatsApp নম্বর পাবলিক দাতা প্রোফাইলে যোগাযোগের জন্য দেখানো হবে।')}</span>
          </label>
          <button className="auth-submit" disabled={saving} type="submit">
            {saving ? t('সংরক্ষণ হচ্ছে…') : t('পরিবর্তন সংরক্ষণ')}
          </button>
          <button className="auth-secondary" disabled={saving} onClick={cancelEdit} type="button">{t('বাতিল')}</button>
        </form>
      ) : (
        <>
          <div className="profile-avatar-editor">
            <span aria-hidden="true" className="donor-avatar profile-avatar-large">
              {user.profilePhotoUrl
                ? <img alt="" src={user.profilePhotoUrl} />
                : user.fullName.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('')}
            </span>
            <label className="button button-secondary">
              {photoLoading ? t('ছবি আপলোড হচ্ছে…') : t('প্রোফাইল ছবি পরিবর্তন')}
              <input accept="image/jpeg,image/jpg,image/png,image/webp" disabled={photoLoading} onChange={updateProfilePhoto} type="file" />
            </label>
          </div>
          <dl className="profile-details">
            <div><dt>{t('পূর্ণ নাম')}</dt><dd>{user.fullName}</dd></div>
            <div><dt>User ID</dt><dd>{user.userId}</dd></div>
            <div><dt>{t('ইমেইল')}</dt><dd>{user.email}</dd></div>
            <div><dt>{t('মোবাইল')}</dt><dd>{user.phone}</dd></div>
            <div><dt>WhatsApp</dt><dd>{user.whatsappNumber || t('উল্লেখ করা হয়নি')}</dd></div>
            <div><dt>{t('রক্তের গ্রুপ')}</dt><dd>{user.bloodGroup}</dd></div>
            <div><dt>{t('বিভাগ')}</dt><dd>{user.division}</dd></div>
            <div><dt>{t('জেলা')}</dt><dd>{user.district}</dd></div>
            <div><dt>{t('উপজেলা')}</dt><dd>{user.upazila || t('এখনো উল্লেখ করা হয়নি')}</dd></div>
            <div><dt>{t('এলাকা')}</dt><dd>{user.location || t('উল্লেখ করা হয়নি')}</dd></div>
            <div><dt>{t('দাতা availability')}</dt><dd>{t(user.isAvailableToDonate ? 'রক্তদানে প্রস্তুত' : 'এই মুহূর্তে প্রস্তুত নন')}</dd></div>
            <div><dt>{t('সর্বশেষ রক্তদানের তারিখ')}</dt><dd>{formatDonationDate(user.lastDonationDate, language)}</dd></div>
            <div><dt>{t('পূর্ববর্তী রক্তদান')}</dt><dd>{user.previousBloodDonations ?? 0}</dd></div>
            <div><dt>{t('অবস্থানের স্থানাঙ্ক')}</dt><dd>{t(user.latitude !== null && user.latitude !== undefined ? 'সংরক্ষিত; ব্যক্তিগত তথ্য' : 'উল্লেখ করা হয়নি')}</dd></div>
            <div><dt>{t('সার্চে দৃশ্যমানতা')}</dt><dd>{t(user.isSearchable ? 'সম্মত — নাম ও দাতা-তথ্য দেখা যাবে' : 'অসম্মত — সার্চে দেখা যাবে না')}</dd></div>
            <div><dt>{t('পাবলিক যোগাযোগ')}</dt><dd>{t(user.isContactPublic ? 'সম্মতি — ফোন ও দেওয়া WhatsApp নম্বর পাবলিক প্রোফাইলে দেখানো হয়' : 'সম্মতি নেই — যোগাযোগের তথ্য ব্যক্তিগত')}; {t('ইমেইল ও নির্ভুল স্থানাঙ্ক সবসময় ব্যক্তিগত থাকে।')}</dd></div>
            <div><dt>{t('নিবন্ধনের তারিখ')}</dt><dd>{user.createdAt ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'bn-BD', { dateStyle: 'medium' }).format(new Date(user.createdAt)) : t('উপলভ্য নয়')}</dd></div>
          </dl>
          <div className="profile-actions">
            <button className="auth-submit" onClick={() => { setEditing(true); setSuccess('') }} type="button">{t('প্রোফাইল সম্পাদনা')}</button>
            <button className="auth-secondary" disabled={logoutLoading} onClick={handleLogout} type="button">
              {logoutLoading ? t('লগ আউট হচ্ছে…') : t('লগ আউট')}
            </button>
          </div>
          <section aria-labelledby="my-experiences-heading" className="profile-experiences">
            <div className="profile-experiences-heading">
              <div>
                <span className="section-kicker">{t('আপনার রক্তদানের গল্প')}</span>
                <h2 id="my-experiences-heading">{t('আমার অনুভূতি')}</h2>
              </div>
              <Link className="button button-secondary" to="/donor-experiences">{t('পোস্ট পরিচালনা')}</Link>
            </div>
            {experiencesLoading && <p role="status">{t('আপনার পোস্ট লোড হচ্ছে…')}</p>}
            {!experiencesLoading && experiences.length === 0 && (
              <p>{t('এখনও কোনো অনুভূতি শেয়ার করেননি।')} <Link to="/donor-experiences">{t('আপনার গল্প শেয়ার করুন')}</Link></p>
            )}
            {!experiencesLoading && experiences.length > 0 && (
              <div className="experience-grid profile-experience-grid grid grid-cols-1">
                {experiences.map((post) => (
                  <DonorExperienceCard
                    experience={post}
                    key={`${post.id}:${post.updatedAt}:${post.reactionCount}:${post.commentCount}:${post.currentReaction}`}
                    onDelete={handleDeleteExperience}
                    onEdit={(experience) => navigate(`/donor-experiences?edit=${encodeURIComponent(experience.id)}`)}
                    owner
                  />
                ))}
              </div>
            )}
          </section>
          <DonorBadgeSection
            dateError={donationDateError}
            dateValue={donationDate}
            donorBadge={user.donorBadge}
            onDateChange={(event) => {
              setDonationDate(event.target.value)
              setDonationDateError('')
            }}
            onSubmit={handleLogDonationDate}
            saving={donationDateSaving}
          />
          <section aria-labelledby="danger-zone-title" className="profile-danger-zone">
            <h2 id="danger-zone-title"><span aria-hidden="true">⚠️</span> {t('ঝুঁকিপূর্ণ অংশ')}</h2>
            <p>{t('স্থায়ীভাবে মুছে যাবে। আপনার প্রোফাইল, রক্তদানের ইতিহাস এবং ব্যাজের অগ্রগতি সঙ্গে সঙ্গে ডেটাবেস থেকে সরানো হবে এবং পুনরুদ্ধার করা যাবে না।')}</p>
            <button
              className="auth-danger profile-danger-zone-button"
              disabled={deleting}
              onClick={handleDeleteAccount}
              type="button"
            >
              {deleting ? t('অ্যাকাউন্ট মুছে ফেলা হচ্ছে…') : `🗑️ ${t('অ্যাকাউন্ট মুছে ফেলুন')}`}
            </button>
          </section>
        </>
      )}
      <p className="auth-switch"><Link to="/">{t('মূল পাতায় ফিরুন')}</Link></p>
    </AuthLayout>
  )
}

export default ProfilePage

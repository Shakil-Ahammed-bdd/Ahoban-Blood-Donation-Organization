import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import AuthLayout from '../components/auth/AuthLayout'
import AuthSelect from '../components/auth/AuthSelect'
import { useAuth } from '../contexts/useAuth'
import { bangladeshDivisions, bangladeshLocations } from '../utils/bangladeshLocations'
import bangladeshUpazilas from '../utils/bangladeshUpazilas'
import { requestCurrentCoordinates } from '../utils/currentLocation'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const todayDate = new Date().toISOString().slice(0, 10)
const initialValues = {
  fullName: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  bloodGroup: '',
  division: '',
  district: '',
  upazila: '',
  location: '',
  latitude: '',
  longitude: '',
  isSearchable: false,
  isContactPublic: false,
  lastDonationDate: '',
  previousBloodDonations: '0',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
}

function RegisterPage() {
  const { t } = useLanguage()
  const [values, setValues] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const photoPreviewUrl = useRef('')
  const [locating, setLocating] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    return () => URL.revokeObjectURL(photoPreviewUrl.current)
  }, [])

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

  function selectPhoto(event) {
    const file = event.target.files?.[0] || null
    if (file && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setFieldErrors((current) => ({ ...current, photo: 'শুধু JPG, PNG অথবা WebP ছবি ব্যবহার করুন।' }))
      event.target.value = ''
      return
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, photo: 'প্রোফাইল ছবির আকার সর্বোচ্চ ৫ MB হতে হবে।' }))
      event.target.value = ''
      return
    }
    URL.revokeObjectURL(photoPreviewUrl.current)
    photoPreviewUrl.current = file ? URL.createObjectURL(file) : ''
    setPhotoPreview(photoPreviewUrl.current)
    setPhoto(file)
    setFieldErrors((current) => ({ ...current, photo: undefined }))
    event.target.value = ''
  }

  function validate() {
    const errors = {}
    if (values.fullName.trim().length < 2) errors.fullName = 'কমপক্ষে ২ অক্ষরের নাম লিখুন।'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'সঠিক ইমেইল ঠিকানা লিখুন।'
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(values.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন।'
    }
    if (values.whatsappNumber && !/^(?:\+?88)?01[3-9]\d{8}$/.test(values.whatsappNumber.replace(/[\s-]/g, ''))) {
      errors.whatsappNumber = 'সঠিক বাংলাদেশি WhatsApp নম্বর লিখুন।'
    }
    if (!values.bloodGroup) errors.bloodGroup = 'রক্তের গ্রুপ নির্বাচন করুন।'
    if (!values.division) errors.division = 'বিভাগ নির্বাচন করুন।'
    if (!values.district) errors.district = 'জেলা নির্বাচন করুন।'
    if (!values.upazila || !(bangladeshUpazilas[values.district] || []).includes(values.upazila)) {
      errors.upazila = 'জেলার অন্তর্গত উপজেলা নির্বাচন করুন।'
    }
    if (values.location.trim().length < 2) errors.location = 'আপনার এলাকা লিখুন।'
    const donations = Number(values.previousBloodDonations)
    if (!Number.isSafeInteger(donations) || donations < 0) errors.previousBloodDonations = 'শূন্য বা তার চেয়ে বড় পূর্ণসংখ্যা লিখুন।'
    if (values.lastDonationDate && values.lastDonationDate > todayDate) {
      errors.lastDonationDate = 'সর্বশেষ রক্তদানের তারিখ ভবিষ্যতের হতে পারে না।'
    }
    if (Array.from(values.password).length < 12) errors.password = 'পাসওয়ার্ড কমপক্ষে ১২ অক্ষরের হতে হবে।'
    if (new TextEncoder().encode(values.password).length > 72) errors.password = 'পাসওয়ার্ড ৭২ UTF-8 বাইটের বেশি হতে পারবে না।'
    if (values.confirmPassword !== values.password) errors.confirmPassword = 'পাসওয়ার্ড দুটি মিলছে না।'
    if (!values.acceptTerms) errors.acceptTerms = 'নিবন্ধনের আগে সম্মতি প্রয়োজন।'
    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (['confirmPassword', 'acceptTerms'].includes(key)) return
        if (key === 'previousBloodDonations') {
          formData.append(key, String(Number(value)))
        } else if (value !== '') {
          formData.append(key, String(value))
        }
      })
      formData.append('confirmPassword', values.confirmPassword)
      formData.append('acceptTerms', String(values.acceptTerms))
      if (photo) formData.append('photo', photo)
      const user = await register(formData)
      navigate('/', {
        replace: true,
        state: { notice: `নিবন্ধন সফল হয়েছে। আপনার User ID: ${user.userId}` },
      })
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
      setFieldErrors(Object.fromEntries(Object.entries(requestError.fieldErrors || {}).map(([key, message]) => [key, t(message)])))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow={t('নতুন দাতা')}
      subtitle={t('আপনার তথ্য দিয়ে স্বেচ্ছাসেবী রক্তদাতা হিসেবে যুক্ত হোন।')}
      title={t('দাতা নিবন্ধন')}
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {error && <p aria-live="polite" className="auth-alert" role="alert">{t(error)}</p>}
        <AuthField autoComplete="name" error={t(fieldErrors.fullName)} label={t('পূর্ণ নাম')} name="fullName" onChange={update} placeholder={t('আপনার নাম')} required value={values.fullName} />
        <div className="auth-field">
          <label htmlFor="userId-preview">{t('আপনার User ID')}</label>
          <input disabled id="userId-preview" value={t('নিবন্ধনের পর স্বয়ংক্রিয়ভাবে তৈরি হবে')} />
          <small>{t('নিবন্ধন সফল হলে আপনার অনন্য ID দেখানো হবে।')}</small>
        </div>
        <AuthField autoComplete="email" error={t(fieldErrors.email)} label={t('ইমেইল ঠিকানা')} name="email" onChange={update} placeholder="name@example.com" required type="email" value={values.email} />
        <AuthField autoComplete="tel" error={t(fieldErrors.phone)} label={t('মোবাইল নম্বর')} name="phone" onChange={update} placeholder="+880 1XXXXXXXXX" required type="tel" value={values.phone} />
        <AuthField autoComplete="tel" error={t(fieldErrors.whatsappNumber)} label={t('WhatsApp নম্বর (ঐচ্ছিক)')} name="whatsappNumber" onChange={update} placeholder={t('আলাদা WhatsApp নম্বর, থাকলে')} type="tel" value={values.whatsappNumber} />
        <div className="registration-photo-field">
          <span>{t('প্রোফাইল ছবি (ঐচ্ছিক)')}</span>
          <div className="registration-photo-control">
            <span aria-hidden="true" className="registration-photo-preview">
              {photoPreview ? <img alt="" src={photoPreview} /> : values.fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('') || '♥'}
            </span>
            <label className="button button-secondary registration-photo-button">
              {photo ? t('ছবি পরিবর্তন করুন') : t('ছবি নির্বাচন করুন')}
              <input accept="image/jpeg,image/jpg,image/png,image/webp" onChange={selectPhoto} type="file" />
            </label>
          </div>
          <small>{t('JPG, PNG বা WebP; সর্বোচ্চ ৫ MB। সার্ভারে ছবি অপ্টিমাইজ করা হবে।')}</small>
          {fieldErrors.photo && <small className="field-error">{fieldErrors.photo}</small>}
        </div>
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
        <AuthSelect disabled={!values.district} error={t(fieldErrors.upazila)} label={t('উপজেলা')} name="upazila" onChange={update} required value={values.upazila}>
          <option value="">{values.district ? t('উপজেলা নির্বাচন করুন') : t('আগে জেলা নির্বাচন করুন')}</option>
          {(bangladeshUpazilas[values.district] || []).map((upazila) => (
            <option key={upazila} value={upazila}>{upazila}</option>
          ))}
        </AuthSelect>
        <AuthField autoComplete="address-line1" error={t(fieldErrors.location)} label={t('এলাকা / অবস্থান')} maxLength={100} name="location" onChange={update} placeholder={t('যেমন: ধানমন্ডি, ঢাকা')} required value={values.location} />
        <div className="current-location-control">
          <button className="auth-secondary" disabled={locating} onClick={() => void handleCurrentLocation()} type="button">
            {locating ? t('অবস্থান নেওয়া হচ্ছে…') : t('বর্তমান অবস্থান ব্যবহার করুন')}
          </button>
          <small aria-live="polite" role={locationNotice && !locating ? 'status' : undefined}>
            {locationNotice || t('আপনার স্পষ্ট অনুমতি ছাড়া অবস্থান নেওয়া হবে না। স্থানাঙ্ক ব্যক্তিগত থাকবে; ঠিকানাটি নিজে লিখুন।')}
          </small>
        </div>
        <AuthField error={t(fieldErrors.lastDonationDate)} label={t('সর্বশেষ রক্তদানের তারিখ (ঐচ্ছিক)')} max={todayDate} name="lastDonationDate" onChange={update} type="date" value={values.lastDonationDate} />
        <AuthField error={t(fieldErrors.previousBloodDonations)} label={t('পূর্ববর্তী রক্তদানের সংখ্যা')} min="0" name="previousBloodDonations" onChange={update} required type="number" value={values.previousBloodDonations} />
        <div className="auth-password-field">
          <AuthField autoComplete="new-password" error={t(fieldErrors.password)} label={t('পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)')} maxLength={72} name="password" onChange={update} required type={showPassword ? 'text' : 'password'} value={values.password} />
          <button aria-label={showPassword ? t('পাসওয়ার্ড লুকান') : t('পাসওয়ার্ড দেখান')} className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} type="button">
            {showPassword ? t('লুকান') : t('দেখুন')}
          </button>
        </div>
        <AuthField autoComplete="new-password" error={t(fieldErrors.confirmPassword)} label={t('পাসওয়ার্ড নিশ্চিত করুন')} maxLength={72} name="confirmPassword" onChange={update} required type={showPassword ? 'text' : 'password'} value={values.confirmPassword} />
        <label className="auth-checkbox">
          <input checked={values.acceptTerms} name="acceptTerms" onChange={update} type="checkbox" />
          <span>{t('আমি শর্তাবলী ও গোপনীয়তা নীতিতে সম্মত।')}</span>
        </label>
        {fieldErrors.acceptTerms && <small className="field-error">{t(fieldErrors.acceptTerms)}</small>}
        <label className="auth-checkbox">
          <input checked={values.isSearchable} name="isSearchable" onChange={update} type="checkbox" />
          <span>{t('আমার নাম, রক্তের গ্রুপ ও এলাকা পাবলিক donor search-এ দেখাতে সম্মতি দিচ্ছি।')}</span>
        </label>
        <label className="auth-checkbox">
          <input checked={values.isContactPublic} name="isContactPublic" onChange={update} type="checkbox" />
          <span>{t('আমি সম্মত হলে আমার মোবাইল নম্বর এবং দেওয়া WhatsApp নম্বর পাবলিক দাতা প্রোফাইলে যোগাযোগের জন্য দেখানো হবে।')}</span>
        </label>
        <button className="auth-submit" disabled={loading} type="submit">
          {loading ? t('নিবন্ধন হচ্ছে…') : t('নিবন্ধন করুন')}
        </button>
        <p className="auth-switch">{t('আগে থেকেই অ্যাকাউন্ট আছে?')} <Link to="/login">{t('লগ ইন করুন')}</Link></p>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage

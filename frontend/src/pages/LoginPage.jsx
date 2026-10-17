import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import AuthLayout from '../components/auth/AuthLayout'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'

function LoginPage() {
  const { t } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}
    if (!identifier.trim()) errors.identifier = 'ইমেইল বা User ID লিখুন।'
    if (!password) errors.password = 'পাসওয়ার্ড লিখুন।'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setLoading(true)
    setError('')
    try {
      await login({ identifier: identifier.trim(), password })
      navigate('/', {
        replace: true,
        state: { notice: 'লগ ইন সফল হয়েছে। স্বাগতম!' },
      })
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
      setFieldErrors(requestError.fieldErrors || {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow={t('স্বাগতম')}
      subtitle={t('আপনার অ্যাকাউন্টে প্রবেশ করে দাতা কমিউনিটির সঙ্গে যুক্ত থাকুন।')}
      title={t('লগ ইন')}
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {error && <p aria-live="polite" className="auth-alert" role="alert">{t(error)}</p>}
        <AuthField autoComplete="username" error={t(fieldErrors.identifier)} label={t('ইমেইল বা User ID')} name="identifier" onChange={(event) => { setIdentifier(event.target.value); setFieldErrors({}); setError('') }} placeholder="name@example.com অথবা AHB-1234567890ABCDEF" required value={identifier} />
        <div className="auth-password-field">
          <AuthField autoComplete="current-password" error={t(fieldErrors.password)} label={t('পাসওয়ার্ড')} name="password" onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); setError('') }} required type={showPassword ? 'text' : 'password'} value={password} />
          <button aria-label={showPassword ? t('পাসওয়ার্ড লুকান') : t('পাসওয়ার্ড দেখান')} className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} type="button">
            {showPassword ? t('লুকান') : t('দেখুন')}
          </button>
        </div>
        <button className="auth-submit" disabled={loading} type="submit">
          {loading ? t('লগ ইন হচ্ছে…') : t('লগ ইন করুন')}
        </button>
        <p className="auth-switch">{t('অ্যাকাউন্ট নেই?')} <Link to="/register">{t('নতুন দাতা হিসেবে নিবন্ধন করুন')}</Link></p>
      </form>
    </AuthLayout>
  )
}

export default LoginPage

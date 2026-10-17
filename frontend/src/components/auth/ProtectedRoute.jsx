import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'

function ProtectedRoute() {
  const { t } = useLanguage()
  const { error, notice, refresh, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <main className="auth-loading" aria-live="polite">{t('অ্যাকাউন্ট যাচাই হচ্ছে…')}</main>
  }
  if (status === 'error') {
    return (
      <main className="auth-loading" role="alert">
        <p>{translateErrorMessage(error, t)}</p>
        <button className="auth-submit" onClick={refresh} type="button">{t('আবার চেষ্টা করুন')}</button>
      </main>
    )
  }
  if (status !== 'authenticated') {
    return notice
      ? <Navigate replace state={{ notice }} to="/" />
      : <Navigate replace state={{ from: location }} to="/login" />
  }
  return <Outlet />
}

export default ProtectedRoute

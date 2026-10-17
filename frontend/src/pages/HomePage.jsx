import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import BloodGroups from '../components/landing/BloodGroups'
import BloodSearch from '../components/landing/BloodSearch'
import RecentDonors from '../components/landing/RecentDonors'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import ImpactStats from '../components/landing/ImpactStats'
import { scrollToSection } from '../utils/scrollToSection'
import { useLanguage } from '../contexts/useLanguage'

function HomePage() {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const { clearNotice, notice: authNotice } = useAuth()
  const notice = location.state?.notice || authNotice

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => {
      if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
      clearNotice()
    }, 6000)
    return () => window.clearTimeout(timeout)
  }, [clearNotice, location.pathname, location.state, navigate, notice])

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return undefined
    let cancelScroll = () => {}
    const frame = window.requestAnimationFrame(() => {
      cancelScroll = scrollToSection(location.hash.slice(1))
    })
    return () => {
      window.cancelAnimationFrame(frame)
      cancelScroll()
    }
  }, [location.hash, location.pathname])

  return (
    <main>
      {notice && (
        <p aria-live="polite" className="home-notice" role="status">
          {notice.startsWith('নিবন্ধন সফল হয়েছে। আপনার User ID:')
            ? t('নিবন্ধন সফল হয়েছে। আপনার User ID: {userId}', { userId: notice.slice(notice.indexOf(':') + 1).trim() })
            : t(notice)}
        </p>
      )}
      <Hero />
      <BloodSearch />
      <RecentDonors />
      <HowItWorks />
      <BloodGroups />
      <ImpactStats />
    </main>
  )
}

export default HomePage

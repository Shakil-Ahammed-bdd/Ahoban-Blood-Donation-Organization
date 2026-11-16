import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import BloodGroups from '../components/landing/BloodGroups'
import BloodSearch from '../components/landing/BloodSearch'
import RecentDonors from '../components/landing/RecentDonors'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import ImpactStats from '../components/landing/ImpactStats'
import { scrollToSection } from '../utils/scrollToSection'

function HomePage() {
  const location = useLocation()

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

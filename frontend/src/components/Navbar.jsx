import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { scrollToSection } from '../utils/scrollToSection'

const links = [
  { label: 'হোম', href: '#home' },
  { label: 'আমাদের সম্পর্কে', href: '#about' },
  { label: 'রক্ত খুঁজুন', href: '#find-blood' },
  { label: 'রক্তদাতার অনুভূতি', href: '/donor-experiences' },
  { label: 'navbar.topDonors', href: '/top-donors' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openProfileLocation, setOpenProfileLocation] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [avatarErrorUrl, setAvatarErrorUrl] = useState('')
  const profileRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { language, t, toggleLanguage } = useLanguage()
  const { logout, status, user } = useAuth()
  const authenticated = status === 'authenticated'
  const homeHref = location.pathname === '/' ? '#home' : '/#home'
  const currentLocation = `${location.pathname}${location.search}`
  const profileOpen = openProfileLocation === currentLocation
  const fullName = user?.fullName?.trim() || ''
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('')
  const profilePhotoUrl = user?.profilePhotoUrl || ''
  const avatarError = avatarErrorUrl === profilePhotoUrl

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setOpenProfileLocation('')
      }
    }

    function closeOnOutsideClick(event) {
      if (!profileRef.current?.contains(event.target)) setOpenProfileLocation('')
    }

    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [])

  function closeMenu() {
    setMenuOpen(false)
    setOpenProfileLocation('')
  }

  function handleSectionNavigation(event, hash) {
    closeMenu()
    if (location.pathname !== '/') return
    event.preventDefault()
    if (location.hash === hash) {
      scrollToSection(hash.slice(1))
      return
    }
    navigate({ pathname: '/', hash })
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      closeMenu()
      navigate('/', { replace: true, state: { notice: t('আপনি সফলভাবে লগ আউট করেছেন।') } })
    } catch (error) {
      setLogoutError(translateErrorMessage(error, t))
    }
  }

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link
          aria-label={t('আহ্বান রক্তদান সংস্থা — হোম')}
          className="brand"
          onClick={closeMenu}
          to={homeHref}
        >
          <span className="brand-mark">
            <img
              alt=""
              className="brand-logo"
              height="52"
              src="/images/ahoban-logo.png"
              width="52"
            />
          </span>
          <span className="brand-name">
            <span>{t('আহ্বান')}</span>
            <span>{t('রক্তদান সংস্থা')}</span>
          </span>
        </Link>

        <nav
          aria-label={t('প্রধান নেভিগেশন')}
          className={`primary-nav${menuOpen ? ' is-open' : ''}`}
          id="primary-navigation"
        >
          {links.map((link) => (
            link.href.startsWith('/') ? (
              <Link className="nav-link" key={link.href} onClick={closeMenu} to={link.href}>
                {t(link.label)}
              </Link>
            ) : (
              <Link
                className="nav-link"
                to={location.pathname === '/' ? link.href : `/${link.href}`}
                key={link.href}
                onClick={link.href.startsWith('#')
                  ? (event) => handleSectionNavigation(event, link.href)
                  : closeMenu}
              >
                {t(link.label)}
              </Link>
            )
          ))}
        </nav>

        <div className="nav-account">
          <button
            aria-label={language === 'bn' ? 'Switch language to English' : 'ভাষা বাংলায় পরিবর্তন করুন'}
            className="nav-language-toggle"
            onClick={toggleLanguage}
            type="button"
          >
            {language === 'bn' ? 'English' : 'বাংলা'}
          </button>
          {authenticated ? (
            <div className="nav-profile" ref={profileRef}>
              <button
                aria-controls="profile-menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="nav-profile-trigger"
                onClick={() => setOpenProfileLocation((openLocation) => (
                  openLocation === currentLocation ? '' : currentLocation
                ))}
                type="button"
              >
                <span aria-hidden="true" className="nav-avatar">
                  {profilePhotoUrl && !avatarError
                    ? <img alt="" onError={() => setAvatarErrorUrl(profilePhotoUrl)} src={profilePhotoUrl} />
                    : initials || (
                      <svg fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="3.4" />
                        <path d="M5.5 20v-1.7a6.5 6.5 0 0 1 13 0V20" />
                      </svg>
                    )}
                </span>
                <span className="nav-profile-name">{fullName}</span>
                <span aria-hidden="true" className="nav-profile-chevron">⌄</span>
              </button>
              {profileOpen && (
                <div className="profile-menu" id="profile-menu" role="menu">
                  <Link className="profile-menu-link" onClick={closeMenu} role="menuitem" to="/profile">
                    {t('প্রোফাইল')}
                  </Link>
                  <Link className="profile-menu-link" onClick={closeMenu} role="menuitem" to="/profile?edit=1">
                    {t('প্রোফাইল সম্পাদনা')}
                  </Link>
                  <button className="profile-menu-link profile-menu-logout" onClick={handleLogout} role="menuitem" type="button">
                    {t('লগ আউট')}
                  </button>
                  {logoutError && <p className="profile-menu-error" role="alert">{t(logoutError)}</p>}
                </div>
              )}
            </div>
          ) : status === 'unauthenticated' ? (
            <div className="nav-guest-actions">
              <Link className="nav-login-link" to="/login">{t('লগ ইন')}</Link>
              <Link className="nav-register-link" to="/register">{t('নিবন্ধন')}</Link>
            </div>
          ) : null}
        </div>

        <button
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t('মেনু বন্ধ করুন') : t('মেনু খুলুন')}
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}

export default Navbar

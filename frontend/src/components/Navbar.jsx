import { useEffect, useRef, useState } from 'react'
import { House, Menu, Search, UserRound, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { scrollToSection } from '../utils/scrollToSection'
import NotificationBell from './NotificationBell'

const links = [
  { label: 'হোম', href: '#home' },
  { label: 'ব্লগ', href: '/blog' },
  { label: 'রক্ত খুঁজুন', href: '#find-blood' },
  { label: 'রক্তের আবেদন', href: '/blood-requests' },
  { label: 'রক্তদাতার অনুভূতি', href: '/donor-experiences' },
  { label: 'navbar.topDonors', href: '/top-donors' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openProfileLocation, setOpenProfileLocation] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [avatarErrorUrl, setAvatarErrorUrl] = useState('')
  const [mobileViewport, setMobileViewport] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  ))
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
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const updateViewport = () => setMobileViewport(mediaQuery.matches)
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

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

    function closeOnNavigation() {
      setMenuOpen(false)
      setOpenProfileLocation('')
    }

    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('popstate', closeOnNavigation)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('popstate', closeOnNavigation)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen || !window.matchMedia('(max-width: 768px)').matches) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

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

  function handleSearchNavigation() {
    closeMenu()
    if (location.pathname === '/' && location.hash === '#find-blood') {
      scrollToSection('find-blood')
      return
    }
    navigate({ pathname: '/', hash: '#find-blood' })
  }

  const accountHref = authenticated
    ? ['admin', 'super_admin'].includes(user?.role) ? '/admin' : '/profile'
    : '/login'
  const homeActive = location.pathname === '/' && location.hash !== '#find-blood'
  const searchActive = location.pathname === '/' && location.hash === '#find-blood'
  const accountActive = ['/profile', '/admin', '/login'].includes(location.pathname)

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
    <>
      <header className="site-header" data-language={language}>
        <div className="nav-shell">
          <Link
            aria-label={t('আহ্বান রক্তদান সংস্থা — হোম')}
            className={`brand${status === 'unauthenticated' ? ' is-guest' : ''}`}
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

          <div className={`nav-account${status === 'unauthenticated' ? ' is-guest' : ''}`}>
            {authenticated && !mobileViewport && <NotificationBell />}
            <ThemeToggle className="nav-theme-toggle" />
            <button
              aria-label={language === 'bn' ? 'Switch language to English' : 'ভাষা বাংলায় পরিবর্তন করুন'}
              className="nav-language-toggle"
              onClick={toggleLanguage}
              type="button"
            >
              {language === 'bn' ? 'BN' : 'EN'}
            </button>
            {authenticated ? (
              <div className="nav-profile" ref={profileRef}>
                <button
                  aria-controls="profile-menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  aria-label={t('প্রোফাইল')}
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
                </button>
                {profileOpen && (
                  <div className="profile-menu" id="profile-menu" role="menu">
                    <Link className="profile-menu-link" onClick={closeMenu} role="menuitem" to="/profile">
                      {t('প্রোফাইল')}
                    </Link>
                    <Link className="profile-menu-link" onClick={closeMenu} role="menuitem" to="/profile?edit=1">
                      {t('প্রোফাইল সম্পাদনা')}
                    </Link>
                    {['admin', 'super_admin'].includes(user?.role) && (
                      <Link className="profile-menu-link" onClick={closeMenu} role="menuitem" to="/admin">
                        {t('অ্যাডমিন ড্যাশবোর্ড')}
                      </Link>
                    )}
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

      <nav aria-label={t('মোবাইল নেভিগেশন')} className="mobile-bottom-navigation">
        <Link
          aria-label={t('হোম')}
          aria-current={homeActive ? 'page' : undefined}
          className={`mobile-nav-item${homeActive ? ' is-active' : ''}`}
          onClick={closeMenu}
          to={homeHref}
        >
          <House aria-hidden="true" size={22} strokeWidth={2} />
        </Link>
        <button
          aria-label={t('মেনু')}
          aria-controls="mobile-menu-drawer"
          aria-expanded={menuOpen}
          className={`mobile-nav-item${menuOpen ? ' is-active' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <Menu aria-hidden="true" size={22} strokeWidth={2} />
        </button>
        {mobileViewport && (
          <div className={`mobile-nav-notification${location.pathname === '/notifications' ? ' is-active' : ''}`}>
            <NotificationBell mobile />
          </div>
        )}
        <button
          aria-label={t('রক্ত খুঁজুন')}
          aria-current={searchActive ? 'page' : undefined}
          className={`mobile-nav-item${searchActive ? ' is-active' : ''}`}
          onClick={handleSearchNavigation}
          type="button"
        >
          <Search aria-hidden="true" size={22} strokeWidth={2} />
        </button>
        <Link
          aria-label={t('অ্যাকাউন্ট')}
          aria-current={accountActive ? 'page' : undefined}
          className={`mobile-nav-item${accountActive ? ' is-active' : ''}`}
          onClick={closeMenu}
          to={accountHref}
        >
          <UserRound aria-hidden="true" size={22} strokeWidth={2} />
        </Link>
      </nav>

      {menuOpen && (
        <div className="mobile-menu-overlay">
          <button
            aria-label={t('মেনু বন্ধ করুন')}
            className="mobile-menu-backdrop"
            onClick={closeMenu}
            type="button"
          />
          <section
            aria-labelledby="mobile-menu-title"
            aria-modal="true"
            className="mobile-menu-drawer"
            id="mobile-menu-drawer"
            role="dialog"
          >
            <div className="mobile-menu-heading">
              <h2 id="mobile-menu-title">{t('মেনু')}</h2>
              <button aria-label={t('মেনু বন্ধ করুন')} className="mobile-menu-close" onClick={closeMenu} type="button">
                <X aria-hidden="true" size={21} />
              </button>
            </div>
            <nav aria-label={t('প্রধান নেভিগেশন')} className="mobile-drawer-links">
              {links.map((link) => {
                const destination = link.href.startsWith('/')
                  ? link.href
                  : location.pathname === '/' ? link.href : `/${link.href}`

                return (
                  <Link
                    className="mobile-drawer-link"
                    key={link.href}
                    onClick={link.href.startsWith('#')
                      ? (event) => handleSectionNavigation(event, link.href)
                      : closeMenu}
                    to={destination}
                  >
                    <span>{t(link.label)}</span>
                  </Link>
                )
              })}
              <Link className="mobile-drawer-link" onClick={closeMenu} to="/donors">
                {t('সব ডোনার দেখুন')}
              </Link>
              {authenticated ? (
                <>
                  <Link className="mobile-drawer-link" onClick={closeMenu} to="/notifications">
                    {t('নোটিফিকেশন')}
                  </Link>
                  <Link className="mobile-drawer-link" onClick={closeMenu} to="/profile">{t('প্রোফাইল')}</Link>
                  <Link className="mobile-drawer-link" onClick={closeMenu} to="/profile?edit=1">
                    {t('প্রোফাইল সম্পাদনা')}
                  </Link>
                  {['admin', 'super_admin'].includes(user?.role) && (
                    <Link className="mobile-drawer-link" onClick={closeMenu} to="/admin">{t('অ্যাডমিন ড্যাশবোর্ড')}</Link>
                  )}
                  <button className="mobile-drawer-link mobile-drawer-logout" onClick={handleLogout} type="button">
                    {t('লগ আউট')}
                  </button>
                </>
              ) : (
                <>
                  <Link className="mobile-drawer-link mobile-drawer-login" onClick={closeMenu} to="/login">{t('লগ ইন')}</Link>
                  <Link className="mobile-drawer-link mobile-drawer-register" onClick={closeMenu} to="/register">{t('নিবন্ধন')}</Link>
                </>
              )}
            </nav>
            {logoutError && <p className="mobile-menu-error" role="alert">{t(logoutError)}</p>}
          </section>
        </div>
      )}
    </>
  )
}

export default Navbar

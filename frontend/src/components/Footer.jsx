import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/useLanguage'

const COPYRIGHT_YEAR = new Date().getFullYear()
const HOSPITAL_ADDRESS = 'Nalua Bazar, Chairman Bari Road, Kachua 3630, Chandpur'
const HOSPITAL_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HOSPITAL_ADDRESS)}`
const HOSPITAL_LOGO = '/images/shahidullah-medical-centre.jpg'

const DEVELOPER = {
  name: 'Md. Shakil Ahammed',
  image: '/images/developer.png',
  links: [
    { label: 'GitHub', url: 'https://github.com/Shakil-Ahammed-bdd', icon: 'github' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ahammed-shakil-10268a380/?isSelfProfile=true', icon: 'linkedin' },
    { label: 'Facebook', url: 'https://www.facebook.com/md.shakil.ahammed.447079', icon: 'facebook' },
    { label: 'Portfolio', url: 'https://dev-personal-portfolio-seven.vercel.app/#', icon: 'portfolio' },
  ],
}

function MedicalIcon({ name }) {
  if (name === 'mapPin') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    )
  }

  if (name === 'mail') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M3 5.5h18v13H3zM3.5 6l8.5 7 8.5-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  if (name === 'clock') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7v5l3.5 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  if (name === 'hospital') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M9 21v-4h6v4M12 6v6m-3-3h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  if (name === 'phone') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M7 3h3l2 5-2 1.5a14 14 0 0 0 4.5 4.5L16 12l5 2v3a3 3 0 0 1-3 3C10.3 20 4 13.7 4 6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  return null
}

function SocialIcon({ name }) {
  if (name === 'github') {
    return (
      <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.3-1.24-1.65-1.24-1.65-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.79 2.46 3.08 1.72.1-.72.39-1.21.7-1.49-2.48-.28-5.08-1.24-5.08-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.56 0c2.12-1.45 3.05-1.15 3.05-1.15.61 1.53.23 2.67.11 2.95.72.78 1.15 1.78 1.15 3 0 4.29-2.6 5.24-5.09 5.51.4.35.75 1.02.75 2.06v3.3c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
      </svg>
    )
  }

  if (name === 'linkedin') {
    return (
      <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.74H4.96V9.2h2.97v9.54ZM6.45 7.9a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.3 10.84h-2.97V14.1c0-1.1-.02-2.51-1.53-2.51-1.53 0-1.77 1.2-1.77 2.43v4.72H9.51V9.2h2.85v1.3h.04c.4-.75 1.37-1.53 2.82-1.53 3.01 0 3.57 1.98 3.57 4.55v5.22Z" />
      </svg>
    )
  }

  if (name === 'facebook') {
    return (
      <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.35c0-3 1.79-4.66 4.52-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.39A12 12 0 0 0 24 12Z" />
      </svg>
    )
  }

  if (name === 'portfolio') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 12h17M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M3 5.5h18v13H3zM3.5 6l8.5 7 8.5-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M8 21h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function Footer() {
  const { t } = useLanguage()
  const [imageUnavailable, setImageUnavailable] = useState(false)

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="footer-brand">
            <Link aria-label={t('আহ্বান রক্তদান সংস্থা — হোম')} className="footer-brand-link" to="/">
              <img alt="" height="48" src="/images/ahoban-footer-logo.jpg" width="48" />
              <span className="footer-brand-copy">
                <span>{t('আহ্বান রক্তদান সংস্থা')}</span>
                <span className="footer-brand-slogan">{t('মানবতার পাশে, সবসময়')}</span>
                <span className="footer-brand-established">{t('প্রতিষ্ঠিত: ১৪-০৬-২০১৯')}</span>
              </span>
            </Link>
          </div>

          <aside aria-label={t('ওয়েবসাইট নির্মাতা')} className="footer-developer-card">
            <span className="footer-developer-avatar">
              {!imageUnavailable && (
                <img alt={t('ডেভেলপার {name}-এর প্রোফাইল ছবি', { name: DEVELOPER.name })} onError={() => setImageUnavailable(true)} src={DEVELOPER.image} />
              )}
              {imageUnavailable && <span aria-hidden="true">SA</span>}
            </span>
            <div className="footer-developer-info">
              <span className="footer-developer-kicker">{t('তৈরি করেছেন')}</span>
              <h2>{DEVELOPER.name}</h2>
              <p className="footer-developer-role">Full-Stack Developer</p>
              <p className="footer-developer-education">
                BSc in Computer Science &amp; Engineering
                <span>Northern University Bangladesh</span>
              </p>
              <p className="footer-developer-description">
                {t('প্রযুক্তির মাধ্যমে রক্তদাতা খুঁজে পাওয়া সহজ করা এবং রক্তদানের প্রক্রিয়াকে আরও কার্যকর করার লক্ষ্য নিয়ে আহ্বান রক্তদান সংস্থা তৈরি করা হয়েছে।')}
              </p>
              <nav aria-label={t('ডেভেলপারের সামাজিক লিংক')} className="footer-developer-socials">
                {DEVELOPER.links.filter(({ url }) => Boolean(url)).map(({ icon, label, url }) => (
                  <a
                    aria-label={label}
                    href={url}
                    key={label}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={label}
                  >
                    <SocialIcon name={icon} />
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <figure aria-label={t('রক্তদাতা থেকে গ্রহীতার কাছে রক্ত পৌঁছানোর চিত্র')} className="footer-donation-visual">
            <div aria-hidden="true" className="footer-person">
              <span className="footer-person-avatar">
                <svg fill="none" viewBox="0 0 40 40">
                  <circle cx="20" cy="13" r="6" />
                  <path d="M8 35c.8-8 5.1-12 12-12s11.2 4 12 12" />
                </svg>
              </span>
              <span className="footer-visual-label">{t('দাতা')}</span>
            </div>
            <div aria-hidden="true" className="footer-flow">
              <span className="footer-flow-line" />
              <span className="footer-flow-drop drop-one">♥</span>
              <span className="footer-flow-drop drop-two">♥</span>
              <span className="footer-flow-drop drop-three">♥</span>
              <span className="footer-blood-bag">
                <svg fill="none" viewBox="0 0 38 48">
                  <path d="M13 4h12v6l5 5v25a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V15l5-5V4Z" />
                  <path d="M13 4h12M12 26h14" />
                  <path className="footer-bag-blood" d="M9 29h20v11a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V29Z" />
                  <path d="M19 44v4" />
                </svg>
              </span>
            </div>
            <div aria-hidden="true" className="footer-person">
              <span className="footer-person-avatar recipient-avatar">
                <svg fill="none" viewBox="0 0 40 40">
                  <circle cx="20" cy="13" r="6" />
                  <path d="M8 35c.8-8 5.1-12 12-12s11.2 4 12 12" />
                </svg>
              </span>
              <span className="footer-visual-label">{t('গ্রহীতা')}</span>
            </div>
          </figure>

          <section aria-labelledby="footer-hospital-title" className="footer-hospital">
            <img alt="Shahidullah Medical Centre logo" className="footer-hospital-logo" src={HOSPITAL_LOGO} />
            <h2 id="footer-hospital-title">Shahidullah Medical Centre</h2>
            <ul className="footer-hospital-details">
              <li>
                <MedicalIcon name="mapPin" />
                <span>{t('ঠিকানা')}:</span>
                <a aria-label={`${t('ঠিকানা')}: ${HOSPITAL_ADDRESS}`} href={HOSPITAL_MAP_URL} rel="noopener noreferrer" target="_blank">
                  {HOSPITAL_ADDRESS}
                </a>
              </li>
              <li>
                <MedicalIcon name="phone" />
                <span>{t('ফোন')}:</span>
                <a aria-label={`${t('ফোন')}: +880 1600-660777`} href="tel:+8801600660777">+880 1600-660777</a>
              </li>
              <li>
                <MedicalIcon name="phone" />
                <span>{t('বিকল্প ফোন')}:</span>
                <a aria-label={`${t('বিকল্প ফোন')}: +880 1867-522744`} href="tel:+8801867522744">+880 1867-522744</a>
              </li>
              <li>
                <MedicalIcon name="mail" />
                <span>{t('ইমেইল')}:</span>
                <a aria-label={`${t('ইমেইল')}: info@smcdiagnostic.com`} href="mailto:info@smcdiagnostic.com">info@smcdiagnostic.com</a>
              </li>
              <li>
                <MedicalIcon name="clock" />
                <span>{t('সময়')}:</span>
                <span>{t('দিনে ২৪ ঘণ্টা, সপ্তাহে ৭ দিন')}</span>
              </li>
              <li>
                <MedicalIcon name="hospital" />
                <span>{t('সেবা')}:</span>
                <span>{t('সাধারণ চিকিৎসা, সার্জারি, ডায়াগনস্টিক পরীক্ষা, বিশেষায়িত ইমেজিং এবং নিয়মিত স্বাস্থ্য পরীক্ষা।')}</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="footer-message">
          <p className="footer-message-primary">{t('একজনের রক্ত, অন্যজনের জীবনের আশার আলো।')}</p>
          <p>{t('রক্ত দিন, জীবন বাঁচান। মানবতার পাশে দাঁড়ান।')}</p>
        </div>

        <div className="footer-bottom">
          <p>© {COPYRIGHT_YEAR} {t('আহ্বান রক্তদান সংস্থা')}. {t('সর্বস্বত্ব সংরক্ষিত।')}</p>
          <span>{t('স্বেচ্ছায় রক্তদান, মানবতার বন্ধন')}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
import HeroIllustration from './HeroIllustration'
import { Link } from 'react-router-dom'
import LiveImpact from './LiveImpact'
import { useLanguage } from '../../contexts/useLanguage'

function Hero() {
  const { t } = useLanguage()
  return (
    <section aria-labelledby="hero-title" className="hero-section" id="home">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span aria-hidden="true" className="eyebrow-mark">♥</span>
            {t('স্বেচ্ছায় রক্তদান, মানবতার বন্ধন')}
          </div>
          <h1 id="hero-title">
            {t('রক্ত দিন,')}
            <br />
            <span>{t('জীবন বাঁচান')}</span>
          </h1>
          <p className="hero-description">
            {t('আপনার এক ব্যাগ রক্ত হতে পারে একজন মানুষের নতুন জীবনের আশার আলো। আসুন, স্বেচ্ছায় রক্তদান করি এবং মানুষের পাশে দাঁড়াই।')}
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/register">
              {t('রক্ত দান করুন')} <span aria-hidden="true">↗</span>
            </a>
            <a className="button button-secondary" href="#recent-donors">
              <span aria-hidden="true" className="button-heart">＋</span>
              {t('রক্ত প্রয়োজন?')}
            </a>
            <Link className="button button-secondary" to="/donor-experiences">
              {t('রক্তদাতার অনুভূতি')}
            </Link>
          </div>
          <div className="hero-note">
            <span aria-hidden="true" className="note-line" />
            <span>{t('আহ্বান রক্তদান সংস্থা')}</span>
            <span aria-hidden="true" className="note-dot" />
            <span>{t('মানবতার পাশে, সবসময়')}</span>
          </div>
        </div>

        <HeroIllustration />
      </div>
      <LiveImpact />
      <div aria-hidden="true" className="hero-bottom-rule" />
    </section>
  )
}

export default Hero

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DonorCard from './DonorCard'
import Reveal from '../shared/Reveal'
import { donorApi } from '../../services/api/donorApi'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'

function fetchRecentDonors() {
  return donorApi.list({ sort: 'recent', availability: 'all', page: 1, limit: 6 })
}

function RecentDonors() {
  const { t } = useLanguage()
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDonors = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchRecentDonors()
      setDonors(result.donors)
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    let active = true
    fetchRecentDonors().then(
      (result) => {
        if (active) setDonors(result.donors)
      },
      (requestError) => {
        if (active) setError(translateErrorMessage(requestError, t))
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [t])

  return (
    <section aria-labelledby="recent-donors-title" className="section recent-donors-section" id="recent-donors">
      <div className="section-container">
        <Reveal>
          <div className="recent-donors-heading">
            <div className="recent-donors-title">
              <span aria-hidden="true" className="recent-donors-icon">
                <svg fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.3" />
                  <path d="M5.5 20v-1.7a6.5 6.5 0 0 1 13 0V20" />
                </svg>
              </span>
              <div>
                <span className="section-kicker">{t('আমাদের দাতা')}</span>
                <h2 id="recent-donors-title">{t('সাম্প্রতিক নিবন্ধিত')} <span>{t('রক্তদাতা')}</span></h2>
                <p>{t('যারা স্বেচ্ছায় নিজেদের দাতা প্রোফাইল প্রকাশে সম্মতি দিয়েছেন।')}</p>
              </div>
            </div>
            <Link className="button button-secondary recent-view-all" to="/donors">
              {t('সব ডোনার দেখুন')} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </Reveal>

        {loading && (
          <div aria-busy="true" aria-label={t('সাম্প্রতিক দাতা লোড হচ্ছে')} className="recent-donors-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="donor-card donor-card-skeleton" key={index}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="donor-directory-state" role="alert">
            <p>{t('সাম্প্রতিক দাতাদের তথ্য এখন লোড করা যাচ্ছে না।')} {t(error)}</p>
            <button className="button button-secondary" onClick={() => void loadDonors()} type="button">
              {t('আবার চেষ্টা করুন')}
            </button>
          </div>
        )}

        {!loading && !error && donors.length === 0 && (
          <div className="donor-directory-state" role="status">
            <p>{t('এখনো কোনো দাতা পাবলিক প্রোফাইল প্রকাশে সম্মতি দেননি।')}</p>
            <Link className="button button-primary" to="/register">{t('দাতা হিসেবে যুক্ত হোন')}</Link>
          </div>
        )}

        {!loading && !error && donors.length > 0 && (
          <div aria-live="polite" className="recent-donors-grid">
            {donors.map((donor) => <DonorCard donor={donor} key={donor.id} />)}
          </div>
        )}

        <div className="recent-donors-footer">
          <Link className="button button-secondary" to="/donors">
            {t('আরও দেখুন')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default RecentDonors

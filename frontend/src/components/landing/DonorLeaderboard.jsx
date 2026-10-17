import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'
import { leaderboardApi } from '../../services/api/leaderboardApi'

const RANK_CATEGORIES = {
  1: { label: 'গোল্ড', medal: '🥇', className: 'gold' },
  2: { label: 'সিলভার', medal: '🥈', className: 'silver' },
  3: { label: 'ব্রোঞ্জ', medal: '🥉', className: 'bronze' },
}

function DonorIdentity({ donor }) {
  const { t } = useLanguage()
  const profileUrl = `/donors/${encodeURIComponent(donor.id)}`

  return (
    <Link
      aria-label={t('পাবলিক প্রোফাইল: {name}', { name: donor.fullName })}
      className="top-donor-identity"
      to={profileUrl}
    >
      <span aria-hidden="true" className="top-donor-avatar">
        {donor.profilePhotoUrl
          ? <img alt="" src={donor.profilePhotoUrl} />
          : (
            <svg fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5.5 20v-1.7a6.5 6.5 0 0 1 13 0V20" />
            </svg>
          )}
      </span>
      <span className="top-donor-name">{donor.fullName}</span>
    </Link>
  )
}

function DonorLeaderboard() {
  const { t } = useLanguage()
  const [state, setState] = useState({ donors: [], loading: true, error: '' })

  useEffect(() => {
    let active = true
    leaderboardApi.donors().then(
      ({ donors }) => {
        if (active) setState({ donors, loading: false, error: '' })
      },
      (error) => {
        if (active) setState({ donors: [], loading: false, error: translateErrorMessage(error, t) })
      },
    )
    return () => { active = false }
  }, [t])

  return (
    <section aria-labelledby="donor-leaderboard-title" className="section leaderboard-section top-donors-section">
      <div className="section-container">
        <header className="leaderboard-heading">
          <span aria-hidden="true" className="leaderboard-heading-icon">🏆</span>
          <div>
            <h1 id="donor-leaderboard-title">{t('page.topDonors')}</h1>
          </div>
        </header>

        {state.loading && (
          <div aria-busy="true" aria-label={t('সেরা রক্তদাতাদের তালিকা লোড হচ্ছে')} className="top-donors-loading">
            {Array.from({ length: 3 }, (_, index) => <span key={index} />)}
          </div>
        )}

        {!state.loading && state.error && (
          <div className="top-donors-state" role="alert">
            <p>{t('সেরা রক্তদাতাদের তালিকা এখন লোড করা যাচ্ছে না।')} {t(state.error)}</p>
          </div>
        )}

        {!state.loading && !state.error && state.donors.length === 0 && (
          <div className="top-donors-state" role="status">
            {t('এখনও কোনো রক্তদাতা leaderboard-এ নেই।')}
          </div>
        )}

        {!state.loading && !state.error && state.donors.length > 0 && (
          <div className="top-donors-grid">
            {state.donors.map((donor, index) => {
              const rank = index + 1
              const category = RANK_CATEGORIES[rank]
              return (
                <article
                  className={`top-donor-card${category ? ` rank-${category.className}` : ''}`}
                  key={donor.id}
                >
                  <div className="top-donor-rank">
                    <span className="top-donor-rank-number">{rank}</span>
                    {category && (
                      <span className={`top-donor-rank-category category-${category.className}`}>
                        <span aria-hidden="true">{category.medal}</span>
                        {t(category.label)}
                      </span>
                    )}
                  </div>
                  <DonorIdentity donor={donor} />
                  <strong className="top-donor-total">
                    {donor.totalLifetimeDonations.toLocaleString()}
                    <span>{t('মোট রক্তদান')}</span>
                  </strong>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default DonorLeaderboard

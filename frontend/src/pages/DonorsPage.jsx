import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DonorCard from '../components/landing/DonorCard'
import { donorApi } from '../services/api/donorApi'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'

function fetchDonorPage(requestedPage) {
  return donorApi.list({
    sort: 'recent',
    availability: 'all',
    page: requestedPage,
    limit: 12,
  })
}

function DonorsPage() {
  const { t } = useLanguage()
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPage = useCallback(async (requestedPage) => {
    setPage(requestedPage)
    setLoading(true)
    setError('')
    try {
      const response = await fetchDonorPage(requestedPage)
      setResult(response)
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    let active = true
    fetchDonorPage(1).then(
      (response) => {
        if (active) setResult(response)
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
    <main className="donor-directory-page">
      <section aria-labelledby="donor-directory-title" className="section donor-directory-section">
        <div className="section-container">
          <Link className="donor-directory-back" to="/">{t('← মূল পাতায় ফিরুন')}</Link>
          <header className="donor-directory-heading">
            <span className="section-kicker">{t('আহ্বান রক্তদান সংস্থা')}</span>
            <h1 id="donor-directory-title">{t('আমাদের')} <span>{t('রক্তদাতা')}</span></h1>
            <p>{t('সর্বশেষ নিবন্ধিত সম্মত দাতারা আগে। যোগাযোগের তথ্য কেবল আলাদাভাবে সম্মতি দেওয়া দাতাদের জন্য দেখানো হয়।')}</p>
          </header>

          {loading && (
            <div aria-busy="true" className="recent-donors-grid">
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
              <p>{t('দাতাদের তথ্য লোড করা যায়নি।')} {error}</p>
              <button className="button button-secondary" onClick={() => void loadPage(page)} type="button">
                {t('আবার চেষ্টা করুন')}
              </button>
            </div>
          )}
          {!loading && !error && result?.donors.length === 0 && (
            <p className="donor-directory-state" role="status">{t('এখনো কোনো দাতা পাবলিক প্রোফাইল প্রকাশে সম্মতি দেননি।')}</p>
          )}
          {!loading && !error && result?.donors.length > 0 && (
            <>
              <div aria-live="polite" className="recent-donors-grid">
                {result.donors.map((donor) => <DonorCard donor={donor} key={donor.id} />)}
              </div>
              {result.pagination.pages > 1 && (
                <nav aria-label={t('দাতা তালিকার পৃষ্ঠা')} className="donor-pagination">
                  <button disabled={page <= 1 || loading} onClick={() => void loadPage(page - 1)} type="button">{t('আগের পৃষ্ঠা')}</button>
                  <span>{t('পৃষ্ঠা')} {page} / {result.pagination.pages} · {t('মোট')} {result.pagination.total} {t('জন')}</span>
                  <button disabled={page >= result.pagination.pages || loading} onClick={() => void loadPage(page + 1)} type="button">{t('পরের পৃষ্ঠা')}</button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default DonorsPage

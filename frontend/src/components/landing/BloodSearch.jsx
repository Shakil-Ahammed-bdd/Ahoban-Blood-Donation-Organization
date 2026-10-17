import { useState } from 'react'
import DonorCard from './DonorCard'
import Reveal from '../shared/Reveal'
import SectionHeading from '../shared/SectionHeading'
import { donorApi } from '../../services/api/donorApi'
import { bangladeshDivisions, bangladeshLocations } from '../../utils/bangladeshLocations'
import bangladeshUpazilas from '../../utils/bangladeshUpazilas'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function BloodSearch() {
  const { t } = useLanguage()
  const [bloodGroup, setBloodGroup] = useState('')
  const [division, setDivision] = useState('')
  const [district, setDistrict] = useState('')
  const [upazila, setUpazila] = useState('')
  const [location, setLocation] = useState('')
  const [availability, setAvailability] = useState('available')
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function searchDonors(nextPage = 1, event) {
    event?.preventDefault()
    setLoading(true)
    setError('')
    setPage(nextPage)
    try {
      const response = await donorApi.list({
        bloodGroup,
        division,
        district,
        upazila,
        location: location.trim(),
        availability,
        page: nextPage,
        limit: 6,
      })
      setResult(response)
    } catch (requestError) {
      setError(translateErrorMessage(requestError, t))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    void searchDonors(1)
  }

  return (
    <section aria-labelledby="blood-search-title" className="section search-section" id="find-blood">
      <div className="section-container">
        <Reveal>
          <SectionHeading
            description={t('রক্তের গ্রুপ ও অবস্থান নির্বাচন করে আপনার অনুসন্ধান শুরু করুন।')}
            highlight={t('খুঁজে নিন')}
            id="blood-search-title"
            kicker={t('রক্ত খুঁজুন')}
            title={t('আপনার প্রয়োজনের রক্ত')}
          />
        </Reveal>

        <Reveal className="search-panel" delay={100}>
          <div className="search-panel-top">
            <div className="search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16 16 4.2 4.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <h3>{t('রক্তদাতা খুঁজুন')}</h3>
              <p>{t('আপনার এলাকার জন্য প্রয়োজনীয় তথ্য দিন')}</p>
            </div>
          </div>

          <form className="search-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>{t('রক্তের গ্রুপ')}</span>
              <select aria-label={t('রক্তের গ্রুপ')} onChange={(event) => setBloodGroup(event.target.value)} value={bloodGroup}>
                <option value="">{t('সব গ্রুপ')}</option>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>{t('বিভাগ')}</span>
              <select
                aria-label={t('বিভাগ')}
                onChange={(event) => {
                  setDivision(event.target.value)
                  setDistrict('')
                  setUpazila('')
                }}
                value={division}
              >
                <option value="">{t('সব বিভাগ')}</option>
                {bangladeshDivisions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>{t('জেলা')}</span>
              <select
                aria-label={t('জেলা')}
                disabled={!division}
                onChange={(event) => {
                  setDistrict(event.target.value)
                  setUpazila('')
                }}
                value={district}
              >
                <option value="">{division ? t('জেলা নির্বাচন করুন') : t('আগে বিভাগ নির্বাচন করুন')}</option>
                {(bangladeshLocations[division] || []).map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>{t('উপজেলা')}</span>
              <select
                aria-label={t('উপজেলা')}
                disabled={!district}
                onChange={(event) => setUpazila(event.target.value)}
                value={upazila}
              >
                <option value="">{district ? t('সব উপজেলা') : t('আগে জেলা নির্বাচন করুন')}</option>
                {(bangladeshUpazilas[district] || []).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="form-field location-field">
              <span>{t('এলাকা / অবস্থান')}</span>
              <input
                autoComplete="address-level3"
                maxLength={80}
                name="location"
                placeholder={t('যেমন: ধানমন্ডি, ঢাকা')}
                onChange={(event) => setLocation(event.target.value)}
                type="search"
                value={location}
              />
            </label>
            <label className="form-field">
              <span>{t('দাতার অবস্থা')}</span>
              <select onChange={(event) => setAvailability(event.target.value)} value={availability}>
                <option value="available">{t('শুধু প্রস্তুত দাতা')}</option>
                <option value="unavailable">{t('এই মুহূর্তে প্রস্তুত নন')}</option>
                <option value="all">{t('সব সম্মত দাতা')}</option>
              </select>
            </label>

            <button className="button button-primary search-submit" disabled={loading} type="submit">
              <span aria-hidden="true" className="search-submit-icon">⌕</span>
              {loading ? t('খোঁজা হচ্ছে…') : t('রক্ত খুঁজুন')}
            </button>
          </form>

          {error && <p aria-live="polite" className="search-note has-error" role="alert">{t(error)}</p>}
          {!result && !error && (
            <p aria-live="polite" className="search-note">
              {t('শুধু অনুসন্ধানে সম্মতি দেওয়া প্রকৃত দাতাদের দেখানো হয়। দাতা আলাদাভাবে সম্মতি দিলেই তাঁর ফোন ও দেওয়া WhatsApp নম্বর দেখানো হবে; ইমেইল ও নির্ভুল অবস্থান সবসময় গোপন থাকে।')}
            </p>
          )}
          {result && (
            <div aria-live="polite" className="donor-results" aria-busy={loading}>
              <div className="donor-results-heading">
                <h3>{t('অনুসন্ধানের ফলাফল')}</h3>
                <p>{result.pagination.total} {t('জন সম্মত দাতা পাওয়া গেছে')}</p>
              </div>
              {result.donors.length ? (
                <>
                  <div className="donor-results-grid">
                    {result.donors.map((donor) => <DonorCard donor={donor} key={donor.id} />)}
                  </div>
                  {result.pagination.pages > 1 && (
                    <nav aria-label={t('দাতা ফলাফলের পৃষ্ঠা')} className="donor-pagination">
                      <button disabled={page <= 1 || loading} onClick={() => void searchDonors(page - 1)} type="button">{t('আগের পৃষ্ঠা')}</button>
                      <span>{t('পৃষ্ঠা')} {page} / {result.pagination.pages}</span>
                      <button disabled={page >= result.pagination.pages || loading} onClick={() => void searchDonors(page + 1)} type="button">{t('পরের পৃষ্ঠা')}</button>
                    </nav>
                  )}
                </>
              ) : (
                <p className="donor-empty">{t('এই ফিল্টারে কোনো সম্মত দাতা পাওয়া যায়নি। এলাকা বা রক্তের গ্রুপ পরিবর্তন করে আবার চেষ্টা করুন।')}</p>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

export default BloodSearch

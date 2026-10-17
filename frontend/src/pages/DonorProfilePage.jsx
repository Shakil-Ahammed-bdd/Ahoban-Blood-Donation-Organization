import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DonorExperienceCard from '../components/landing/DonorExperienceCard'
import DonorContactActions from '../components/landing/DonorContactActions'
import { donorApi } from '../services/api/donorApi'
import { formatDonationDate } from '../utils/formatDonationDate'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'

function DonorProfilePage() {
  const { t, language } = useLanguage()
  const { id } = useParams()
  const [state, setState] = useState({ id: null, donor: null, loading: true, error: '' })
  const [postsState, setPostsState] = useState({ id: null, posts: [], loading: true, error: '' })

  useEffect(() => {
    let active = true
    donorApi.get(id).then(
      ({ user: profile }) => {
        if (active) setState({ id, donor: profile, loading: false, error: '' })
      },
      (requestError) => {
        if (active) setState({ id, donor: null, loading: false, error: translateErrorMessage(requestError, t) })
      },
    )
    return () => { active = false }
  }, [id, t])

  useEffect(() => {
    let active = true
    donorApi.experiences(id).then(
      ({ experiences: posts }) => {
        if (active) setPostsState({ id, posts, loading: false, error: '' })
      },
      (requestError) => {
        if (active) setPostsState({ id, posts: [], loading: false, error: translateErrorMessage(requestError, t) })
      },
    )
    return () => { active = false }
  }, [id, t])

  const current = state.id === id
  const donor = current ? state.donor : null
  const loading = !current || state.loading
  const error = current ? state.error : ''
  const registeredAt = donor?.createdAt
    ? new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', { dateStyle: 'medium' }).format(new Date(donor.createdAt))
    : null

  return (
    <main className="donor-directory-page">
      <section aria-labelledby="public-donor-profile-title" className="section donor-directory-section">
        <div className="section-container">
          <Link className="donor-directory-back" to="/donors">{t('← সব ডোনার')}</Link>
          {loading && <p className="donor-directory-state" role="status">{t('প্রোফাইল লোড হচ্ছে…')}</p>}
          {!loading && error && (
            <div className="donor-directory-state" role="alert">
              <p>{t('এই দাতার পাবলিক প্রোফাইলটি পাওয়া যায়নি অথবা দৃশ্যমান নয়।')}</p>
              <Link className="button button-secondary" to="/donors">{t('ডোনার তালিকায় ফিরুন')}</Link>
            </div>
          )}
          {!loading && donor && (
            <article className="public-donor-profile">
              <header className="public-donor-profile-heading">
                <span aria-hidden="true" className="donor-avatar">
                  {donor.profilePhotoUrl
                    ? <img alt="" src={donor.profilePhotoUrl} />
                    : donor.fullName.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('')}
                </span>
                <div>
                  <span className="section-kicker">
                    {donor.limitedPublicProfile ? t('কমিউনিটি সদস্য') : t('পাবলিক দাতা প্রোফাইল')}
                  </span>
                  <h1 id="public-donor-profile-title">{donor.fullName}</h1>
                  {!donor.limitedPublicProfile && <p>User ID: {donor.userId}</p>}
                  {!donor.limitedPublicProfile && donor.donorBadge && (
                    <span className={`donor-badge-compact badge-${donor.donorBadge.badgeLevel}`}>
                      <span aria-hidden="true">
                        {{ none: '🩸', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '🏆' }[donor.donorBadge.badgeLevel] || '🩸'}
                      </span>
                      {t(donor.donorBadge.badge)} · {donor.donorBadge.totalDonations} {t(donor.donorBadge.totalDonations === 1 ? 'donation' : 'donations')}
                    </span>
                  )}
                  {!donor.limitedPublicProfile && (
                    <span className={`donor-availability${donor.isAvailableToDonate ? ' is-available' : ''}`}>
                      <span aria-hidden="true" className="donor-status-dot" />
                      {donor.isAvailableToDonate ? t('রক্তদানে প্রস্তুত') : t('এই মুহূর্তে প্রস্তুত নন')}
                    </span>
                  )}
                </div>
              </header>
              {!donor.limitedPublicProfile && (
                <>
                  <div aria-label={`রক্তের গ্রুপ ${donor.bloodGroup}`} className="donor-group-banner">
                    <strong>{donor.bloodGroup}</strong>
                    <span>{t('রক্তের গ্রুপ')}</span>
                  </div>
                  <dl className="donor-card-details">
                    <div><dt>{t('বিভাগ')}</dt><dd>{donor.division}</dd></div>
                    <div><dt>{t('জেলা')}</dt><dd>{donor.district}</dd></div>
                    <div><dt>{t('উপজেলা')}</dt><dd>{donor.upazila || t('উল্লেখ করা হয়নি')}</dd></div>
                    <div><dt>{t('এলাকা / অবস্থান')}</dt><dd>{donor.location}</dd></div>
                    <div><dt>{t('সর্বশেষ রক্তদান')}</dt><dd>{formatDonationDate(donor.lastDonationDate, language)}</dd></div>
                    <div><dt>{t('পূর্ববর্তী রক্তদান')}</dt><dd>{donor.previousBloodDonations ?? 0}</dd></div>
                    {registeredAt && <div><dt>{t('নিবন্ধনের তারিখ')}</dt><dd>{registeredAt}</dd></div>}
                  </dl>
                  {donor.phone && <DonorContactActions phone={donor.phone} whatsappNumber={donor.whatsappNumber} />}
                </>
              )}
              <p className="public-donor-privacy">
                {donor.limitedPublicProfile
                  ? t('এই সদস্য মন্তব্যে নিজের নাম ও ছবি প্রকাশ করেছেন; অতিরিক্ত প্রোফাইল তথ্য ব্যক্তিগত রাখা হয়েছে।')
                  : donor.phone
                    ? t('এই দাতা প্রোফাইল ও যোগাযোগ প্রকাশে সম্মতি দিয়েছেন। ফোন ও ঐচ্ছিক WhatsApp যোগাযোগ দেখানো হয়; ইমেইল ও নির্ভুল স্থানাঙ্ক গোপন থাকে।')
                    : t('এই দাতা প্রোফাইল প্রকাশে সম্মতি দিয়েছেন, তবে যোগাযোগের তথ্য ব্যক্তিগত রেখেছেন। ইমেইল ও নির্ভুল স্থানাঙ্ক সবসময় গোপন থাকে।')}
              </p>
            </article>
          )}
          {!loading && donor && (
            <section aria-labelledby="public-donor-experiences-title" className="public-donor-experiences">
              <header className="profile-experiences-heading">
                <div>
                  <span className="section-kicker">{t('রক্তদানের গল্প')}</span>
                  <h2 id="public-donor-experiences-title">{t('আমার অনুভূতি')}</h2>
                </div>
                <Link className="button button-secondary" to="/donor-experiences">{t('সব অনুভূতি')}</Link>
              </header>
              {postsState.id !== id || postsState.loading ? (
                <p className="experience-state" role="status">{t('দাতার পোস্ট লোড হচ্ছে…')}</p>
              ) : postsState.error ? (
                <p className="experience-state" role="alert">{t('দাতার পোস্ট এখন লোড করা যাচ্ছে না।')}</p>
              ) : postsState.posts.length === 0 ? (
                <p className="experience-state" role="status">{t('এই দাতার কোনো প্রকাশিত অনুভূতি নেই।')}</p>
              ) : (
                <div className="experience-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {postsState.posts.map((experience) => (
                    <DonorExperienceCard
                      experience={experience}
                      key={`${experience.id}:${experience.updatedAt}:${experience.reactionCount}:${experience.commentCount}:${experience.currentReaction}`}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  )
}

export default DonorProfilePage

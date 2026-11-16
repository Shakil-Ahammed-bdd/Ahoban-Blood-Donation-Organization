import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Copy, Link2, MessageCircle, Share2, Smartphone } from 'lucide-react'
import DonorExperienceCard from '../components/landing/DonorExperienceCard'
import DonorContactActions from '../components/landing/DonorContactActions'
import { donorApi } from '../services/api/donorApi'
import { responsiveImageProps } from '../utils/responsiveImage'
import { formatDonationDate } from '../utils/formatDonationDate'
import { useLanguage } from '../contexts/useLanguage'
import { translateErrorMessage } from '../contexts/translationUtils'
import { subscribeToDonorDataChanges } from '../services/donorDataEvents'
import { notifyMutationFailure, notifyUserNotification } from '../services/notificationEvents'

function DonorProfilePage() {
  const { t, language } = useLanguage()
  const { id } = useParams()
  const [failedPhotoUrl, setFailedPhotoUrl] = useState('')
  const [shareOptions, setShareOptions] = useState({ id: '', open: false })
  const [donorDataRevision, setDonorDataRevision] = useState(0)
  const [state, setState] = useState({ id: null, donor: null, loading: true, error: '' })
  const [postsState, setPostsState] = useState({ id: null, posts: [], loading: true, error: '' })

  useEffect(() => subscribeToDonorDataChanges(() => {
    setDonorDataRevision((revision) => revision + 1)
  }), [])

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
  }, [donorDataRevision, id, t])

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
  const profileUrl = typeof window === 'undefined'
    ? ''
    : new URL(`/donors/${encodeURIComponent(id || '')}`, window.location.origin).href
  const shareMessage = donor
    ? t('আহ্বান রক্তদান সংস্থার রক্তদাতা {name}-এর প্রোফাইল দেখুন।', { name: donor.fullName })
    : ''
  const shareDescription = donor
    ? [
        t('আহ্বান রক্তদান সংস্থার রক্তদাতা {name}-এর প্রোফাইল দেখুন।', { name: donor.fullName }),
        !donor.limitedPublicProfile && donor.bloodGroup
          ? `${t('রক্তের গ্রুপ')}: ${donor.bloodGroup}`
          : '',
        !donor.limitedPublicProfile && donor.location ? donor.location : '',
      ].filter(Boolean).join(' · ')
    : ''

  const shareOptionsOpen = shareOptions.id === id && shareOptions.open
  const nativeShareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!donor || !profileUrl) return undefined

    const title = `${donor.fullName} | ${t('আহ্বান রক্তদান সংস্থা')}`
    document.title = title
    const description = shareDescription
    const image = donor.profilePhotoUrl || new URL('/images/ahoban-logo.png', window.location.origin).href
    const canonicalUrl = profileUrl
    const setMeta = (attribute, key, content) => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.append(element)
      }
      element.content = content
    }

    setMeta('name', 'description', description)
    setMeta('property', 'og:type', 'profile')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', image)
    setMeta('property', 'og:image:alt', t('দাতা {name}-এর প্রোফাইল ছবি', { name: donor.fullName }))
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = canonicalUrl

    return () => {
      document.title = language === 'bn'
        ? 'আহ্বান রক্তদান সংস্থা | রক্ত দিন, জীবন বাঁচান'
        : 'Ahoban Blood Donation Organization | Donate Blood, Save Lives'
      document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        language === 'bn'
          ? 'আহ্বান রক্তদান সংস্থা — স্বেচ্ছায় রক্তদান, মানবতার বন্ধন।'
          : 'Ahoban Blood Donation Organization — voluntary blood donation, a bond of humanity.',
      )
      setMeta('property', 'og:type', 'website')
      setMeta('property', 'og:title', language === 'bn'
        ? 'আহ্বান রক্তদান সংস্থা | রক্ত দিন, জীবন বাঁচান'
        : 'Ahoban Blood Donation Organization | Donate Blood, Save Lives')
      setMeta('property', 'og:description', language === 'bn'
        ? 'আহ্বান রক্তদান সংস্থা — স্বেচ্ছায় রক্তদান, মানবতার বন্ধন।'
        : 'Ahoban Blood Donation Organization — voluntary blood donation, a bond of humanity.')
      setMeta('property', 'og:image', new URL('/images/ahoban-logo.png', window.location.origin).href)
      setMeta('property', 'og:image:alt', language === 'bn' ? 'আহ্বান রক্তদান সংস্থার লোগো' : 'Ahoban Blood Donation Organization logo')
      setMeta('property', 'og:url', window.location.origin)
      setMeta('name', 'twitter:card', 'summary_large_image')
      setMeta('name', 'twitter:title', language === 'bn'
        ? 'আহ্বান রক্তদান সংস্থা | রক্ত দিন, জীবন বাঁচান'
        : 'Ahoban Blood Donation Organization | Donate Blood, Save Lives')
      setMeta('name', 'twitter:description', language === 'bn'
        ? 'আহ্বান রক্তদান সংস্থা — স্বেচ্ছায় রক্তদান, মানবতার বন্ধন।'
        : 'Ahoban Blood Donation Organization — voluntary blood donation, a bond of humanity.')
      setMeta('name', 'twitter:image', new URL('/images/ahoban-logo.png', window.location.origin).href)
      document.head.querySelector('link[rel="canonical"]')?.remove()
    }
  }, [donor, language, profileUrl, shareDescription, t])

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      notifyUserNotification({
        type: 'success',
        title: 'সফল',
        message: 'দাতার প্রোফাইল লিংক কপি হয়েছে।',
      })
    } catch {
      notifyMutationFailure('প্রোফাইল লিংক কপি করা যায়নি। ব্রাউজারের clipboard permission যাচাই করে আবার চেষ্টা করুন।')
    }
  }

  async function shareNatively() {
    if (!navigator.share) return
    try {
      await navigator.share({ title: donor.fullName, text: shareMessage, url: profileUrl })
    } catch (error) {
      if (error.name !== 'AbortError') {
        notifyMutationFailure('প্রোফাইলটি শেয়ার করা যায়নি। আবার চেষ্টা করুন।')
      }
    }
  }

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}&quote=${encodeURIComponent(shareMessage)}`
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${profileUrl}`)}`
  const messengerShareUrl = `https://www.facebook.com/dialog/send?app_id=274266067164&link=${encodeURIComponent(profileUrl)}&redirect_uri=${encodeURIComponent(profileUrl)}`

  function shareViaMessenger() {
    if (typeof window === 'undefined') return
    const appUrl = `fb-messenger://share/?link=${encodeURIComponent(profileUrl)}`
    const fallbackUrl = messengerShareUrl
    try {
      const popup = window.open(appUrl, '_blank', 'noopener,noreferrer,width=600,height=520')
      if (!popup) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer,width=600,height=520')
        return
      }
      popup.opener = null
    } catch {
      try {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer,width=600,height=520')
      } catch {
        notifyMutationFailure('Messenger শেয়ার করার জন্য ব্রাউজার থেকে লিঙ্কটি খুলতে ব্যর্থ হয়েছে।')
      }
    }
  }

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
                <span aria-hidden="true" className="donor-avatar public-donor-avatar">
                  {donor.profilePhotoUrl && failedPhotoUrl !== donor.profilePhotoUrl
                    ? <img alt="" decoding="async" loading="lazy" onError={() => setFailedPhotoUrl(donor.profilePhotoUrl)} {...responsiveImageProps(donor.profilePhotoUrl, [128, 256, 512], '(max-width: 700px) 96px, 128px')} />
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
              <div className="public-donor-share">
                <button
                  aria-expanded={shareOptionsOpen}
                  className="public-donor-share-trigger"
                  onClick={() => setShareOptions({ id, open: !shareOptionsOpen })}
                  type="button"
                >
                  <Share2 aria-hidden="true" size={18} />
                  {t('প্রোফাইল শেয়ার করুন')}
                </button>
                {shareOptionsOpen && (
                  <div aria-label={t('শেয়ার করার মাধ্যম')} className="public-donor-share-options">
                    <a
                      className="public-donor-share-option"
                      href={facebookShareUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Share2 aria-hidden="true" size={17} />
                      Facebook
                    </a>
                    <a
                      className="public-donor-share-option"
                      href={whatsappShareUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <MessageCircle aria-hidden="true" size={17} />
                      WhatsApp
                    </a>
                    <button className="public-donor-share-option" onClick={shareViaMessenger} type="button">
                      <MessageCircle aria-hidden="true" size={17} />
                      Messenger
                    </button>
                    {nativeShareAvailable && (
                      <button className="public-donor-share-option" onClick={shareNatively} type="button">
                        <Smartphone aria-hidden="true" size={17} />
                        {t('ডিভাইসের মাধ্যমে শেয়ার করুন')}
                      </button>
                    )}
                    <button className="public-donor-share-option" onClick={copyProfileLink} type="button">
                      <Copy aria-hidden="true" size={17} />
                      {t('প্রোফাইল লিংক কপি করুন')}
                    </button>
                    <span className="public-donor-share-url">
                      <Link2 aria-hidden="true" size={15} />
                      {profileUrl}
                    </span>
                  </div>
                )}
              </div>
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
                    <div><dt>{t('মোট রক্তদান')}</dt><dd>{donor.donorBadge?.totalDonations ?? donor.previousBloodDonations ?? 0}</dd></div>
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

import { Link } from 'react-router-dom'
import DonorContactActions from './DonorContactActions'
import { formatDonationDate } from '../../utils/formatDonationDate'
import { useLanguage } from '../../contexts/useLanguage'
import { responsiveImageProps } from '../../utils/responsiveImage'

function DonorCard({ donor }) {
  const { t, language } = useLanguage()
  const initials = donor.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
  const registeredAt = donor.createdAt
    ? new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', { dateStyle: 'medium' }).format(new Date(donor.createdAt))
    : null

  return (
    <article className="donor-card registered-donor-card">
      <div className="donor-card-layout">
        <div aria-hidden="true" className="donor-photo-frame">
          {donor.profilePhotoUrl
            ? <img alt="" className="donor-photo" decoding="async" loading="lazy" {...responsiveImageProps(donor.profilePhotoUrl, [96, 192, 320], '(max-width: 700px) 76px, 82px')} />
            : <span className="donor-photo-fallback">{initials}</span>}
        </div>
        <div className="donor-card-header-content">
          <div className="donor-card-identity">
            <h3>{donor.fullName}</h3>
          </div>
          <div className="donor-card-badges">
            {donor.donorBadge && (
              <span className={`donor-badge-compact badge-${donor.donorBadge.badgeLevel}`}>
                <span aria-hidden="true">{BADGE_ICONS[donor.donorBadge.badgeLevel] || BADGE_ICONS.none}</span>
                {t(donor.donorBadge.badge)}
              </span>
            )}
            <span className={`donor-availability${donor.isAvailableToDonate ? ' is-available' : ''}`}>
              <span aria-hidden="true" className="donor-status-dot" />
              {donor.isAvailableToDonate ? t('রক্তদানে প্রস্তুত') : t('এই মুহূর্তে প্রস্তুত নন')}
            </span>
          </div>
        </div>
      </div>
      <div className="donor-card-content">
        <div aria-label={`${t('রক্তের গ্রুপ')} ${donor.bloodGroup}`} className="donor-group-banner">
          <strong>{donor.bloodGroup}</strong>
          <span>{t('রক্তের গ্রুপ')}</span>
        </div>
        <dl className="donor-card-details">
          <div>
            <DonorDetailIcon name="location" />
            <span><dt>{t('বিভাগ, জেলা ও উপজেলা')}</dt><dd>{donor.division}, {donor.district}{donor.upazila ? `, ${donor.upazila}` : ''}</dd></span>
          </div>
          <div>
            <DonorDetailIcon name="pin" />
            <span><dt>{t('এলাকা / অবস্থান')}</dt><dd>{donor.location || t('উল্লেখ করা হয়নি')}</dd></span>
          </div>
          <div>
            <DonorDetailIcon name="calendar" />
            <span><dt>{t('সর্বশেষ রক্তদান')}</dt><dd>{formatDonationDate(donor.lastDonationDate, language)}</dd></span>
          </div>
          <div>
            <DonorDetailIcon name="donation" />
            <span><dt>{t('পূর্ববর্তী রক্তদান')}</dt><dd>{donor.previousBloodDonations ?? 0} {t('বার')}</dd></span>
          </div>
          {registeredAt && (
            <div>
              <DonorDetailIcon name="registered" />
              <span><dt>{t('নিবন্ধনের তারিখ')}</dt><dd>{registeredAt}</dd></span>
            </div>
          )}
        </dl>
        {donor.phone && <DonorContactActions phone={donor.phone} whatsappNumber={donor.whatsappNumber} />}
        <Link className="donor-profile-button" to={`/donors/${encodeURIComponent(donor.id)}`}>
          {t('প্রোফাইল দেখুন')}
        </Link>
      </div>
    </article>
  )
}

function DonorDetailIcon({ name }) {
  const paths = {
    location: <><path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
    pin: <><path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z" /><path d="M9.5 10h5" /></>,
    calendar: <><rect height="16" rx="2" width="17" x="3.5" y="5" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h2m4 0h2m-8 4h2" /></>,
    donation: <><path d="M12 21s-7-4.4-7-10.1A4.1 4.1 0 0 1 12 8.5a4.1 4.1 0 0 1 7 2.4C19 16.6 12 21 12 21Z" /><path d="M12 9.5v5m-2.5-2.5h5" /></>,
    registered: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20v-1.6a6.5 6.5 0 0 1 13 0V20" /><path d="M17 5.5h4m-2-2v4" /></>,
  }
  return (
    <svg aria-hidden="true" className="donor-detail-icon" fill="none" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  )
}

const BADGE_ICONS = {
  none: '🩸',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '🏆',
}

export default DonorCard

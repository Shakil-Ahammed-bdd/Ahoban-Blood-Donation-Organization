import { Link } from 'react-router-dom'
import DonorContactActions from './DonorContactActions'
import { formatDonationDate } from '../../utils/formatDonationDate'
import { useLanguage } from '../../contexts/useLanguage'

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
    <article className="donor-card">
      <div className="donor-card-profile">
        <span aria-hidden="true" className="donor-avatar">
          {donor.profilePhotoUrl ? <img alt="" src={donor.profilePhotoUrl} /> : initials}
        </span>
        <div className="donor-card-identity">
          <h3>{donor.fullName}</h3>
          <p className="donor-user-id">{t('User ID')}: {donor.userId}</p>
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
      <div aria-label={`${t('রক্তের গ্রুপ')} ${donor.bloodGroup}`} className="donor-group-banner">
        <strong>{donor.bloodGroup}</strong>
        <span>{t('রক্তের গ্রুপ')}</span>
      </div>
      <dl className="donor-card-details">
        <div><dt>{t('বিভাগ, জেলা ও উপজেলা')}</dt><dd>{donor.division}, {donor.district}{donor.upazila ? `, ${donor.upazila}` : ''}</dd></div>
        <div><dt>{t('এলাকা / অবস্থান')}</dt><dd>{donor.location}</dd></div>
        <div><dt>{t('সর্বশেষ রক্তদান')}</dt><dd>{formatDonationDate(donor.lastDonationDate, language)}</dd></div>
        <div><dt>{t('পূর্ববর্তী রক্তদান')}</dt><dd>{donor.previousBloodDonations ?? 0}</dd></div>
        {registeredAt && <div><dt>{t('নিবন্ধনের তারিখ')}</dt><dd>{registeredAt}</dd></div>}
      </dl>
      {donor.phone && <DonorContactActions phone={donor.phone} whatsappNumber={donor.whatsappNumber} />}
      <Link className="donor-profile-button" to={`/donors/${encodeURIComponent(donor.id)}`}>
        {t('প্রোফাইল দেখুন')}
      </Link>
    </article>
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

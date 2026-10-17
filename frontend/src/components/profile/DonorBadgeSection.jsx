import { useLanguage } from '../../contexts/useLanguage'

const BADGE_ICONS = {
  none: '🩸',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '🏆',
}
const todayDate = new Date().toISOString().slice(0, 10)

function DonorBadgeSection({
  dateError,
  dateValue,
  donorBadge,
  onDateChange,
  onSubmit,
  saving,
}) {
  const { t } = useLanguage()
  const badge = donorBadge || {
    badge: 'New Donor',
    badgeLevel: 'none',
    totalDonations: 0,
    previousBloodDonations: 0,
    loggedDonationCount: 0,
    nextBadge: 'Bronze Donor',
    donationsToNextBadge: 1,
    progressPercentage: 0,
    donationHistory: [],
  }
  const history = badge.donationHistory || []

  return (
    <section aria-labelledby="donor-badge-title" className="donor-badge-section">
      <h2 id="donor-badge-title">{t('আপনার দাতা ব্যাজ')}</h2>
      <form className="donation-date-log" onSubmit={onSubmit}>
        <h3>{t('রক্তদানের তারিখ যোগ বা হালনাগাদ করুন')}</h3>
        <label htmlFor="profile-donation-date">
          {t('নিচের ক্যালেন্ডার থেকে আপনার সর্বশেষ রক্তদানের তারিখ নির্বাচন করুন:')}
        </label>
        <input
          id="profile-donation-date"
          max={todayDate}
          onChange={onDateChange}
          required
          type="date"
          value={dateValue}
        />
        {dateError && <p className="donation-date-error" role="alert">{dateError}</p>}
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? t('রক্তদানের তারিখ হালনাগাদ হচ্ছে…') : `🩸 ${t('রক্তদানের তারিখ হালনাগাদ করুন')}`}
        </button>
      </form>
      <div className="donor-badge-summary">
        <span aria-hidden="true" className={`donor-badge-icon badge-${badge.badgeLevel}`}>
          {BADGE_ICONS[badge.badgeLevel] || BADGE_ICONS.none}
        </span>
        <div className="donor-badge-copy">
          <strong>{badge.badge}</strong>
          <span>{badge.totalDonations} {t('আজীবন')} {t('দান')}</span>
          <span className="donor-badge-count-breakdown">
            {badge.previousBloodDonations || 0} {t('যোগদানের আগে')} + {badge.loggedDonationCount || 0} {t('এখানে নথিভুক্ত')}
          </span>
        </div>
      </div>
      <div className="donor-badge-progress">
        <div className="donor-badge-progress-label">
          <span>
            {badge.nextBadge
              ? `${badge.donationsToNextBadge} ${t('আরও দানে')} ${t(badge.nextBadge)} ${t('পৌঁছান')}`
              : t('সর্বোচ্চ দাতা ব্যাজ অর্জিত')}
          </span>
          <span>{badge.progressPercentage}%</span>
        </div>
        <div
          aria-label={`${badge.progressPercentage}% ${t('পরবর্তী ব্যাজের অগ্রগতি')} ${t(badge.nextBadge || 'সর্বোচ্চ ব্যাজ')}`}
          aria-valuemax="100"
          aria-valuemin="0"
          aria-valuenow={badge.progressPercentage}
          className="donor-badge-progress-track"
          role="progressbar"
        >
          <span style={{ width: `${badge.progressPercentage}%` }} />
        </div>
      </div>
      <div className="donor-badge-history">
        <h3>{t('রক্তদানের ইতিহাস')}</h3>
        {history.length ? (
          <ul>
            {history.map((item) => (
              <li key={item.id || item.date}>
                <span aria-hidden="true">🩸</span>
                <time dateTime={item.date}>
                  {new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date(item.date))}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="donor-badge-empty">{t('এখনও রক্তদানের ইতিহাস নেই।')}</p>
        )}
      </div>
    </section>
  )
}

export default DonorBadgeSection

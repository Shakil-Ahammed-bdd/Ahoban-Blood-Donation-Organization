import Reveal from '../shared/Reveal'
import SectionHeading from '../shared/SectionHeading'
import { useLanguage } from '../../contexts/useLanguage'

const metrics = [
  { label: 'নিবন্ধিত রক্তদাতা', icon: '♡' },
  { label: 'সফল রক্তদান', icon: '♥' },
  { label: 'সহায়তা পাওয়া জীবন', icon: '✳' },
]

function ImpactStats() {
  const { t } = useLanguage()
  return (
    <section aria-labelledby="impact-title" className="section impact-section">
      <div className="section-container">
        <Reveal className="impact-panel">
          <SectionHeading
            description={t('তথ্য সংযুক্ত হলে এখানে আহ্বানের যাচাইকৃত কার্যক্রমের পরিসংখ্যান দেখানো হবে।')}
            highlight={t('আশার গল্প')}
            id="impact-title"
            kicker={t('আমাদের সম্মিলিত প্রভাব')}
            title={t('প্রতিটি দানই')}
          />
          <div className="impact-grid">
            {metrics.map((metric) => (
              <div className="impact-metric" key={metric.label}>
                <span aria-hidden="true" className="impact-icon">{metric.icon}</span>
                <strong aria-label={t('তথ্য এখনো পাওয়া যায়নি')}>—</strong>
                <span className="impact-label">{t(metric.label)}</span>
                <small>{t('ডেমো · তথ্য সংযুক্ত হয়নি')}</small>
              </div>
            ))}
          </div>
          <p className="impact-disclaimer">
            {t('এখানে কোনো বাস্তব পরিসংখ্যান দেখানো হচ্ছে না। ব্যাকএন্ড ডেটা যুক্ত হলে মানগুলো হালনাগাদ হবে।')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

export default ImpactStats

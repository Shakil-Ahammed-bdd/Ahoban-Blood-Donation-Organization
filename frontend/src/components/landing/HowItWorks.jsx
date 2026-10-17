import Reveal from '../shared/Reveal'
import SectionHeading from '../shared/SectionHeading'
import { useLanguage } from '../../contexts/useLanguage'

const steps = [
  {
    number: '০১',
    title: 'দাতা হিসেবে নিবন্ধন',
    description: 'আপনার রক্তের গ্রুপ ও যোগাযোগের তথ্য দিয়ে নিবন্ধন করুন।',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.5-3.4 3.3-5.5 7-5.5s6.5 2.1 7 5.5" />
        <path d="M19 7v5m-2.5-2.5h5" />
      </>
    ),
  },
  {
    number: '০২',
    title: 'রক্তের গ্রুপ খুঁজুন',
    description: 'প্রয়োজনীয় রক্তের গ্রুপ ও কাছাকাছি এলাকা নির্বাচন করুন।',
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4 4" />
        <path d="M10.5 7v7m-3.5-3.5h7" />
      </>
    ),
  },
  {
    number: '০৩',
    title: 'দাতার সঙ্গে যোগাযোগ',
    description: 'উপযুক্ত দাতার সঙ্গে কথা বলে প্রয়োজনীয় বিষয় নিশ্চিত করুন।',
    icon: (
      <>
        <path d="M7 4h3l2 5-2 1.5a14 14 0 0 0 3.5 3.5L15 12l5 2v3c0 1.1-.9 2-2 2C10.3 19 5 13.7 5 7c0-1.7.8-3 2-3Z" />
        <path d="M15 5h5m-2.5-2.5v5" />
      </>
    ),
  },
  {
    number: '০৪',
    title: 'বাঁচান একটি জীবন',
    description: 'নিরাপদভাবে রক্তদান করে কারও নতুন আশার কারণ হোন।',
    icon: (
      <>
        <path d="M20.5 8.8c0 4.3-8.5 10-8.5 10s-8.5-5.7-8.5-10a4.5 4.5 0 0 1 8.5-2.1 4.5 4.5 0 0 1 8.5 2.1Z" />
        <path d="M12 8v5m-2.5-2.5h5" />
      </>
    ),
  },
]

function HowItWorks() {
  const { t } = useLanguage()
  return (
    <section aria-labelledby="how-it-works-title" className="section process-section" id="about">
      <div className="section-container">
        <Reveal>
          <SectionHeading
            description={t('একটি ছোট উদ্যোগই হতে পারে কারও জীবনের সবচেয়ে বড় সহায়তা।')}
            highlight={t('পাশে থাকুন')}
            id="how-it-works-title"
            kicker={t('সহজ চারটি ধাপ')}
            title={t('রক্তদানে')}
          />
        </Reveal>

        <div className="process-grid">
          {steps.map((step, index) => (
            <Reveal className="process-card" delay={index * 90} key={step.number}>
              <div className="process-card-top">
                <span className="process-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">{step.icon}</svg>
                </span>
                <span className="process-number">{step.number}</span>
              </div>
              <h3>{t(step.title)}</h3>
              <p>{t(step.description)}</p>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="process-connector">→</span>
              )}
            </Reveal>
          ))}
        </div>
        <p className="process-disclaimer">
          {t('দাতা নিবন্ধন ও যোগাযোগের অনলাইন সুবিধাগুলো এখনো তৈরি হচ্ছে।')}
        </p>
      </div>
    </section>
  )
}

export default HowItWorks

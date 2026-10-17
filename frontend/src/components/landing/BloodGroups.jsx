import BloodGroupCard from './BloodGroupCard'
import Reveal from '../shared/Reveal'
import SectionHeading from '../shared/SectionHeading'
import { useLanguage } from '../../contexts/useLanguage'

const bloodGroups = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

function BloodGroups() {
  const { t } = useLanguage()
  return (
    <section aria-labelledby="blood-groups-title" className="section groups-section" id="blood-groups">
      <div className="section-container">
        <Reveal>
          <SectionHeading
            description={t('প্রতিটি গ্রুপের রক্তই গুরুত্বপূর্ণ—প্রতিটি দানেই বাঁচতে পারে একটি জীবন।')}
            highlight={t('জানুন')}
            id="blood-groups-title"
            kicker={t('রক্তের গ্রুপ')}
            title={t('আপনার গ্রুপটি')}
          />
        </Reveal>
        <div className="blood-groups-grid">
          {bloodGroups.map((group, index) => (
            <Reveal className="group-reveal" delay={index * 45} key={group}>
              <BloodGroupCard group={group} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BloodGroups

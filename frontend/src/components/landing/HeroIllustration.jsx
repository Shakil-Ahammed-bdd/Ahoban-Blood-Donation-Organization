import { useLanguage } from '../../contexts/useLanguage'

function HeroIllustration() {
  const { t } = useLanguage()
  return (
    <div className="hero-art" aria-label={t('রক্তদান জীবন বাঁচাতে সহায়তা করে')} role="img">
      <div className="art-orbit art-orbit-one" />
      <div className="art-orbit art-orbit-two" />
      <div className="art-sun" />
      <div className="art-spark art-spark-one">✳</div>
      <div className="art-spark art-spark-two">✳</div>
      <div className="art-caption">
        <span className="caption-heart" aria-hidden="true">♥</span>
        <span>
          <strong>{t('আপনার দান')}</strong>
          <small>{t('কারও নতুন সকাল')}</small>
        </span>
      </div>

      <svg
        aria-hidden="true"
        className="donation-illustration"
        fill="none"
        viewBox="0 0 520 520"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="264" cy="453" fill="#6F1D2B" opacity=".09" rx="166" ry="20" />

        <path
          d="M254 77v48m27-48v48"
          stroke="#B65454"
          strokeLinecap="round"
          strokeWidth="8"
        />
        <path
          d="M238 121c0-9 7-16 16-16h28c9 0 16 7 16 16v21h-60v-21Z"
          fill="#F7F2E9"
          stroke="#B65454"
          strokeWidth="5"
        />
        <rect
          fill="#FFFDF9"
          height="228"
          rx="37"
          stroke="#B65454"
          strokeWidth="6"
          width="152"
          x="205"
          y="137"
        />
        <path
          d="M211 258h140v69c0 20-16 36-36 36h-68c-20 0-36-16-36-36v-69Z"
          fill="#F4C6C4"
        />
        <path
          d="M211 279c23-17 44 14 69-1 24-14 44-5 71 3v46c0 20-16 36-36 36h-68c-20 0-36-16-36-36v-48Z"
          fill="#D93F4D"
        />
        <path
          d="M281 175c-14 20-27 33-27 49a27 27 0 0 0 54 0c0-16-13-29-27-49Z"
          fill="#C92E43"
        />
        <path
          d="M267 224c2 8 7 12 14 14"
          stroke="#F59A9D"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M280 365v43c0 12 10 22 22 22h30"
          stroke="#B65454"
          strokeLinecap="round"
          strokeWidth="6"
        />
        <circle cx="339" cy="430" r="10" fill="#D93F4D" />
        <path
          d="M193 404c-35-27-70-30-100-13-12 7-18 19-15 32 3 12 14 20 27 19l67-4c11-1 19-8 21-18"
          fill="#E7A18E"
        />
        <path
          d="M193 404c-12-9-25-15-39-18-8-2-16 3-17 11-2 8 3 15 11 18l35 13"
          fill="#F0B7A5"
        />
        <path
          d="M401 381c31-19 62-20 91-5 12 7 16 21 10 32-5 10-17 15-28 12l-59-16c-10-3-16-12-14-23Z"
          fill="#E7A18E"
        />
        <path
          d="M402 381c11-7 23-12 36-14 8-1 15 4 16 12 1 7-4 14-11 16l-32 11"
          fill="#F0B7A5"
        />
        <path d="M158 419c-3 18-12 32-25 42" stroke="#D18A7B" strokeLinecap="round" strokeWidth="8" />
        <path d="M453 397c3 16 11 28 24 37" stroke="#D18A7B" strokeLinecap="round" strokeWidth="8" />
        <path d="M169 457h33" stroke="#B65454" strokeLinecap="round" strokeWidth="5" />
        <path d="M427 446h32" stroke="#B65454" strokeLinecap="round" strokeWidth="5" />
      </svg>
    </div>
  )
}

export default HeroIllustration

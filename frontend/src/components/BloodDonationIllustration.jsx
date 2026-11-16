import { useId } from 'react'
import './BloodDonationIllustration.css'

const donorTubePath = 'M184 385C207 405 260 440 297 449C323 455 341 439 338 414C334 387 309 345 292 313C278 287 291 254 301 228C313 198 317 182 304 153C294 132 278 123 267 132C253 144 262 168 279 182C294 194 308 195 324 186C360 168 380 125 391 93C403 60 424 42 451 42C480 42 502 63 502 94V198'
const recipientTubePath = 'M591 198V96C591 66 611 43 640 43C669 43 688 64 699 91C713 126 728 159 755 178C778 194 800 193 817 177C833 162 831 143 820 134C806 123 791 132 784 150C777 170 782 196 791 218C802 246 813 267 807 287C802 307 782 330 771 356C758 382 750 405 749 431'
const liquidInteriorPath = 'M484 220C499 220 508 228 520 227C532 226 537 219 549 221C561 223 567 230 579 227C593 224 605 222 615 232C622 239 622 251 622 265V386C622 402 612 411 596 416C566 425 523 423 492 416C476 412 469 402 469 386V242C469 230 475 223 484 220Z'

function BloodDonationIllustration({ size = 540, className = '' }) {
  const clipPathId = `blood-donation-liquid-${useId().replace(/:/g, '')}`
  const classes = ['blood-donation-illustration', className].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={{ '--illustration-size': `${size}px` }}
    >
      <img
        alt="Blood donation illustration showing connected blood tubes, a collection bag, and joined hands"
        className="blood-donation-illustration__image"
        height="768"
        src="/images/blood-donation-reference.jpg"
        width="1065"
      />
      <svg
        aria-hidden="true"
        className="blood-donation-illustration__overlay"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 1065 768"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath clipPathUnits="userSpaceOnUse" id={clipPathId}>
            <path
              d={`${liquidInteriorPath} M478 265H617V401H478Z`}
              fillRule="evenodd"
            />
          </clipPath>
        </defs>

        <path
          className="blood-donation-illustration__flow blood-donation-illustration__flow--donor"
          d={donorTubePath}
        />
        <path
          className="blood-donation-illustration__flow blood-donation-illustration__flow--recipient"
          d={recipientTubePath}
        />

        <g clipPath={`url(#${clipPathId})`}>
          <g className="blood-donation-illustration__bag-fill-mask">
            <rect height="212" width="172" x="460" y="218" />
            <path
              className="blood-donation-illustration__fill-surface"
              d="M469 416C483 411 493 421 507 416S535 411 549 416S577 421 591 416S610 411 622 416"
            />
          </g>
        </g>

        <g
          className="blood-donation-illustration__bag-surface"
          clipPath={`url(#${clipPathId})`}
        >
          <path d="M469 231C482 225 493 234 506 231S531 225 544 231S569 236 582 231S609 225 622 231" />
        </g>

        <circle className="blood-donation-illustration__pulse" cx="184" cy="386" r="9" />
        <circle className="blood-donation-illustration__pulse blood-donation-illustration__pulse--bag-left" cx="502" cy="198" r="8" />
        <circle className="blood-donation-illustration__pulse blood-donation-illustration__pulse--bag-right" cx="591" cy="198" r="8" />
        <circle className="blood-donation-illustration__pulse blood-donation-illustration__pulse--receiver" cx="749" cy="431" r="9" />
      </svg>
    </div>
  )
}

export default BloodDonationIllustration

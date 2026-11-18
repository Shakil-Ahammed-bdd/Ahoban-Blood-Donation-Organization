import './BloodDonationIllustration.css'

function BloodDonationIllustration({ size = 540, className = '' }) {
  const classes = ['blood-donation-illustration', className].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={{ '--illustration-size': `${size}px` }}
    >
      <img
        alt="Blood donation illustration showing a blood bag and joined hands"
        className="blood-donation-illustration__image"
        height="424"
        src="/images/blood-donation-banner.png"
        width="588"
      />
    </div>
  )
}

export default BloodDonationIllustration

import { useState } from 'react'
import { useLanguage } from '../../contexts/useLanguage'

function normalizeBangladeshNumber(number) {
  const digits = number.replace(/\D/g, '')
  if (digits.startsWith('880')) return digits
  return digits.startsWith('0') ? `88${digits}` : digits
}

function DonorContactActions({ phone, whatsappNumber }) {
  const { t } = useLanguage()
  const [copyStatus, setCopyStatus] = useState('')

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(phone)
      setCopyStatus(t('নম্বর কপি হয়েছে'))
    } catch {
      setCopyStatus(t('নম্বর কপি করা যায়নি'))
    }
  }

  return (
    <div className="donor-contact-actions">
      <a aria-label={t('ফোন করুন {phone}', { phone })} className="donor-contact-button" href={`tel:${phone}`}>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M7.2 3.8h2.4l1.2 4-1.9 1.8a15.8 15.8 0 0 0 5.5 5.5l1.8-1.9 4 1.2v2.4a2 2 0 0 1-2.2 2A16 16 0 0 1 5.2 6a2 2 0 0 1 2-2.2Z" />
        </svg>
        <span>{t('কল')}</span>
      </a>
      <button aria-label={t('ফোন নম্বর কপি করুন')} className="donor-contact-button" onClick={() => void copyNumber()} type="button">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <rect height="13" rx="2" width="11" x="9" y="8" />
          <path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
        </svg>
        <span>{copyStatus ? t(copyStatus) : t('কপি')}</span>
      </button>
      {whatsappNumber && (
        <a
          aria-label={t('WhatsApp-এ যোগাযোগ করুন')}
          className="donor-contact-button donor-whatsapp-button"
          href={`https://wa.me/${normalizeBangladeshNumber(whatsappNumber)}`}
          rel="noreferrer"
          target="_blank"
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M20 11.7a8 8 0 0 1-11.9 7l-4.1 1.1 1.1-4.1A8 8 0 1 1 20 11.7Z" />
            <path d="M9 8.5c.4 2 2 3.7 4.1 4.5l1.2-1 2 .8c-.1 1.3-.8 2-2.1 2.1-3.1-.3-6.7-3.7-7-6.9.1-1.3.8-2 2.1-2.1l.8 2-1.1.6Z" />
          </svg>
          <span>WhatsApp</span>
        </a>
      )}
      <span aria-live="polite" className="donor-copy-feedback" role="status">{copyStatus}</span>
    </div>
  )
}

export default DonorContactActions

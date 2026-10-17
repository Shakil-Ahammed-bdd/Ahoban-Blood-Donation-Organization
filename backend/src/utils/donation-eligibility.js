const DAY_IN_MS = 24 * 60 * 60 * 1000
const ELIGIBILITY_DAYS = 120

function startOfUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function isAvailableToDonate(lastDonationDate, today = new Date()) {
  if (!lastDonationDate) return true
  const daysSinceLastDonation = Math.floor(
    (startOfUtcDay(today) - startOfUtcDay(lastDonationDate)) / DAY_IN_MS,
  )
  return daysSinceLastDonation >= ELIGIBILITY_DAYS
}

function donationEligibilityCutoff(today = new Date()) {
  return new Date(startOfUtcDay(today) - ELIGIBILITY_DAYS * DAY_IN_MS)
}

module.exports = { donationEligibilityCutoff, isAvailableToDonate }

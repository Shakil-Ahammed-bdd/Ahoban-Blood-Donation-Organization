const BADGE_LEVELS = [
  { badge: 'Bronze Donor', badgeLevel: 'bronze', minimumDonations: 1 },
  { badge: 'Silver Donor', badgeLevel: 'silver', minimumDonations: 3 },
  { badge: 'Gold Donor', badgeLevel: 'gold', minimumDonations: 5 },
  { badge: 'Platinum Donor', badgeLevel: 'platinum', minimumDonations: 10 },
]

function normalizeDonationHistory(records = []) {
  const dates = new Map()
  for (const record of records) {
    if (!record?.donationDate) continue
    const date = new Date(record.donationDate)
    if (Number.isNaN(date.getTime())) continue
    const key = date.toISOString().slice(0, 10)
    const existing = dates.get(key)
    if (!existing) {
      dates.set(key, {
        ...((record.id || record._id) ? { id: String(record.id || record._id) } : {}),
        date: key,
        ...(record.loggedAt ? { loggedAt: record.loggedAt } : {}),
      })
    }
  }
  return [...dates.values()].sort((left, right) => right.date.localeCompare(left.date))
}

function calculateDonorBadge(previousBloodDonations = 0, donationRecords = []) {
  const donationHistory = normalizeDonationHistory(donationRecords)
  const loggedDonationCount = donationHistory.length
  const reportedDonations = Number.isSafeInteger(previousBloodDonations) && previousBloodDonations > 0
    ? previousBloodDonations
    : 0
  const totalDonations = reportedDonations + loggedDonationCount
  const currentIndex = BADGE_LEVELS.reduce(
    (index, level, candidateIndex) => (
      totalDonations >= level.minimumDonations ? candidateIndex : index
    ),
    -1,
  )
  const current = currentIndex >= 0 ? BADGE_LEVELS[currentIndex] : null
  const next = BADGE_LEVELS[currentIndex + 1] || null
  const progressStart = current?.minimumDonations || 0
  const progressPercentage = next
    ? Math.round(
        ((totalDonations - progressStart) /
          (next.minimumDonations - progressStart)) * 100,
      )
    : 100

  return {
    badge: current?.badge || 'New Donor',
    badgeLevel: current?.badgeLevel || 'none',
    totalDonations,
    previousBloodDonations: reportedDonations,
    loggedDonationCount,
    nextBadge: next?.badge || null,
    donationsToNextBadge: next ? next.minimumDonations - totalDonations : 0,
    progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
    donationHistory,
  }
}

module.exports = { calculateDonorBadge, normalizeDonationHistory }

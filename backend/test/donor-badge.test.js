const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateDonorBadge } = require('../src/utils/donor-badge')

const cases = [
  [0, 'New Donor', 'none', 'Bronze Donor', 1, 0],
  [1, 'Bronze Donor', 'bronze', 'Silver Donor', 2, 0],
  [2, 'Bronze Donor', 'bronze', 'Silver Donor', 1, 50],
  [3, 'Silver Donor', 'silver', 'Gold Donor', 2, 0],
  [4, 'Silver Donor', 'silver', 'Gold Donor', 1, 50],
  [5, 'Gold Donor', 'gold', 'Platinum Donor', 5, 0],
  [9, 'Gold Donor', 'gold', 'Platinum Donor', 1, 80],
  [10, 'Platinum Donor', 'platinum', null, 0, 100],
]

for (const [count, badge, level, nextBadge, remaining, progress] of cases) {
  test(`${count} donations resolve to ${badge} with dynamic progress`, () => {
    const result = calculateDonorBadge(count)
    assert.equal(result.badge, badge)
    assert.equal(result.badgeLevel, level)
    assert.equal(result.totalDonations, count)
    assert.equal(result.nextBadge, nextBadge)
    assert.equal(result.donationsToNextBadge, remaining)
    assert.equal(result.progressPercentage, progress)
  })
}

test('pre-joining donations add to distinct website-logged donation dates', () => {
  const history = [
    { id: 'one', donationDate: '2026-07-17T00:00:00.000Z', loggedAt: new Date() },
    { id: 'duplicate', donationDate: '2026-07-17T12:00:00.000Z' },
    { id: 'two', donationDate: '2026-07-10T00:00:00.000Z' },
  ]
  const result = calculateDonorBadge(3, history)
  assert.equal(result.totalDonations, 5)
  assert.equal(result.previousBloodDonations, 3)
  assert.equal(result.loggedDonationCount, 2)
  assert.equal(result.donationHistory.length, 2)
  assert.deepEqual(
    result.donationHistory.map(({ date }) => date),
    ['2026-07-17', '2026-07-10'],
  )
})

test('adding actual donation records recalculates the badge dynamically', () => {
  const first = { donationDate: '2026-07-17T00:00:00.000Z' }
  const second = { donationDate: '2026-07-10T00:00:00.000Z' }
  assert.equal(calculateDonorBadge(0, [first]).badge, 'Bronze Donor')
  assert.equal(calculateDonorBadge(0, [first, second]).totalDonations, 2)
  assert.equal(calculateDonorBadge(0, [second]).totalDonations, 1)
  assert.equal(calculateDonorBadge(0).badge, 'New Donor')
})

test('legacy users without dated history retain their donation count safely', () => {
  const result = calculateDonorBadge(undefined, [])
  assert.equal(result.badge, 'New Donor')
  assert.deepEqual(result.donationHistory, [])
})

const test = require('node:test')
const assert = require('node:assert/strict')
const { isAvailableToDonate } = require('../src/utils/donation-eligibility')

const today = new Date('2026-10-17T15:00:00.000Z')

function donationDate(daysAgo) {
  return new Date(Date.UTC(2026, 9, 17 - daysAgo))
}

test('donor eligibility treats a missing last donation date as available', () => {
  assert.equal(isAvailableToDonate(null, today), true)
})

test('donor eligibility requires 120 complete UTC calendar days', () => {
  assert.equal(isAvailableToDonate(donationDate(119), today), false)
  assert.equal(isAvailableToDonate(donationDate(120), today), true)
  assert.equal(isAvailableToDonate(donationDate(121), today), true)
})

test('donor eligibility compares complete days independently of the current time', () => {
  const beforeMidnight = new Date('2026-10-17T00:01:00.000Z')
  assert.equal(isAvailableToDonate(donationDate(119), beforeMidnight), false)
  assert.equal(isAvailableToDonate(donationDate(120), beforeMidnight), true)
})

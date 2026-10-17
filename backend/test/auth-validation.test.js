const test = require('node:test')
const assert = require('node:assert/strict')
const {
  validateDonationDate,
  validateProfileUpdate,
  validateRegistration,
} = require('../src/utils/auth-validation')

function validRegistration(overrides = {}) {
  return {
    fullName: 'Test Donor',
    email: 'donor@example.test',
    phone: '01712345678',
    whatsappNumber: '01812345678',
    bloodGroup: 'A+',
    division: 'ঢাকা',
    district: 'ঢাকা',
    upazila: 'সাভার',
    location: 'ধানমন্ডি',
    previousBloodDonations: 3,
    password: 'a-secure-test-password',
    confirmPassword: 'a-secure-test-password',
    acceptTerms: true,
    ...overrides,
  }
}

test('registration accepts valid donor contact, location, and donation history fields', () => {
  const input = validateRegistration(validRegistration())
  assert.equal(input.whatsappNumber, '01812345678')
  assert.equal(input.upazila, 'সাভার')
  assert.equal(input.previousBloodDonations, 3)
  assert.equal(input.latitude, null)
  assert.equal(input.longitude, null)
  assert.equal(input.isSearchable, false)
  assert.equal(input.isContactPublic, false)
  assert.equal('isDonorAvailable' in input, false)
})

test('registration rejects unknown upazilas and invalid contact/donation values', () => {
  for (const [field, value] of [
    ['upazila', 'ধানমন্ডি'],
    ['whatsappNumber', 'not-a-phone'],
    ['previousBloodDonations', '-1'],
    ['latitude', '91'],
    ['longitude', '181'],
    ['isDonorAvailable', true],
    ['isContactPublic', 'perhaps'],
  ]) {
    assert.throws(
      () => validateRegistration(validRegistration({ [field]: value })),
      (error) => error.statusCode === 400 && Boolean(error.fieldErrors[field]),
      `${field} should be rejected`,
    )
  }
})

test('registration rejects a future last donation date', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.throws(
    () => validateRegistration(validRegistration({ lastDonationDate: tomorrow })),
    (error) => error.statusCode === 400 && Boolean(error.fieldErrors.lastDonationDate),
  )
})

test('donation logging accepts only strict, valid, non-future calendar dates', () => {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const todayString = today.toISOString().slice(0, 10)
  const tomorrowString = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.equal(
    validateDonationDate({ donationDate: todayString }).toISOString(),
    today.toISOString(),
  )
  for (const donationDate of ['2024-02-30', '2026-1-01', tomorrowString]) {
    assert.throws(
      () => validateDonationDate({ donationDate }),
      (error) => error.statusCode === 400 && Boolean(error.fieldErrors.donationDate),
      `${donationDate} should be rejected`,
    )
  }
  assert.throws(
    () => validateDonationDate({ donationDate: todayString, totalDonations: 100 }),
    (error) => error.statusCode === 400 && Boolean(error.fieldErrors.totalDonations),
  )
})

test('profile updates validate upazila against the effective district and validate coordinates', () => {
  const profile = { division: 'ঢাকা', district: 'ঢাকা', upazila: 'সাভার' }
  assert.deepEqual(
    validateProfileUpdate({ upazila: 'কেরাণীগঞ্জ' }, profile),
    { upazila: 'কেরাণীগঞ্জ' },
  )
  assert.throws(
    () => validateProfileUpdate({ upazila: 'ধানমন্ডি' }, profile),
    (error) => error.statusCode === 400 && Boolean(error.fieldErrors.upazila),
  )
  assert.deepEqual(
    validateProfileUpdate({ isContactPublic: 'true' }, profile),
    { isContactPublic: true },
  )
  assert.throws(
    () => validateProfileUpdate({ latitude: 91, longitude: 0 }, profile),
    (error) => error.statusCode === 400 && Boolean(error.fieldErrors.latitude),
  )
  for (const field of ['lastDonationDate', 'previousBloodDonations']) {
    assert.throws(
      () => validateProfileUpdate({ [field]: null }, profile),
      (error) => error.statusCode === 400 && Boolean(error.fieldErrors[field]),
      `${field} should only change through its dedicated workflow`,
    )
  }
})

const test = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes, randomUUID } = require('node:crypto')
const mongoose = require('mongoose')
const sharp = require('sharp')

const clientOrigin = 'http://localhost:5173'
process.env.CLIENT_URL = clientOrigin
process.env.JWT_SECRET ||= randomBytes(48).toString('base64url')
const originalExperienceModeratorIds = process.env.EXPERIENCE_MODERATOR_USER_IDS

const app = require('../src/app')
const Experience = require('../src/models/Experience')
const ExperienceComment = require('../src/models/ExperienceComment')
const ExperienceReaction = require('../src/models/ExperienceReaction')
const User = require('../src/models/User')
const { removeImages } = require('../src/services/experience-image-storage')

test('registration, profiles, donor search, and cookie-based authentication lifecycle', async () => {
  const databaseUri =
    process.env.AUTH_TEST_MONGODB_URI ||
    'mongodb://127.0.0.1:27017/blood-bank-auth-test'
  const email = `auth-test-${randomUUID()}@example.test`
  const unavailableEmail = `auth-test-${randomUUID()}@example.test`
  const privateEmail = `auth-test-${randomUUID()}@example.test`
  let otherDonorExperienceId
  let badgeHistoryFixtureId
  const invalidBloodGroupFixtureIds = []
  const makeDetails = (userEmail, overrides = {}) => ({
    fullName: 'Test Donor',
    email: userEmail,
    phone: '01712345678',
    bloodGroup: 'A+',
    division: 'ঢাকা',
    district: 'ঢাকা',
    upazila: 'সাভার',
    location: 'ধানমন্ডি',
    whatsappNumber: '01812345678',
    previousBloodDonations: 4,
    isSearchable: true,
    isContactPublic: true,
    password: 'a-secure-test-password',
    confirmPassword: 'a-secure-test-password',
    acceptTerms: true,
    ...overrides,
  })
  const userDetails = makeDetails(email)
  const unavailableDetails = makeDetails(unavailableEmail, {
    fullName: 'Unavailable Donor',
    lastDonationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isContactPublic: false,
    location: 'গুলশান',
  })
  const privateDetails = makeDetails(privateEmail, {
    fullName: 'Private Donor',
    isSearchable: false,
    previousBloodDonations: 0,
  })
  const server = app.listen(0, '127.0.0.1')
  let createdExperience
  let profilePhotoUrl = ''
  let registrationPhotoUrl = ''

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    await mongoose.connect(databaseUri)
    await User.init()
    await ExperienceReaction.init()
    await ExperienceComment.init()
    const baseUrl = `http://127.0.0.1:${server.address().port}`
    const request = (path, options = {}) =>
      fetch(`${baseUrl}/api/auth${path}`, {
        ...options,
        headers: { origin: clientOrigin, ...options.headers },
      })

    const initialImpactResponse = await fetch(`${baseUrl}/api/stats/live-impact`)
    assert.equal(initialImpactResponse.status, 200)
    const initialImpact = await initialImpactResponse.json()
    assert.equal(initialImpact.totalRegistered, await User.countDocuments({}))
    assert.deepEqual(Object.keys(initialImpact.bloodGroups).sort(), [
      'A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-',
    ].sort())
    assert.ok(Array.isArray(initialImpact.monthlyRegistrations))
    assert.equal('users' in initialImpact, false)
    assert.equal('passwordHash' in initialImpact, false)

    const legacyFixtureBase = {
      userId: `AHB-${randomBytes(8).toString('hex').toUpperCase()}`,
      fullName: 'Legacy Statistics Fixture',
      email: `legacy-stats-${randomUUID()}@example.test`,
      phone: '01712345678',
      division: 'ঢাকা',
      district: 'ঢাকা',
      location: 'ঢাকা',
      passwordHash: 'test-only-hash',
      createdAt: new Date('2024-01-15T12:00:00.000Z'),
      updatedAt: new Date('2024-01-15T12:00:00.000Z'),
    }
    const invalidBloodGroupFixtureId = new mongoose.Types.ObjectId()
    const missingBloodGroupFixtureId = new mongoose.Types.ObjectId()
    invalidBloodGroupFixtureIds.push(invalidBloodGroupFixtureId, missingBloodGroupFixtureId)
    await User.collection.insertMany([
      {
        ...legacyFixtureBase,
        _id: invalidBloodGroupFixtureId,
        bloodGroup: 'invalid-legacy-value',
      },
      {
        ...legacyFixtureBase,
        _id: missingBloodGroupFixtureId,
        email: `legacy-stats-${randomUUID()}@example.test`,
        userId: `AHB-${randomBytes(8).toString('hex').toUpperCase()}`,
      },
    ])
    const legacyDataImpact = await fetch(`${baseUrl}/api/stats/live-impact`).then((response) => response.json())
    assert.equal(legacyDataImpact.totalRegistered, initialImpact.totalRegistered + 2)
    assert.deepEqual(legacyDataImpact.bloodGroups, initialImpact.bloodGroups)
    assert.equal(legacyDataImpact.monthlyRegistrations.find(
      ({ year, month }) => year === 2024 && month === 1,
    ).count, (initialImpact.monthlyRegistrations.find(
      ({ year, month }) => year === 2024 && month === 1,
    )?.count || 0) + 2)

    const preflight = await request('/login', {
      method: 'OPTIONS',
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), clientOrigin)
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true')

    const rejectedOrigin = await request('/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://untrusted.example',
      },
      body: JSON.stringify(userDetails),
    })
    assert.equal(rejectedOrigin.status, 403)

    const invalidRegistration = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...userDetails, phone: 'not-a-phone' }),
    })
    assert.equal(invalidRegistration.status, 400)
    assert.equal((await invalidRegistration.json()).fieldErrors.phone.length > 0, true)
    const missingLocation = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...userDetails, location: '' }),
    })
    assert.equal(missingLocation.status, 400)
    assert.equal((await missingLocation.json()).fieldErrors.location.length > 0, true)

    const registrationPhotoBytes = await sharp({
      create: { width: 2, height: 2, channels: 4, background: '#ec2633' },
    }).png().toBuffer()
    const registrationForm = new FormData()
    for (const [key, value] of Object.entries(userDetails)) {
      registrationForm.append(key, String(value))
    }
    registrationForm.set('latitude', '23.8103')
    registrationForm.set('longitude', '90.4125')
    registrationForm.append(
      'photo',
      new Blob([registrationPhotoBytes], { type: 'image/png' }),
      'registration.png',
    )
    const registration = await request('/register', {
      method: 'POST',
      body: registrationForm,
    })
    assert.equal(registration.status, 201)
    assert.equal(registration.headers.get('access-control-allow-origin'), clientOrigin)
    assert.equal(registration.headers.get('access-control-allow-credentials'), 'true')
    const registered = await registration.json()
    const impactAfterRegistration = await fetch(`${baseUrl}/api/stats/live-impact`).then((response) => response.json())
    assert.equal(impactAfterRegistration.totalRegistered, legacyDataImpact.totalRegistered + 1)
    assert.equal(impactAfterRegistration.bloodGroups['A+'], legacyDataImpact.bloodGroups['A+'] + 1)
    const registrationMonth = new Date(registered.user.createdAt)
    const currentRegistrationMonth = impactAfterRegistration.monthlyRegistrations.find(
      ({ year, month }) =>
        year === registrationMonth.getUTCFullYear() && month === registrationMonth.getUTCMonth() + 1,
    )
    assert.equal(currentRegistrationMonth.count, (legacyDataImpact.monthlyRegistrations.find(
      ({ year, month }) =>
        year === registrationMonth.getUTCFullYear() && month === registrationMonth.getUTCMonth() + 1,
    )?.count || 0) + 1)
    assert.match(registered.user.userId, /^AHB-[A-F0-9]{16}$/)
    assert.match(registered.user.profilePhotoUrl, /^\/api\/uploads\/avatars\/[a-f0-9-]+\.webp$/i)
    registrationPhotoUrl = registered.user.profilePhotoUrl
    assert.equal((await fetch(`${baseUrl}${registrationPhotoUrl}`)).status, 200)
    assert.equal(registered.user.latitude, 23.8103)
    assert.equal(registered.user.longitude, 90.4125)
    assert.equal('passwordHash' in registered.user, false)
    assert.equal('token' in registered, false)
    const registrationCookie = registration.headers.getSetCookie()[0]
    assert.match(registrationCookie, /HttpOnly/i)
    assert.match(registrationCookie, /SameSite=Lax/i)
    assert.match(registrationCookie, /Path=\/api/i)
    const sessionCookie = registrationCookie.split(';')[0]
    await assert.rejects(
      new User({
        userId: registered.user.userId,
        fullName: 'Duplicate ID',
        email: `other-${randomUUID()}@example.test`,
        phone: '01712345678',
        bloodGroup: 'A+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        location: 'ঢাকা',
        passwordHash: 'test-hash',
      }).save(),
      (error) => error.code === 11000 && error.keyPattern.userId === 1,
    )

    const duplicate = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(userDetails),
    })
    assert.equal(duplicate.status, 409)
    assert.equal((await duplicate.json()).code, 'EMAIL_ALREADY_REGISTERED')

    const protectedWithoutCookie = await request('/me')
    assert.equal(protectedWithoutCookie.status, 401)
    assert.equal((await fetch(`${baseUrl}/api/users/profile`)).status, 401)
    assert.equal(
      (
        await fetch(`${baseUrl}/api/users/profile`, {
          method: 'DELETE',
          headers: { origin: clientOrigin },
        })
      ).status,
      401,
    )

    const currentUser = await request('/me', { headers: { cookie: sessionCookie } })
    assert.equal(currentUser.status, 200)
    assert.equal((await currentUser.json()).user.email, email)

    const getProfile = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { cookie: sessionCookie, origin: clientOrigin },
    })
    assert.equal(getProfile.status, 200)
    const profile = await getProfile.json()
    assert.equal(profile.user.location, 'ধানমন্ডি')
    assert.equal(profile.user.upazila, 'সাভার')
    assert.equal(profile.user.previousBloodDonations, 4)
    assert.equal(profile.user.isSearchable, true)
    assert.equal('passwordHash' in profile.user, false)
    assert.equal((await fetch(`${baseUrl}/api/users/profile`)).status, 401)

    const profileUpdate = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie,
        origin: clientOrigin,
      },
      body: JSON.stringify({
        fullName: 'Updated Test Donor',
        phone: '01812345678',
        bloodGroup: 'B+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        location: 'উত্তরা',
        upazila: 'সাভার',
        whatsappNumber: '01812345678',
        latitude: 23.8103,
        longitude: 90.4125,
        isContactPublic: true,
        isSearchable: true,
      }),
    })
    assert.equal(profileUpdate.status, 200)
    const updatedProfile = await profileUpdate.json()
    assert.equal(updatedProfile.user.fullName, 'Updated Test Donor')
    assert.equal(updatedProfile.user.location, 'উত্তরা')
    assert.equal(updatedProfile.user.bloodGroup, 'B+')
    assert.equal(updatedProfile.user.whatsappNumber, '01812345678')
    assert.equal(updatedProfile.user.upazila, 'সাভার')
    assert.equal(updatedProfile.user.previousBloodDonations, 4)
    assert.equal(updatedProfile.user.latitude, 23.8103)
    assert.equal(updatedProfile.user.longitude, 90.4125)
    assert.equal(updatedProfile.user.isContactPublic, true)
    assert.equal(updatedProfile.user.isAvailableToDonate, true)

    const rejectedEligibilityOverride = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ isDonorAvailable: true }),
    })
    assert.equal(rejectedEligibilityOverride.status, 400)
    assert.ok((await rejectedEligibilityOverride.json()).fieldErrors.isDonorAvailable)

    const protectedFieldUpdate = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ userId: 'AHB-0000000000000000' }),
    })
    assert.equal(protectedFieldUpdate.status, 400)
    assert.ok((await protectedFieldUpdate.json()).fieldErrors.userId)
    const invalidLocationUpdate = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ division: 'চট্টগ্রাম' }),
    })
    assert.equal(invalidLocationUpdate.status, 400)
    const rejectedDonationCountEdit = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ previousBloodDonations: 100 }),
    })
    assert.equal(rejectedDonationCountEdit.status, 400)
    assert.ok((await rejectedDonationCountEdit.json()).fieldErrors.previousBloodDonations)
    const rejectedLastDonationDateEdit = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ lastDonationDate: null }),
    })
    assert.equal(rejectedLastDonationDateEdit.status, 400)
    assert.ok((await rejectedLastDonationDateEdit.json()).fieldErrors.lastDonationDate)

    const secondRegistration = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(unavailableDetails),
    })
    assert.equal(secondRegistration.status, 201)
    const unavailableUser = await secondRegistration.json()
    const privateRegistration = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(privateDetails),
    })
    assert.equal(privateRegistration.status, 201)
    const privateUser = await privateRegistration.json()
    const yearSpecificFixtures = [
      [registered.user.id, new Date('2025-01-15T12:00:00.000Z')],
      [unavailableUser.user.id, new Date('2026-01-15T12:00:00.000Z')],
      [privateUser.user.id, new Date('2025-01-20T12:00:00.000Z')],
    ]
    await Promise.all(yearSpecificFixtures.map(([id, createdAt]) =>
      User.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt } })))
    const yearSpecificImpact = await fetch(`${baseUrl}/api/stats/live-impact`).then((response) => response.json())
    const january2025 = yearSpecificImpact.monthlyRegistrations.find(
      ({ year, month }) => year === 2025 && month === 1,
    )
    const january2026 = yearSpecificImpact.monthlyRegistrations.find(
      ({ year, month }) => year === 2026 && month === 1,
    )
    assert.equal(january2025.count, (initialImpact.monthlyRegistrations.find(
      ({ year, month }) => year === 2025 && month === 1,
    )?.count || 0) + 2)
    assert.equal(january2026.count, (initialImpact.monthlyRegistrations.find(
      ({ year, month }) => year === 2026 && month === 1,
    )?.count || 0) + 1)
    const privateCookie = privateRegistration.headers.getSetCookie()[0].split(';')[0]
    const privateOwnProfile = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { cookie: privateCookie },
    }).then((response) => response.json()).then(({ user }) => user)
    assert.equal(privateOwnProfile.donorBadge.badge, 'New Donor')
    assert.equal(privateOwnProfile.donorBadge.totalDonations, 0)
    assert.deepEqual(privateOwnProfile.donorBadge.donationHistory, [])
    const unauthorizedDonationLog = await fetch(`${baseUrl}/api/users/profile/donation-history`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: clientOrigin },
      body: JSON.stringify({ donationDate: '2026-09-20' }),
    })
    assert.equal(unauthorizedDonationLog.status, 401)

    const now = new Date()
    const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const dateFromToday = (offset) =>
      new Date(utcToday - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const tomorrow = dateFromToday(-1)
    const futureDonation = await fetch(`${baseUrl}/api/users/profile/donation-history`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: privateCookie,
        origin: clientOrigin,
      },
      body: JSON.stringify({ donationDate: tomorrow }),
    })
    assert.equal(futureDonation.status, 400)
    assert.ok((await futureDonation.json()).fieldErrors.donationDate)
    const malformedDonation = await fetch(`${baseUrl}/api/users/profile/donation-history`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: privateCookie,
        origin: clientOrigin,
      },
      body: JSON.stringify({ donationDate: '2024-02-30' }),
    })
    assert.equal(malformedDonation.status, 400)
    assert.ok((await malformedDonation.json()).fieldErrors.donationDate)

    const joinedAt = new Date(utcToday - 300 * 24 * 60 * 60 * 1000)
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(privateUser.user.id) },
      { $set: { createdAt: joinedAt } },
    )
    const preRegistrationDonation = await fetch(`${baseUrl}/api/users/profile/donation-history`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: privateCookie,
        origin: clientOrigin,
      },
      body: JSON.stringify({ donationDate: dateFromToday(301) }),
    })
    assert.equal(preRegistrationDonation.status, 400)
    assert.ok((await preRegistrationDonation.json()).fieldErrors.donationDate)

    async function logDonation(date) {
      return fetch(`${baseUrl}/api/users/profile/donation-history`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: privateCookie,
          origin: clientOrigin,
        },
        body: JSON.stringify({ donationDate: date }),
      })
    }
    const firstLoggedDate = dateFromToday(130)
    const firstLog = await logDonation(firstLoggedDate)
    const firstLogBody = await firstLog.json()
    assert.equal(firstLog.status, 200, JSON.stringify(firstLogBody))
    const firstLoggedProfile = firstLogBody.user
    assert.equal(firstLoggedProfile.donorBadge.badge, 'Bronze Donor')
    assert.equal(firstLoggedProfile.donorBadge.totalDonations, 1)
    assert.equal(firstLoggedProfile.donorBadge.loggedDonationCount, 1)
    assert.equal(firstLoggedProfile.donorBadge.donationHistory.length, 1)
    assert.equal(firstLoggedProfile.isAvailableToDonate, true)

    const repeatedLog = await logDonation(firstLoggedDate)
    assert.equal(repeatedLog.status, 200)
    const repeatedProfile = (await repeatedLog.json()).user
    assert.equal(repeatedProfile.donorBadge.totalDonations, 1)
    assert.equal(repeatedProfile.donorBadge.donationHistory.length, 1)
    assert.equal(
      repeatedProfile.donorBadge.donationHistory[0].loggedAt,
      firstLoggedProfile.donorBadge.donationHistory[0].loggedAt,
    )

    const olderLog = await logDonation(dateFromToday(140))
    assert.equal(olderLog.status, 200)
    const olderLoggedProfile = (await olderLog.json()).user
    assert.equal(olderLoggedProfile.donorBadge.totalDonations, 2)
    assert.equal(olderLoggedProfile.lastDonationDate.slice(0, 10), firstLoggedDate)

    const newerLog = await logDonation(dateFromToday(119))
    assert.equal(newerLog.status, 200)
    const newerLoggedProfile = (await newerLog.json()).user
    assert.equal(newerLoggedProfile.donorBadge.badge, 'Silver Donor')
    assert.equal(newerLoggedProfile.donorBadge.totalDonations, 3)
    assert.equal(newerLoggedProfile.lastDonationDate.slice(0, 10), dateFromToday(119))
    assert.equal(newerLoggedProfile.isAvailableToDonate, false)
    assert.deepEqual(
      newerLoggedProfile.donorBadge.donationHistory.map(({ date }) => date),
      [dateFromToday(119), firstLoggedDate, dateFromToday(140)],
    )

    const publicExperiences = await fetch(`${baseUrl}/api/experiences`)
    assert.equal(publicExperiences.status, 200)
    assert.equal(Array.isArray((await publicExperiences.json()).experiences), true)
    assert.equal(
      (
        await fetch(`${baseUrl}/api/experiences/mine`)
      ).status,
      401,
    )
    const protectedExperienceCreate = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { origin: clientOrigin },
    })
    assert.equal(protectedExperienceCreate.status, 401)

    const photoBytes = await sharp({
      create: { width: 1, height: 1, channels: 4, background: '#ec2633' },
    }).png().toBuffer()
    const profilePhoto = new FormData()
    profilePhoto.append('photo', new Blob([photoBytes], { type: 'image/png' }), 'profile.png')
    const uploadedProfilePhoto = await fetch(`${baseUrl}/api/users/profile/photo`, {
      method: 'PUT',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: profilePhoto,
    })
    assert.equal(uploadedProfilePhoto.status, 200)
    const uploadedProfile = (await uploadedProfilePhoto.json()).user
    profilePhotoUrl = uploadedProfile.profilePhotoUrl
    assert.match(profilePhotoUrl, /^\/api\/uploads\/avatars\/[a-f0-9-]+\.webp$/i)
    assert.equal((await fetch(`${baseUrl}${profilePhotoUrl}`)).status, 200)
    assert.equal(
      (await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: sessionCookie } })).status,
      200,
    )
    function experienceForm({
      message = 'রক্তদানের পর মনে হয়েছে, আমার ছোট্ট কাজটি কারও জীবনে বড় পরিবর্তন এনেছে।',
      donationDate = '2026-10-01',
      donationCount = '3',
      publicConsent = 'true',
      photoCount = 1,
    } = {}) {
      const form = new FormData()
      form.set('message', message)
      form.set('donationDate', donationDate)
      form.set('donationCount', donationCount)
      form.set('publicConsent', publicConsent)
      for (let index = 0; index < photoCount; index += 1) {
        form.append('photos', new Blob([photoBytes], { type: 'image/png' }), `donor-${index + 1}.png`)
      }
      return form
    }

    const invalidExperience = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: experienceForm({ message: 'Too short' }),
    })
    assert.equal(invalidExperience.status, 400)
    const invalidExperienceBody = await invalidExperience.json()
    assert.equal(invalidExperienceBody.success, false)
    assert.ok(invalidExperienceBody.errors.message)

    const missingPhoto = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: experienceForm({ photoCount: 0 }),
    })
    assert.equal(missingPhoto.status, 400)
    assert.equal((await missingPhoto.json()).code, 'INVALID_PHOTO_COUNT')

    const invalidDonationDate = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: experienceForm({ donationDate: '' }),
    })
    assert.equal(invalidDonationDate.status, 400)
    assert.match((await invalidDonationDate.json()).errors.donationDate, /valid donation date/i)

    const invalidImageForm = experienceForm()
    invalidImageForm.delete('photos')
    invalidImageForm.append(
      'photos',
      new Blob([Buffer.concat([photoBytes.subarray(0, 8), Buffer.from('not really png')])], {
        type: 'image/png',
      }),
      'fake.png',
    )
    const invalidImage = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: invalidImageForm,
    })
    assert.equal(invalidImage.status, 400)
    assert.equal((await invalidImage.json()).code, 'INVALID_PHOTO_CONTENT')

    const oversizedPhotoForm = experienceForm()
    oversizedPhotoForm.delete('photos')
    oversizedPhotoForm.append(
      'photos',
      new Blob([Buffer.concat([photoBytes, Buffer.alloc(5 * 1024 * 1024)])], { type: 'image/png' }),
      'large.png',
    )
    const oversizedPhoto = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: oversizedPhotoForm,
    })
    assert.equal(oversizedPhoto.status, 413)
    assert.equal((await oversizedPhoto.json()).code, 'PHOTO_TOO_LARGE')

    const unconsentedExperience = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: experienceForm({ publicConsent: 'false' }),
    })
    assert.equal(unconsentedExperience.status, 400)
    assert.ok((await unconsentedExperience.json()).fieldErrors.publicConsent)

    await User.updateOne({ _id: privateUser.user.id }, { $set: { location: '' } })
    const legacyProfileSubmission = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: privateCookie, origin: clientOrigin },
      body: experienceForm({ donationCount: '' }),
    })
    assert.equal(legacyProfileSubmission.status, 201)
    const legacyExperience = (await legacyProfileSubmission.json()).data.experience
    const storedLegacyExperience = await Experience.findById(legacyExperience.id)
    assert.equal(storedLegacyExperience.userId.toString(), privateUser.user.id)
    assert.equal(storedLegacyExperience.location, '')
    assert.equal('donationCount' in legacyExperience, false)
    const removeLegacyExperience = await fetch(`${baseUrl}/api/experiences/${legacyExperience.id}`, {
      method: 'DELETE',
      headers: { cookie: privateCookie, origin: clientOrigin },
    })
    assert.equal(removeLegacyExperience.status, 204)
    await User.updateOne({ _id: privateUser.user.id }, { $set: { location: 'গুলশান' } })

    const createForm = experienceForm({ photoCount: 5 })
    createForm.set('userId', privateUser.user.id)
    createForm.set('ownerId', privateUser.user.id)
    const createdExperienceResponse = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: createForm,
    })
    assert.equal(createdExperienceResponse.status, 201)
    const createdExperienceBody = await createdExperienceResponse.json()
    assert.equal(createdExperienceBody.success, true)
    createdExperience = createdExperienceBody.data.experience
    let ownProfile = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { cookie: sessionCookie },
    }).then((response) => response.json()).then(({ user }) => user)
    assert.equal(ownProfile.donorBadge.badge, 'Silver Donor')
    assert.equal(ownProfile.donorBadge.totalDonations, 4)
    assert.equal(ownProfile.donorBadge.donationHistory.length, 0)

    const additionalDonation = await Experience.create({
      userId: registered.user.id,
      donorName: registered.user.fullName,
      publicUserId: registered.user.userId,
      bloodGroup: registered.user.bloodGroup,
      division: registered.user.division,
      district: registered.user.district,
      location: registered.user.location,
      donationDate: new Date('2026-09-20T00:00:00.000Z'),
      donationCount: 6,
      message: 'A second actual donation experience for badge integration testing.',
      images: [createdExperience.photoUrl],
      photoUrl: createdExperience.photoUrl,
      publicConsent: true,
      isPublic: false,
      status: 'pending',
    })
    badgeHistoryFixtureId = additionalDonation.id
    ownProfile = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { cookie: sessionCookie },
    }).then((response) => response.json()).then(({ user }) => user)
    assert.equal(ownProfile.donorBadge.badge, 'Silver Donor')
    assert.equal(ownProfile.donorBadge.totalDonations, 4)
    assert.equal(ownProfile.donorBadge.donationHistory.length, 0)
    await Experience.deleteOne({ _id: badgeHistoryFixtureId })
    badgeHistoryFixtureId = null
    ownProfile = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { cookie: sessionCookie },
    }).then((response) => response.json()).then(({ user }) => user)
    assert.equal(ownProfile.donorBadge.badge, 'Silver Donor')
    assert.equal(ownProfile.donorBadge.totalDonations, 4)
    assert.equal(createdExperience.status, 'pending')
    assert.equal(createdExperience.isPublic, true)
    assert.equal(createdExperience.donorId, registered.user.id)
    assert.equal(createdExperience.donorName, 'Updated Test Donor')
    assert.equal(createdExperience.bloodGroup, 'B+')
    assert.equal(createdExperience.location, 'উত্তরা')
    assert.equal(createdExperience.images.length, 5)
    assert.equal(createdExperience.donationCount, 3)
    assert.equal('email' in createdExperience, false)
    assert.equal('passwordHash' in createdExperience, false)
    const pendingPublicList = await fetch(`${baseUrl}/api/experiences`)
    assert.equal(
      (await pendingPublicList.json()).experiences.some(({ id }) => id === createdExperience.id),
      false,
    )
    assert.equal((await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`)).status, 404)
    const mineList = await fetch(`${baseUrl}/api/experiences/mine`, {
      headers: { cookie: sessionCookie },
    })
    assert.equal((await mineList.json()).experiences[0].status, 'pending')
    const unauthenticatedModerationQueue = await fetch(`${baseUrl}/api/experiences/moderation/queue`)
    assert.equal(unauthenticatedModerationQueue.status, 401)
    const unauthorizedModerationQueue = await fetch(`${baseUrl}/api/experiences/moderation/queue`, {
      headers: { cookie: privateCookie },
    })
    assert.equal(unauthorizedModerationQueue.status, 403)
    const unauthorizedApproval = await fetch(
      `${baseUrl}/api/experiences/${createdExperience.id}/moderation`,
      {
        method: 'PATCH',
        headers: {
          cookie: privateCookie,
          origin: clientOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      },
    )
    assert.equal(unauthorizedApproval.status, 403)
    assert.equal((await Experience.findById(createdExperience.id).lean()).status, 'pending')
    process.env.EXPERIENCE_MODERATOR_USER_IDS = registered.user.userId.toLowerCase()
    const authenticatedUser = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: sessionCookie },
    })
    assert.equal((await authenticatedUser.json()).user.isExperienceModerator, true)
    const moderationQueue = await fetch(`${baseUrl}/api/experiences/moderation/queue`, {
      headers: { cookie: sessionCookie },
    })
    assert.equal(moderationQueue.status, 200)
    assert.ok((await moderationQueue.json()).experiences.some(({ id }) => id === createdExperience.id))
    const approvedByModerator = await fetch(
      `${baseUrl}/api/experiences/${createdExperience.id}/moderation`,
      {
        method: 'PATCH',
        headers: {
          cookie: sessionCookie,
          origin: clientOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      },
    )
    assert.equal(approvedByModerator.status, 200)
    const approvedResponse = await approvedByModerator.json()
    assert.equal(approvedResponse.experience.status, 'approved')
    assert.equal(approvedResponse.experience.isPublic, true)
    const approvedInDatabase = await Experience.findById(createdExperience.id).lean()
    assert.equal(approvedInDatabase.status, 'approved')
    assert.equal(approvedInDatabase.isPublic, true)
    const storedImage = await fetch(`${baseUrl}${createdExperience.images[0]}`)
    assert.equal(storedImage.status, 200)
    assert.equal(storedImage.headers.get('content-type'), 'image/webp')
    for (const imageUrl of createdExperience.images) {
      assert.equal((await fetch(`${baseUrl}${imageUrl}`)).status, 200)
    }

    const sixPhotoForm = experienceForm()
    sixPhotoForm.delete('photos')
    for (let index = 0; index < 6; index += 1) {
      sixPhotoForm.append('photos', new Blob([photoBytes], { type: 'image/png' }), `donor-${index + 1}.png`)
    }
    const tooManyPhotos = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: sixPhotoForm,
    })
    assert.equal(tooManyPhotos.status, 400)
    assert.equal((await tooManyPhotos.json()).code, 'TOO_MANY_PHOTOS')

    const unauthorizedUpdate = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'PATCH',
      headers: { cookie: privateCookie, origin: clientOrigin },
      body: experienceForm({ photoCount: 0 }),
    })
    assert.equal(unauthorizedUpdate.status, 404)
    const unauthorizedDelete = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'DELETE',
      headers: { cookie: privateCookie, origin: clientOrigin },
    })
    assert.equal(unauthorizedDelete.status, 404)

    await Experience.findByIdAndUpdate(createdExperience.id, { isPublic: false })
    const privateApprovedList = await fetch(`${baseUrl}/api/experiences?page=1&limit=24`)
    assert.equal(
      (await privateApprovedList.json()).experiences.some(({ id }) => id === createdExperience.id),
      false,
    )
    assert.equal((await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`)).status, 404)
    const profileExperiencesWhenPrivate = await fetch(
      `${baseUrl}/api/users/${registered.user.id}/experiences`,
    )
    assert.equal(
      (await profileExperiencesWhenPrivate.json()).experiences.some(
        ({ id }) => id === createdExperience.id,
      ),
      false,
    )
    await Experience.findByIdAndUpdate(createdExperience.id, { isPublic: true })
    const rejectedByModerator = await fetch(
      `${baseUrl}/api/experiences/${createdExperience.id}/moderation`,
      {
        method: 'PATCH',
        headers: {
          cookie: sessionCookie,
          origin: clientOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      },
    )
    assert.equal(rejectedByModerator.status, 404)
    await Experience.findByIdAndUpdate(createdExperience.id, { status: 'pending' })
    const moderationRejection = await fetch(
      `${baseUrl}/api/experiences/${createdExperience.id}/moderation`,
      {
        method: 'PATCH',
        headers: {
          cookie: sessionCookie,
          origin: clientOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      },
    )
    assert.equal(moderationRejection.status, 200)
    assert.equal((await moderationRejection.json()).experience.status, 'rejected')
    const rejectedPublicList = await fetch(`${baseUrl}/api/experiences?page=1&limit=24`)
    assert.equal(
      (await rejectedPublicList.json()).experiences.some(({ id }) => id === createdExperience.id),
      false,
    )
    assert.equal((await fetch(`${baseUrl}/api/experiences/${createdExperience.id}/comments`)).status, 404)
    await Experience.findByIdAndUpdate(createdExperience.id, { status: 'approved' })
    const approvedPublicList = await fetch(`${baseUrl}/api/experiences?page=1&limit=24`)
    const approvedResult = await approvedPublicList.json()
    assert.equal(approvedResult.experiences.some(({ id }) => id === createdExperience.id), true)
    assert.equal(approvedResult.pagination.limit, 24)
    const approvedExperience = approvedResult.experiences.find(({ id }) => id === createdExperience.id)
    assert.equal(approvedExperience.profilePhotoUrl, profilePhotoUrl)
    assert.equal(approvedExperience.reactionCount, 0)
    assert.equal(approvedExperience.commentCount, 0)

    await Experience.updateOne(
      { _id: createdExperience.id },
      { $set: { createdAt: new Date(Date.now() - 60_000) } },
      { timestamps: false },
    )
    const otherDonorExperience = await Experience.create({
      userId: privateUser.user.id,
      donorName: 'Private Donor',
      publicUserId: privateUser.user.userId,
      bloodGroup: 'O+',
      division: 'ঢাকা',
      district: 'ঢাকা',
      location: 'গুলশান',
      donationDate: new Date('2026-09-01T00:00:00.000Z'),
      message: 'অন্য একজন দাতার অনুমোদিত রক্তদানের গল্পটি এখানে আছে।',
      images: ['/api/uploads/experiences/test-fixture.webp'],
      photoUrl: '/api/uploads/experiences/test-fixture.webp',
      publicConsent: true,
      isPublic: true,
      status: 'approved',
    })
    otherDonorExperienceId = otherDonorExperience.id
    const limitedExperienceProfile = await fetch(
      `${baseUrl}/api/users/${privateUser.user.id}/profile`,
    )
    assert.equal(limitedExperienceProfile.status, 200)
    const limitedExperienceProfileData = (await limitedExperienceProfile.json()).user
    assert.equal(limitedExperienceProfileData.limitedPublicProfile, true)
    assert.equal('phone' in limitedExperienceProfileData, false)
    assert.equal('whatsappNumber' in limitedExperienceProfileData, false)
    assert.equal('latitude' in limitedExperienceProfileData, false)
    const feedWithMultipleDonors = await fetch(`${baseUrl}/api/experiences?page=1&limit=24`)
    const multipleDonorData = await feedWithMultipleDonors.json()
    assert.equal(multipleDonorData.experiences.some(({ id }) => id === createdExperience.id), true)
    assert.equal(multipleDonorData.experiences.some(({ id }) => id === otherDonorExperienceId), true)
    assert.equal(multipleDonorData.experiences[0].id, otherDonorExperienceId)
    const authenticatedPublicFeed = await fetch(`${baseUrl}/api/experiences?page=1&limit=24`, {
      headers: { cookie: sessionCookie },
    })
    const authenticatedFeedData = await authenticatedPublicFeed.json()
    assert.deepEqual(
      authenticatedFeedData.experiences.map(({ id }) => id),
      multipleDonorData.experiences.map(({ id }) => id),
    )
    await Experience.deleteOne({ _id: otherDonorExperienceId })
    otherDonorExperienceId = null

    const publicDonorProfile = await fetch(`${baseUrl}/api/users/${registered.user.id}/profile`)
    assert.equal(publicDonorProfile.status, 200)
    const publicDonorData = (await publicDonorProfile.json()).user
    assert.equal(publicDonorData.donorBadge.badge, 'Silver Donor')
    assert.equal(publicDonorData.donorBadge.totalDonations, 4)
    assert.equal('donationHistory' in publicDonorData.donorBadge, false)
    assert.equal('loggedDonationCount' in publicDonorData.donorBadge, false)
    assert.equal('previousBloodDonations' in publicDonorData.donorBadge, false)
    assert.equal(publicDonorData.profilePhotoUrl, profilePhotoUrl)
    assert.equal('email' in publicDonorData, false)
    assert.equal(publicDonorData.phone, '01812345678')
    assert.equal(publicDonorData.whatsappNumber, userDetails.whatsappNumber)
    assert.equal(publicDonorData.upazila, userDetails.upazila)
    assert.equal(publicDonorData.previousBloodDonations, userDetails.previousBloodDonations)
    assert.equal('latitude' in publicDonorData, false)
    assert.equal('longitude' in publicDonorData, false)
    const donorProfileExperiences = await fetch(`${baseUrl}/api/users/${registered.user.id}/experiences`)
    assert.equal((await donorProfileExperiences.json()).experiences[0].id, createdExperience.id)

    const reactionPath = `${baseUrl}/api/experiences/${createdExperience.id}/reactions`
    assert.equal((await fetch(reactionPath, { method: 'POST', headers: { origin: clientOrigin } })).status, 401)
    assert.deepEqual(await (await fetch(reactionPath)).json().then(({ data }) => data), {
      count: 0,
      currentReaction: null,
    })
    async function react(cookie, type) {
      return fetch(reactionPath, {
        method: 'POST',
        headers: {
          cookie,
          origin: clientOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ type }),
      })
    }
    const firstReaction = await react(sessionCookie, 'love')
    assert.deepEqual(await firstReaction.json().then(({ data }) => data), {
      count: 1,
      currentReaction: 'love',
    })
    const toggledOffReaction = await react(sessionCookie, 'love')
    assert.deepEqual(await toggledOffReaction.json().then(({ data }) => data), {
      count: 0,
      currentReaction: null,
    })
    await react(sessionCookie, 'love')
    const changedReaction = await react(sessionCookie, 'like')
    assert.deepEqual(await changedReaction.json().then(({ data }) => data), {
      count: 1,
      currentReaction: 'like',
    })
    assert.equal(await ExperienceReaction.countDocuments({ experienceId: createdExperience.id }), 1)
    const secondReaction = await react(privateCookie, 'love')
    assert.deepEqual(await secondReaction.json().then(({ data }) => data), {
      count: 2,
      currentReaction: 'love',
    })
    const removeSecondReaction = await fetch(reactionPath, {
      method: 'DELETE',
      headers: { cookie: privateCookie, origin: clientOrigin },
    })
    assert.deepEqual(await removeSecondReaction.json().then(({ data }) => data), {
      count: 1,
      currentReaction: null,
    })

    const commentPath = `${baseUrl}/api/experiences/${createdExperience.id}/comments`
    assert.equal((await fetch(commentPath)).status, 200)
    assert.equal(
      (await fetch(commentPath, {
        method: 'POST',
        headers: { origin: clientOrigin, 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'A public comment' }),
      })).status,
      401,
    )
    async function postComment(cookie, content) {
      return fetch(commentPath, {
        method: 'POST',
        headers: { cookie, origin: clientOrigin, 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    }
    const ownCommentResponse = await postComment(sessionCookie, 'আপনার গল্পটি অনুপ্রেরণাদায়ক।')
    assert.equal(ownCommentResponse.status, 201)
    const ownComment = (await ownCommentResponse.json()).comment
    assert.equal(ownComment.author.profilePhotoUrl, profilePhotoUrl)
    const otherCommentResponse = await postComment(privateCookie, 'রক্তদান সত্যিই মহৎ কাজ।')
    assert.equal(otherCommentResponse.status, 201)
    const otherComment = (await otherCommentResponse.json()).comment
    assert.equal(otherComment.author.fullName, 'Private Donor')
    const privateCommenterProfile = await fetch(`${baseUrl}/api/users/${privateUser.user.id}/profile`)
    assert.equal(privateCommenterProfile.status, 200)
    const privateCommenterData = (await privateCommenterProfile.json()).user
    assert.equal(privateCommenterData.fullName, 'Private Donor')
    assert.equal(privateCommenterData.limitedPublicProfile, true)
    assert.equal('location' in privateCommenterData, false)
    assert.equal('email' in privateCommenterData, false)
    assert.equal('phone' in privateCommenterData, false)
    const paginatedComments = await fetch(`${commentPath}?page=1&limit=1`)
    const paginatedCommentData = await paginatedComments.json()
    assert.equal(paginatedCommentData.pagination.pages, 2)
    assert.equal(paginatedCommentData.comments.length, 1)
    const allComments = await fetch(commentPath, { headers: { cookie: sessionCookie } })
    assert.equal((await allComments.json()).pagination.total, 2)

    const updatedOwnComment = await fetch(`${baseUrl}/api/comments/${ownComment.id}`, {
      method: 'PATCH',
      headers: { cookie: sessionCookie, origin: clientOrigin, 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'আপনার গল্পটি সত্যিই অনুপ্রেরণাদায়ক।' }),
    })
    assert.equal((await updatedOwnComment.json()).comment.content, 'আপনার গল্পটি সত্যিই অনুপ্রেরণাদায়ক।')
    const unauthorizedCommentEdit = await fetch(`${baseUrl}/api/comments/${ownComment.id}`, {
      method: 'PATCH',
      headers: { cookie: privateCookie, origin: clientOrigin, 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'অন্যের মন্তব্য বদলানোর চেষ্টা।' }),
    })
    assert.equal(unauthorizedCommentEdit.status, 404)
    const unauthorizedCommentDelete = await fetch(`${baseUrl}/api/comments/${otherComment.id}`, {
      method: 'DELETE',
      headers: { cookie: sessionCookie, origin: clientOrigin },
    })
    assert.equal(unauthorizedCommentDelete.status, 404)
    assert.equal((await fetch(`${baseUrl}/api/comments/${ownComment.id}`, {
      method: 'DELETE',
      headers: { cookie: sessionCookie, origin: clientOrigin },
    })).status, 204)
    assert.equal((await fetch(`${baseUrl}/api/comments/${otherComment.id}`, {
      method: 'DELETE',
      headers: { cookie: privateCookie, origin: clientOrigin },
    })).status, 204)
    assert.equal(await ExperienceComment.countDocuments({ experienceId: createdExperience.id }), 0)
    const remainingComment = await postComment(sessionCookie, 'এই পোস্টটি রক্তদানে উৎসাহ জোগায়।')
    assert.equal(remainingComment.status, 201)

    const publicExperience = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`)
    assert.equal(publicExperience.status, 200)

    const emptyImageUpdate = experienceForm({
      message: 'রক্ত দেওয়ার অভিজ্ঞতা আমাকে আরও সহানুভূতিশীল ও আশাবাদী করেছে।',
      photoCount: 0,
    })
    emptyImageUpdate.set('existingImages', '[]')
    const rejectedEmptyImageUpdate = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'PATCH',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: emptyImageUpdate,
    })
    assert.equal(rejectedEmptyImageUpdate.status, 400)
    assert.equal((await rejectedEmptyImageUpdate.json()).code, 'INVALID_PHOTO_COUNT')

    const foreignImageUpdate = experienceForm({ photoCount: 0 })
    foreignImageUpdate.set(
      'existingImages',
      JSON.stringify([createdExperience.images[0], '/api/uploads/experiences/not-owned.webp']),
    )
    const rejectedForeignImageUpdate = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'PATCH',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: foreignImageUpdate,
    })
    assert.equal(rejectedForeignImageUpdate.status, 400)
    assert.equal((await rejectedForeignImageUpdate.json()).code, 'INVALID_PHOTO_SELECTION')

    const overLimitImageUpdate = experienceForm({ photoCount: 0 })
    overLimitImageUpdate.set('existingImages', JSON.stringify(createdExperience.images))
    overLimitImageUpdate.append('photos', new Blob([photoBytes], { type: 'image/png' }), 'sixth.png')
    const rejectedOverLimitImageUpdate = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'PATCH',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: overLimitImageUpdate,
    })
    assert.equal(rejectedOverLimitImageUpdate.status, 400)
    assert.equal((await rejectedOverLimitImageUpdate.json()).code, 'INVALID_PHOTO_COUNT')

    const editForm = experienceForm({
      message: 'রক্ত দেওয়ার অভিজ্ঞতা আমাকে আরও সহানুভূতিশীল ও আশাবাদী করেছে।',
      photoCount: 0,
    })
    editForm.set('existingImages', JSON.stringify(createdExperience.images.slice(0, 2)))
    editForm.append('photos', new Blob([photoBytes], { type: 'image/png' }), 'replacement.png')
    const updatedExperience = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'PATCH',
      headers: { cookie: sessionCookie, origin: clientOrigin },
      body: editForm,
    })
    assert.equal(updatedExperience.status, 200)
    const editedExperience = (await updatedExperience.json()).experience
    assert.equal(editedExperience.status, 'pending')
    assert.equal(editedExperience.message, 'রক্ত দেওয়ার অভিজ্ঞতা আমাকে আরও সহানুভূতিশীল ও আশাবাদী করেছে।')
    assert.deepEqual(editedExperience.images.slice(0, 2), createdExperience.images.slice(0, 2))
    assert.equal(editedExperience.images.length, 3)
    assert.equal((await fetch(`${baseUrl}${editedExperience.images[2]}`)).status, 200)
    assert.equal((await fetch(`${baseUrl}${createdExperience.images[2]}`)).status, 404)
    assert.equal((await fetch(reactionPath)).status, 404)
    assert.equal((await fetch(commentPath)).status, 404)

    const deletedExperience = await fetch(`${baseUrl}/api/experiences/${createdExperience.id}`, {
      method: 'DELETE',
      headers: { cookie: sessionCookie, origin: clientOrigin },
    })
    assert.equal(deletedExperience.status, 204)
    assert.equal(await ExperienceReaction.countDocuments({ experienceId: createdExperience.id }), 0)
    assert.equal(await ExperienceComment.countDocuments({ experienceId: createdExperience.id }), 0)
    assert.equal((await fetch(`${baseUrl}${createdExperience.images[0]}`)).status, 404)

    await User.updateOne(
      { email },
      { $set: { createdAt: new Date('2026-01-01T00:00:00.000Z') } },
      { timestamps: false },
    )
    await User.updateOne(
      { email: unavailableEmail },
      { $set: { createdAt: new Date('2026-02-01T00:00:00.000Z') } },
      { timestamps: false },
    )
    await User.updateOne(
      { email: privateEmail },
      { $set: { createdAt: new Date('2026-03-01T00:00:00.000Z') } },
      { timestamps: false },
    )

    const availableDonors = await fetch(
      `${baseUrl}/api/donors?${new URLSearchParams({
        availability: 'available',
        bloodGroup: 'B+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        location: 'উত্তরা',
      })}`,
    )
    assert.equal(availableDonors.status, 200)
    const availableResult = await availableDonors.json()
    assert.equal(availableResult.pagination.total, 1)
    assert.equal(availableResult.donors[0].fullName, 'Updated Test Donor')
    assert.equal('email' in availableResult.donors[0], false)
    assert.equal(availableResult.donors[0].phone, '01812345678')
    assert.equal(availableResult.donors[0].isAvailableToDonate, true)
    assert.equal(availableResult.donors[0].donorBadge.badge, 'Silver Donor')
    assert.equal(availableResult.donors[0].donorBadge.totalDonations, 4)
    assert.equal('donationHistory' in availableResult.donors[0].donorBadge, false)
    assert.equal('loggedDonationCount' in availableResult.donors[0].donorBadge, false)
    assert.equal(availableResult.donors[0].upazila, 'সাভার')
    assert.equal('latitude' in availableResult.donors[0], false)
    assert.equal('longitude' in availableResult.donors[0], false)
    const filteredByUpazila = await fetch(`${baseUrl}/api/donors?district=${encodeURIComponent('ঢাকা')}&division=${encodeURIComponent('ঢাকা')}&upazila=${encodeURIComponent('সাভার')}&availability=all`)
    assert.equal(filteredByUpazila.status, 200)
    assert.equal((await filteredByUpazila.json()).pagination.total, 2)

    const unavailableDonors = await fetch(`${baseUrl}/api/donors?availability=unavailable`)
    assert.equal(unavailableDonors.status, 200)
    assert.equal((await unavailableDonors.json()).pagination.total, 1)
    const allDonors = await fetch(`${baseUrl}/api/donors?availability=all&limit=50`)
    const allDonorData = (await allDonors.json()).donors
    const contactPrivateDonor = allDonorData.find(({ fullName }) => fullName === 'Unavailable Donor')
    assert.ok(contactPrivateDonor)
    assert.equal('phone' in contactPrivateDonor, false)
    assert.equal('whatsappNumber' in contactPrivateDonor, false)
    const privateContactProfile = await fetch(`${baseUrl}/api/users/${unavailableUser.user.id}/profile`)
    assert.equal(privateContactProfile.status, 200)
    const privateContactProfileData = (await privateContactProfile.json()).user
    assert.equal('phone' in privateContactProfileData, false)
    assert.equal('whatsappNumber' in privateContactProfileData, false)
    const allPublicDonors = await fetch(`${baseUrl}/api/donors?availability=all&limit=1`)
    const publicResult = await allPublicDonors.json()
    assert.equal(publicResult.pagination.total, 2)
    assert.equal(publicResult.pagination.pages, 2)
    const recentDonors = await fetch(`${baseUrl}/api/donors?sort=recent&availability=all&limit=2`)
    const recentResult = await recentDonors.json()
    assert.equal(recentResult.donors[0].fullName, 'Unavailable Donor')
    assert.equal(recentResult.donors[1].fullName, 'Updated Test Donor')
    assert.equal(new Date(recentResult.donors[0].createdAt) > new Date(recentResult.donors[1].createdAt), true)
    assert.equal('email' in recentResult.donors[0], false)
    const leaderboardHistory = (count, duplicateFirst = false) => {
      const dates = Array.from({ length: count }, (_, index) => ({
        donationDate: new Date(Date.UTC(2024, 0, index + 1)),
        loggedAt: new Date(Date.UTC(2024, 0, index + 1, 12)),
      }))
      return duplicateFirst && dates.length
        ? [...dates, { ...dates[0] }]
        : dates
    }
    await Promise.all([
      User.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(registered.user.id) },
        {
          $set: {
            previousBloodDonations: 3,
            donationHistory: leaderboardHistory(5, true),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ),
      User.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(unavailableUser.user.id) },
        {
          $set: {
            previousBloodDonations: 1,
            donationHistory: leaderboardHistory(6),
            createdAt: new Date('2026-02-01T00:00:00.000Z'),
          },
        },
      ),
      User.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(privateUser.user.id) },
        {
          $set: {
            isSearchable: true,
            isContactPublic: true,
            previousBloodDonations: 5,
            donationHistory: leaderboardHistory(1),
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
          },
        },
      ),
    ])
    const leaderboardResponse = await fetch(`${baseUrl}/api/leaderboard/donors`)
    assert.equal(leaderboardResponse.status, 200)
    const leaderboardData = await leaderboardResponse.json()
    assert.deepEqual(leaderboardData.donors.map(({ id, rank, totalLifetimeDonations }) => ({
      id,
      rank,
      totalLifetimeDonations,
    })), [
      { id: registered.user.id, rank: 1, totalLifetimeDonations: 8 },
      { id: unavailableUser.user.id, rank: 2, totalLifetimeDonations: 7 },
      { id: privateUser.user.id, rank: 3, totalLifetimeDonations: 6 },
    ])
    assert.equal(leaderboardData.donors[0].loggedDonationCount, 5)
    assert.equal(leaderboardData.donors[0].donorBadge.badge, 'Gold Donor')
    assert.equal(leaderboardData.donors[0].isAvailableToDonate, true)
    for (const donor of leaderboardData.donors) {
      for (const privateField of [
        'email', 'phone', 'whatsappNumber', 'password', 'passwordHash', 'token',
        'latitude', 'longitude', 'donationHistory', 'uniqueDonationDates',
      ]) {
        assert.equal(privateField in donor, false)
      }
    }
    assert.equal((await fetch(`${baseUrl}/api/donors/${registered.user.id}`)).status, 200)

    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(privateUser.user.id) },
      { $set: { previousBloodDonations: 0, donationHistory: [] } },
    )
    const withoutZeroDonor = await fetch(`${baseUrl}/api/leaderboard/donors`)
      .then((response) => response.json())
    assert.deepEqual(withoutZeroDonor.donors.map(({ id }) => id), [
      registered.user.id,
      unavailableUser.user.id,
    ])
    await Promise.all([registered.user.id, unavailableUser.user.id].map((id) =>
      User.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { previousBloodDonations: 0, donationHistory: [] } },
      )))
    assert.deepEqual(
      await fetch(`${baseUrl}/api/leaderboard/donors`).then((response) => response.json()),
      { status: 'ok', donors: [] },
    )

    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(unavailableUser.user.id) },
      { $set: { previousBloodDonations: 1, donationHistory: leaderboardHistory(6) } },
    )
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(registered.user.id) },
      { $set: { previousBloodDonations: 3, donationHistory: leaderboardHistory(5, true) } },
    )
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(privateUser.user.id) },
      { $set: { previousBloodDonations: 1, donationHistory: leaderboardHistory(6) } },
    )
    const tiedLeaderboard = await fetch(`${baseUrl}/api/leaderboard/donors`)
      .then((response) => response.json())
    assert.deepEqual(tiedLeaderboard.donors.slice(1).map(({ id }) => id), [
      privateUser.user.id,
      unavailableUser.user.id,
    ])
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(unavailableUser.user.id) },
      { $set: { donationHistory: leaderboardHistory(7) } },
    )
    const updatedLeaderboard = await fetch(`${baseUrl}/api/leaderboard/donors`)
      .then((response) => response.json())
    assert.deepEqual(updatedLeaderboard.donors.slice(0, 2).map(({ id, totalLifetimeDonations }) => ({
      id,
      totalLifetimeDonations,
    })), [
      { id: unavailableUser.user.id, totalLifetimeDonations: 8 },
      { id: registered.user.id, totalLifetimeDonations: 8 },
    ])
    const ownLeaderboard = await fetch(`${baseUrl}/api/leaderboard/donors`, {
      headers: { cookie: sessionCookie },
    }).then((response) => response.json())
    assert.ok(ownLeaderboard.donors.some(({ id }) => id === registered.user.id))

    const hiddenProfile = await fetch(`${baseUrl}/api/donors/${privateUser.user.id}`)
    assert.equal(hiddenProfile.status, 200)
    const publicProfile = await fetch(`${baseUrl}/api/donors/${registered.user.id}`)
    assert.equal(publicProfile.status, 200)
    assert.equal('email' in (await publicProfile.json()).donor, false)
    const invalidFilters = await fetch(`${baseUrl}/api/donors?limit=500`)
    assert.equal(invalidFilters.status, 400)
    const invalidAvailability = await fetch(`${baseUrl}/api/donors?availability%5B%5D=available`)
    assert.equal(invalidAvailability.status, 400)
    const invalidSort = await fetch(`${baseUrl}/api/donors?sort=oldest`)
    assert.equal(invalidSort.status, 400)

    const invalidLogin = await request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'incorrect-password' }),
    })
    assert.equal(invalidLogin.status, 401)

    const emailLogin = await request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: userDetails.password }),
    })
    assert.equal(emailLogin.status, 200)

    const userIdLogin = await request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: registered.user.userId, password: userDetails.password }),
    })
    assert.equal(userIdLogin.status, 200)
    const loginCookie = userIdLogin.headers.getSetCookie()[0].split(';')[0]
    const loggedInUser = await request('/me', { headers: { cookie: loginCookie } })
    assert.equal(loggedInUser.status, 200)
    assert.equal((await loggedInUser.json()).user.userId, registered.user.userId)

    const logout = await request('/logout', {
      method: 'POST',
      headers: { cookie: loginCookie },
    })
    assert.equal(logout.status, 204)
    assert.match(logout.headers.getSetCookie()[0], /Expires=/i)
    assert.equal((await request('/me')).status, 401)

    const storedUser = await User.findOne({ email }).select('+passwordHash')
    assert.ok(storedUser.passwordHash.startsWith('$2'))
    assert.notEqual(storedUser.passwordHash, userDetails.password)

    const deletion = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'DELETE',
      headers: { cookie: sessionCookie, origin: clientOrigin },
    })
    assert.equal(deletion.status, 204)
    assert.match(deletion.headers.getSetCookie()[0], /Expires=/i)
    assert.equal((await request('/me', { headers: { cookie: sessionCookie } })).status, 401)
    assert.equal(await User.findById(registered.user.id), null)
    assert.equal((await fetch(`${baseUrl}${profilePhotoUrl}`)).status, 404)
  } finally {
    if (originalExperienceModeratorIds === undefined) {
      delete process.env.EXPERIENCE_MODERATOR_USER_IDS
    } else {
      process.env.EXPERIENCE_MODERATOR_USER_IDS = originalExperienceModeratorIds
    }
    if (otherDonorExperienceId && mongoose.connection.readyState === 1) {
      await Experience.deleteOne({ _id: otherDonorExperienceId })
    }
    if (badgeHistoryFixtureId && mongoose.connection.readyState === 1) {
      await Experience.deleteOne({ _id: badgeHistoryFixtureId })
    }
    if (createdExperience) {
      await removeImages(createdExperience.images || [createdExperience.photoUrl])
      if (mongoose.connection.readyState === 1) {
        await ExperienceReaction.deleteMany({ experienceId: createdExperience.id })
        await ExperienceComment.deleteMany({ experienceId: createdExperience.id })
        await Experience.deleteOne({
          _id: createdExperience.id,
          publicUserId: createdExperience.publicUserId,
        })
      }
    }
    await User.deleteMany({ email: { $in: [email, unavailableEmail, privateEmail] } }).catch(() => {})
    if (invalidBloodGroupFixtureIds.length && mongoose.connection.readyState === 1) {
      await User.deleteMany({ _id: { $in: invalidBloodGroupFixtureIds } }).catch(() => {})
    }
    if (profilePhotoUrl) {
      const { removeAvatar } = require('../src/services/experience-image-storage')
      await removeAvatar(profilePhotoUrl).catch(() => {})
    }
    if (registrationPhotoUrl) {
      const { removeAvatar } = require('../src/services/experience-image-storage')
      await removeAvatar(registrationPhotoUrl).catch(() => {})
    }
    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()
  }
})

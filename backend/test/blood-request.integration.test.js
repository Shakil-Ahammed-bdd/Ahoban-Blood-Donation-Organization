const test = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes, randomUUID } = require('node:crypto')
const mongoose = require('mongoose')

const clientOrigin = 'http://localhost:5173'
process.env.CLIENT_URL = clientOrigin
process.env.JWT_SECRET ||= randomBytes(48).toString('base64url')

const app = require('../src/app')
const BloodRequest = require('../src/models/BloodRequest')
const Notification = require('../src/models/Notification')
const User = require('../src/models/User')
const { seedSuperAdmin } = require('../src/services/auth.service')

function isolatedDatabaseUri() {
  const uri = process.env.BLOOD_REQUEST_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ahoban-blood-request-test'
  const parsedUri = new URL(uri)
  parsedUri.pathname = `/ahoban-blood-request-test-${randomUUID()}`
  return parsedUri.toString()
}

function requestInput(overrides = {}) {
  return {
    requesterName: 'Request Test Contact',
    patientName: 'Request Test Patient',
    patientIssue: 'Patient needs blood for a scheduled operation.',
    hospitalName: 'Central Medical Hospital',
    hospitalLocation: 'সাভার, ঢাকা',
    phone: '01712345678',
    bloodGroup: 'A+',
    units: '2',
    requiredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    contactConsent: true,
    website: '',
    ...overrides,
  }
}

test('public blood requests validate, publish, filter, close securely, and rate-limit submissions', async () => {
  const server = app.listen(0, '127.0.0.1')
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    await mongoose.connect(isolatedDatabaseUri())
    await BloodRequest.init()
    await Notification.init()
    await User.init()
    const baseUrl = `http://127.0.0.1:${server.address().port}`

    async function request(path, { method = 'GET', body, cookie } = {}) {
      return fetch(`${baseUrl}/api${path}`, {
        method,
        headers: {
          origin: clientOrigin,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    }

    const regularRegistration = await request('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Blood Request User',
        email: `blood-request-user-${randomUUID()}@example.test`,
        phone: '01712345678',
        bloodGroup: 'A+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        upazila: 'সাভার',
        location: 'ঢাকা',
        password: 'a-secure-test-password',
        confirmPassword: 'a-secure-test-password',
        acceptTerms: true,
        isSearchable: true,
      },
    })
    assert.equal(regularRegistration.status, 201)
    const regularCookie = regularRegistration.headers.getSetCookie()
      .find((value) => value.startsWith('ahoban_session=')).split(';')[0]
    const seed = await seedSuperAdmin({
      email: `blood-request-super-${randomUUID()}@example.test`,
      password: 'a-secure-super-password',
      fullName: 'Blood Request Super Admin',
    })
    const superLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: seed.user.userId, password: 'a-secure-super-password' },
    })
    const superCookie = superLogin.headers.getSetCookie()
      .find((value) => value.startsWith('ahoban_session=')).split(';')[0]
    const adminCreate = await request('/admins', {
      method: 'POST',
      cookie: superCookie,
      body: {
        fullName: 'Blood Request Admin',
        email: `blood-request-admin-${randomUUID()}@example.test`,
        phone: '01812345678',
        password: 'a-secure-admin-password',
      },
    })
    assert.equal(adminCreate.status, 201)
    const createdAdmin = (await adminCreate.json()).admin
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: createdAdmin.userId, password: 'a-secure-admin-password' },
    })
    const adminCookie = adminLogin.headers.getSetCookie()
      .find((value) => value.startsWith('ahoban_session=')).split(';')[0]

    const invalid = await request('/blood-requests', {
      method: 'POST',
      body: requestInput({ phone: '01112345678' }),
    })
    assert.equal(invalid.status, 400)
    assert.ok((await invalid.json()).fieldErrors.phone)

    const createdResponse = await request('/blood-requests', {
      method: 'POST',
      body: requestInput(),
    })
    const createdBody = await createdResponse.json()
    assert.equal(createdResponse.status, 201, JSON.stringify(createdBody))
    assert.equal(createdBody.request.status, 'pending')
    assert.equal(createdBody.request.fulfillmentStatus, 'active')
    assert.equal(createdBody.request.phone, '+8801712345678')
    assert.match(createdBody.managementToken, /^[a-f0-9]{64}$/)
    const stored = await BloodRequest.findById(createdBody.request.id).select('+managementTokenHash')
    assert.notEqual(stored.managementTokenHash, createdBody.managementToken)

    const hiddenPendingResponse = await request(`/blood-requests?status=active&bloodGroup=A%2B&hospitalLocation=${encodeURIComponent('সাভার')}`)
    assert.equal((await hiddenPendingResponse.json()).pagination.total, 0)
    assert.equal((await request('/admins/blood-requests')).status, 401)
    assert.equal((await request('/admins/blood-requests', { cookie: regularCookie })).status, 403)
    const pendingResponse = await request('/admins/blood-requests?status=pending', { cookie: superCookie })
    const pendingBody = await pendingResponse.json()
    assert.equal(pendingResponse.status, 200)
    assert.equal(pendingBody.counts.pending, 1)
    assert.equal(pendingBody.requests[0].patientName, 'Request Test Patient')
    const pendingNotifications = await request('/notifications', { cookie: regularCookie })
    assert.equal((await pendingNotifications.json()).unreadCount, 0)

    const unauthorizedApproval = await request(`/admins/blood-requests/${createdBody.request.id}/moderate`, {
      method: 'PATCH',
      cookie: regularCookie,
      body: { approvalStatus: 'approved' },
    })
    assert.equal(unauthorizedApproval.status, 403)

    const approvedResponse = await request(`/admins/blood-requests/${createdBody.request.id}/moderate`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { approvalStatus: 'approved' },
    })
    assert.equal(approvedResponse.status, 200)
    assert.equal((await approvedResponse.json()).request.status, 'approved')

    const previewResponse = await request(`/admins/blood-requests/${createdBody.request.id}/matches`, { cookie: adminCookie })
    const previewBody = await previewResponse.json()
    assert.equal(previewResponse.status, 200)
    assert.equal(previewBody.data.length, 1)
    assert.equal(previewBody.data[0].matchLabel, 'same-upazila')
    assert.equal(previewBody.data[0].bloodGroup, 'A+')
    assert.equal(previewBody.data[0].isAvailableToDonate, true)

    const notificationResponse = await request('/notifications', { cookie: regularCookie })
    const notificationBody = await notificationResponse.json()
    assert.equal(notificationResponse.status, 200)
    assert.equal(notificationBody.unreadCount, 1)
    assert.equal(notificationBody.notifications[0].payload.patientName, 'Request Test Patient')
    const readResponse = await request(`/notifications/${notificationBody.notifications[0].id}/read`, {
      method: 'PATCH',
      cookie: regularCookie,
    })
    assert.equal(readResponse.status, 200)
    const readNotifications = await request('/notifications', { cookie: regularCookie })
    assert.equal((await readNotifications.json()).unreadCount, 0)

    const filteredResponse = await request(`/blood-requests?status=active&bloodGroup=A%2B&hospitalLocation=${encodeURIComponent('সাভার')}`)
    const filteredBody = await filteredResponse.json()
    assert.equal(filteredResponse.status, 200)
    assert.equal(filteredBody.pagination.total, 1)
    assert.equal(filteredBody.requests[0].id, createdBody.request.id)
    assert.equal(filteredBody.requests[0].status, 'approved')
    assert.equal(filteredBody.requests[0].fulfillmentStatus, 'active')
    assert.equal(Object.hasOwn(filteredBody.requests[0], 'managementToken'), false)
    assert.equal(Object.hasOwn(filteredBody.requests[0], 'managementTokenHash'), false)

    const wrongToken = await request(`/blood-requests/${createdBody.request.id}/status`, {
      method: 'PATCH',
      body: { status: 'fulfilled', managementToken: '0'.repeat(64) },
    })
    assert.equal(wrongToken.status, 403)
    const fulfilledResponse = await request(`/blood-requests/${createdBody.request.id}/status`, {
      method: 'PATCH',
      body: { status: 'fulfilled', managementToken: createdBody.managementToken },
    })
    assert.equal(fulfilledResponse.status, 200)
    assert.equal((await fulfilledResponse.json()).request.fulfillmentStatus, 'fulfilled')
    assert.equal((await request('/blood-requests?status=active')).status, 200)
    assert.equal((await (await request('/blood-requests?status=active')).json()).pagination.total, 0)
    assert.equal((await (await request('/blood-requests?status=fulfilled')).json()).pagination.total, 1)

    const additionalRequests = []
    for (let index = 0; index < 3; index += 1) {
      const response = await request('/blood-requests', {
        method: 'POST',
        body: requestInput({ patientName: `Another Patient ${index}` }),
      })
      assert.equal(response.status, 201)
      additionalRequests.push(await response.json())
    }
    const rejectedResponse = await request(`/admins/blood-requests/${additionalRequests[0].request.id}/moderate`, {
      method: 'PATCH',
      cookie: superCookie,
      body: { approvalStatus: 'rejected' },
    })
    assert.equal(rejectedResponse.status, 200)
    assert.equal((await rejectedResponse.json()).request.status, 'rejected')
    const rejectedList = await request('/admins/blood-requests?status=rejected', { cookie: superCookie })
    assert.equal((await rejectedList.json()).counts.rejected, 1)
    assert.equal((await (await request('/blood-requests?status=all')).json()).pagination.total, 1)

    const approvedAdditionalResponse = await request(`/admins/blood-requests/${additionalRequests[1].request.id}/moderate`, {
      method: 'PATCH',
      cookie: superCookie,
      body: { approvalStatus: 'approved' },
    })
    assert.equal(approvedAdditionalResponse.status, 200)
    await BloodRequest.updateOne(
      { _id: additionalRequests[1].request.id },
      { $set: { requiredAt: new Date(Date.now() - 1000) } },
    )
    const expiredResponse = await request('/blood-requests?status=expired')
    const expiredBody = await expiredResponse.json()
    assert.equal(expiredBody.pagination.total, 1)
    assert.equal(expiredBody.requests[0].status, 'approved')
    assert.equal(expiredBody.requests[0].fulfillmentStatus, 'expired')
    const cancelledResponse = await request(`/blood-requests/${additionalRequests[1].request.id}/status`, {
      method: 'PATCH',
      body: { status: 'cancelled', managementToken: additionalRequests[1].managementToken },
    })
    assert.equal(cancelledResponse.status, 200)
    assert.equal((await cancelledResponse.json()).request.fulfillmentStatus, 'cancelled')
    assert.equal((await (await request('/blood-requests?status=cancelled')).json()).pagination.total, 1)

    const adminFulfillApproval = await request(`/admins/blood-requests/${additionalRequests[2].request.id}/moderate`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { approvalStatus: 'approved' },
    })
    assert.equal(adminFulfillApproval.status, 200)
    const adminFulfilled = await request(`/admins/blood-requests/${additionalRequests[2].request.id}/status`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { status: 'fulfilled' },
    })
    assert.equal(adminFulfilled.status, 200)
    assert.equal((await adminFulfilled.json()).request.fulfillmentStatus, 'fulfilled')

    const lastAllowedSubmission = await request('/blood-requests', {
      method: 'POST',
      body: requestInput({ patientName: 'Rate Limited Patient' }),
    })
    assert.equal(lastAllowedSubmission.status, 201)
    const rateLimited = await request('/blood-requests', {
      method: 'POST',
      body: requestInput({ patientName: 'Rate Limit Exceeded Patient' }),
    })
    assert.equal(rateLimited.status, 429)
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    }
    await new Promise((resolve) => server.close(resolve))
  }
})

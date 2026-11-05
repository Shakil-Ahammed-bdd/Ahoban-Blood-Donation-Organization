const test = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes, randomUUID } = require('node:crypto')
const mongoose = require('mongoose')

const clientOrigin = 'http://localhost:5173'
process.env.CLIENT_URL = clientOrigin
process.env.JWT_SECRET ||= randomBytes(48).toString('base64url')

const app = require('../src/app')
const User = require('../src/models/User')
const Experience = require('../src/models/Experience')
const { seedSuperAdmin } = require('../src/services/auth.service')

function isolatedDatabaseUri() {
  const uri = process.env.ADMIN_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/admin-role-test'
  const parsedUri = new URL(uri)
  parsedUri.pathname = `/admin-role-test-${randomUUID()}`
  return parsedUri.toString()
}

function getSessionCookie(response) {
  const sessionCookie = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('ahoban_session='))
  assert.ok(sessionCookie, 'response should set the authentication cookie')
  return sessionCookie.split(';')[0]
}

test('role authorization, Super Admin protection, and admin management', async () => {
  const server = app.listen(0, '127.0.0.1')
  let baseUrl

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    await mongoose.connect(isolatedDatabaseUri())
    await User.init()
    baseUrl = `http://127.0.0.1:${server.address().port}`

    async function request(path, { method = 'GET', body, cookie } = {}) {
      const headers = { origin: clientOrigin }
      if (body !== undefined) headers['content-type'] = 'application/json'
      if (cookie) headers.cookie = cookie
      return fetch(`${baseUrl}/api${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    }

    const regularEmail = `user-${randomUUID()}@example.test`
    const registration = await request('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Role Test User',
        email: regularEmail,
        phone: '01712345678',
        bloodGroup: 'A+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        upazila: 'সাভার',
        location: 'ঢাকা',
        password: 'a-secure-test-password',
        confirmPassword: 'a-secure-test-password',
        acceptTerms: true,
        role: 'super_admin',
        isActive: false,
      },
    })
    assert.equal(registration.status, 201)
    const registeredBody = await registration.json()
    const userCookie = getSessionCookie(registration)
    assert.equal(registeredBody.user.role, 'user')
    assert.equal(registeredBody.user.isActive, true)
    assert.equal((await request('/auth/me', { cookie: userCookie })).status, 200)
    assert.equal((await request('/admins/overview', { cookie: userCookie })).status, 403)
    assert.equal((await request('/admins/users', { cookie: userCookie })).status, 403)

    const superAdminEmail = `super-${randomUUID()}@example.test`
    const seed = await seedSuperAdmin({
      email: superAdminEmail,
      password: 'a-secure-super-password',
      fullName: 'Role Test Super Admin',
    })
    assert.equal(seed.created, true)
    const secondSeed = await seedSuperAdmin({
      email: `another-super-${randomUUID()}@example.test`,
      password: 'a-different-super-password',
    })
    assert.equal(secondSeed.created, false)
    assert.equal(secondSeed.user.id, seed.user.id)
    assert.equal(await User.countDocuments({ role: 'super_admin' }), 1)
    await assert.rejects(
      User.create({
        userId: `AHB-${randomBytes(8).toString('hex').toUpperCase()}`,
        fullName: 'Second Super Admin',
        email: `second-super-${randomUUID()}@example.test`,
        phone: '01712345678',
        bloodGroup: 'O+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        location: 'ঢাকা',
        passwordHash: 'test-only-hash',
        role: 'super_admin',
      }),
      (error) => error.code === 11000,
    )

    const originalNodeEnv = process.env.NODE_ENV
    let superAdminLogin
    try {
      process.env.NODE_ENV = 'production'
      superAdminLogin = await request('/auth/login', {
        method: 'POST',
        body: { identifier: superAdminEmail, password: 'a-secure-super-password' },
      })
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = originalNodeEnv
    }
    assert.equal(superAdminLogin.status, 200)
    const productionCookie = superAdminLogin.headers.getSetCookie().find((cookie) =>
      cookie.startsWith('ahoban_session='),
    )
    assert.match(productionCookie, /SameSite=None/i)
    assert.match(productionCookie, /Secure/i)
    const superAdminCookie = getSessionCookie(superAdminLogin)
    assert.equal((await (await request('/auth/me', { cookie: superAdminCookie })).json()).user.role, 'super_admin')

    const creation = await request('/admins', {
      method: 'POST',
      cookie: superAdminCookie,
      body: {
        fullName: 'Role Test Admin',
        email: `admin-${randomUUID()}@example.test`,
        phone: '01812345678',
        password: 'a-secure-admin-password',
      },
    })
    assert.equal(creation.status, 201)
    const createdAdmin = (await creation.json()).admin
    assert.match(createdAdmin.userId, /^AHB-[A-F0-9]{16}$/)
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: createdAdmin.userId, password: 'a-secure-admin-password' },
    })
    assert.equal(adminLogin.status, 200)
    const adminCookie = getSessionCookie(adminLogin)
    assert.equal((await (await request('/auth/me', { cookie: adminCookie })).json()).user.role, 'admin')
    assert.equal((await request('/admins/overview', { cookie: adminCookie })).status, 200)
    const userListing = await request('/admins/users', { cookie: adminCookie })
    assert.equal(userListing.status, 200)
    const listedUser = (await userListing.json()).users.find(({ id }) => id === registeredBody.user.id)
    assert.ok(listedUser)
    assert.equal(listedUser.phone, registeredBody.user.phone)
    assert.equal(listedUser.bloodGroup, registeredBody.user.bloodGroup)
    assert.equal(listedUser.location, registeredBody.user.location)
    assert.equal(listedUser.profilePhotoUrl, registeredBody.user.profilePhotoUrl)

    const pendingExperiences = await Promise.all(
      Array.from({ length: 4 }, (_, index) => {
        const image = `/api/uploads/experiences/approval-${randomUUID()}.webp`
        return Experience.create({
          userId: registeredBody.user.id,
          donorName: registeredBody.user.fullName,
          publicUserId: registeredBody.user.userId,
          bloodGroup: 'A+',
          division: 'ঢাকা',
          district: 'ঢাকা',
          location: 'ঢাকা',
          donationDate: new Date('2026-09-20T00:00:00.000Z'),
          donationCount: index + 1,
          message: `Pending experience number ${index + 1} for approval workflow testing.`,
          images: [image],
          photoUrl: image,
          publicConsent: true,
          isPublic: true,
          status: 'pending',
        })
      }),
    )
    const pendingIds = pendingExperiences.map((experience) => String(experience._id))
    const legacyApprovedId = new mongoose.Types.ObjectId()
    const legacyImage = `/api/uploads/experiences/legacy-${randomUUID()}.webp`
    await Experience.collection.insertOne({
      _id: legacyApprovedId,
      userId: new mongoose.Types.ObjectId(registeredBody.user.id),
      donorName: registeredBody.user.fullName,
      publicUserId: registeredBody.user.userId,
      bloodGroup: 'A+',
      division: 'ঢাকা',
      district: 'ঢাকা',
      location: 'ঢাকা',
      donationDate: new Date('2026-09-20T00:00:00.000Z'),
      message: 'A legacy approved experience without an explicit status field.',
      images: [legacyImage],
      photoUrl: legacyImage,
      publicConsent: true,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const unauthenticatedQueue = await request('/admins/experiences/pending')
    assert.equal(unauthenticatedQueue.status, 401)
    const forbiddenQueue = await request('/admins/experiences/pending', { cookie: userCookie })
    assert.equal(forbiddenQueue.status, 403)
    const paginatedQueue = await request('/admins/experiences/pending?page=1&limit=2', {
      cookie: adminCookie,
    })
    assert.equal(paginatedQueue.status, 200)
    const pendingList = await paginatedQueue.json()
    assert.equal(pendingList.pagination.pages, 2)
    assert.equal(pendingList.experiences.length, 2)
    assert.equal(pendingList.experiences[0].status, 'pending')
    assert.equal(pendingList.experiences[0].donationCount, 1)
    assert.equal(pendingList.experiences[0].images.length, 1)
    assert.equal(pendingList.experiences[0].email, registeredBody.user.email)
    assert.equal((await request(`/admins/experiences/${pendingIds[0]}/approve`, {
      method: 'PATCH',
      cookie: userCookie,
    })).status, 403)

    const adminApproval = await request(`/admins/experiences/${pendingIds[0]}/approve`, {
      method: 'PATCH',
      cookie: adminCookie,
    })
    assert.equal(adminApproval.status, 200)
    assert.equal((await adminApproval.json()).experience.status, 'approved')
    const adminRejection = await request(`/admins/experiences/${pendingIds[1]}/reject`, {
      method: 'PATCH',
      cookie: adminCookie,
    })
    assert.equal(adminRejection.status, 200)
    assert.equal((await adminRejection.json()).experience.status, 'rejected')

    const superAdminApproval = await request(`/admins/experiences/${pendingIds[2]}/approve`, {
      method: 'PATCH',
      cookie: superAdminCookie,
    })
    assert.equal(superAdminApproval.status, 200)
    const superAdminRejection = await request(`/admins/experiences/${pendingIds[3]}/reject`, {
      method: 'PATCH',
      cookie: superAdminCookie,
    })
    assert.equal(superAdminRejection.status, 200)

    const publicFeed = await request('/experiences?page=1&limit=24')
    const publicData = await publicFeed.json()
    const publicIds = publicData.experiences.map(({ id }) => id)
    assert.equal(publicIds.includes(pendingIds[0]), true)
    assert.equal(publicIds.includes(pendingIds[1]), false)
    assert.equal(publicIds.includes(pendingIds[2]), true)
    assert.equal(publicIds.includes(pendingIds[3]), false)
    assert.equal(publicIds.includes(String(legacyApprovedId)), true)
    assert.equal('email' in publicData.experiences.find(({ id }) => id === pendingIds[0]), false)
    const legacyApproved = publicData.experiences.find(
      ({ id }) => id === String(legacyApprovedId),
    )
    assert.equal(legacyApproved.status, 'approved')
    assert.equal((await request(`/experiences/${pendingIds[0]}`)).status, 200)
    assert.equal((await request(`/experiences/${pendingIds[1]}`)).status, 404)
    assert.equal((await request(`/experiences/${pendingIds[3]}/reactions`)).status, 404)
    assert.equal((await request(`/experiences/${pendingIds[3]}/comments`)).status, 404)
    assert.equal((await Experience.findById(pendingIds[1]).lean()).status, 'rejected')
    assert.equal((await Experience.findById(pendingIds[1]).lean()).isPublic, false)
    assert.equal((await request(`/admins/experiences/${pendingIds[0]}/reject`, {
      method: 'PATCH',
      cookie: superAdminCookie,
    })).status, 404)

    assert.equal((await request('/admins', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        fullName: 'Second Admin',
        email: `second-${randomUUID()}@example.test`,
        phone: '01812345678',
        password: 'another-secure-password',
        role: 'super_admin',
      },
    })).status, 403)
    assert.equal((await request(`/admins/${seed.user.id}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { isActive: false },
    })).status, 403)
    assert.equal((await request(`/admins/${seed.user.id}`, {
      method: 'DELETE',
      cookie: adminCookie,
    })).status, 403)
    assert.equal((await request(`/admins/${createdAdmin.id}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { isActive: false },
    })).status, 403)
    assert.equal((await request(`/admins/${createdAdmin.id}`, {
      method: 'DELETE',
      cookie: adminCookie,
    })).status, 403)
    assert.equal((await request(`/admins/${seed.user.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { isActive: false },
    })).status, 403)
    assert.equal((await request(`/admins/${seed.user.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { role: 'admin' },
    })).status, 403)
    assert.equal((await request('/admins', {
      method: 'POST',
      cookie: superAdminCookie,
      body: {
        fullName: 'Second Super Admin',
        email: `second-post-${randomUUID()}@example.test`,
        phone: '01712345678',
        password: 'a-second-secure-password',
        role: 'super_admin',
      },
    })).status, 400)
    assert.equal((await request(`/admins/${seed.user.id}`, {
      method: 'DELETE',
      cookie: superAdminCookie,
    })).status, 403)
    assert.equal((await request('/users/profile', {
      method: 'DELETE',
      cookie: superAdminCookie,
    })).status, 403)
    assert.equal((await request('/auth/me', { cookie: superAdminCookie })).status, 200)

    const update = await request(`/admins/${createdAdmin.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { fullName: 'Updated Role Test Admin', phone: '01912345678' },
    })
    assert.equal(update.status, 200)
    assert.equal((await update.json()).admin.fullName, 'Updated Role Test Admin')
    const adminList = await request('/admins', { cookie: superAdminCookie })
    assert.equal(adminList.status, 200)
    assert.ok((await adminList.json()).admins.some(({ id }) => id === createdAdmin.id))

    const deactivate = await request(`/admins/${createdAdmin.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { isActive: false },
    })
    assert.equal(deactivate.status, 200)
    assert.equal((await request('/admins/overview', { cookie: adminCookie })).status, 403)
    const disabledLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: createdAdmin.email, password: 'a-secure-admin-password' },
    })
    assert.equal(disabledLogin.status, 403)

    const reactivate = await request(`/admins/${createdAdmin.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { isActive: true },
    })
    assert.equal(reactivate.status, 200)
    const deleteAdmin = await request(`/admins/${createdAdmin.id}`, {
      method: 'DELETE',
      cookie: superAdminCookie,
    })
    assert.equal(deleteAdmin.status, 200)
    assert.equal(await User.findById(createdAdmin.id), null)

    const logout = await request('/auth/logout', { method: 'POST', cookie: userCookie })
    assert.equal(logout.status, 204)
    assert.match(logout.headers.getSetCookie()[0], /Expires=/i)
    assert.equal((await request('/auth/me')).status, 401)
    assert.equal(await User.countDocuments({ role: 'super_admin' }), 1)
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    }
  }
})

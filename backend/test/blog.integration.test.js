const test = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes, randomUUID } = require('node:crypto')
const mongoose = require('mongoose')
const sharp = require('sharp')

const clientOrigin = 'http://localhost:5173'
process.env.CLIENT_URL = clientOrigin
process.env.JWT_SECRET ||= randomBytes(48).toString('base64url')

const app = require('../src/app')
const Blog = require('../src/models/Blog')
const BlogCategory = require('../src/models/BlogCategory')
const User = require('../src/models/User')
const { removeBlogImage } = require('../src/services/blog-image-storage')
const { seedSuperAdmin } = require('../src/services/auth.service')

function isolatedDatabaseUri() {
  const uri = process.env.BLOG_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ahoban-blog-test'
  const parsedUri = new URL(uri)
  parsedUri.pathname = `/ahoban-blog-test-${randomUUID()}`
  return parsedUri.toString()
}

function getSessionCookie(response) {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('ahoban_session='))
  assert.ok(cookie, 'response should set the authentication cookie')
  return cookie.split(';')[0]
}

function blogForm({ title, slug, status = 'draft', category = 'Health Tips', cover = true, imageBytes, content } = {}) {
  const form = new FormData()
  form.set('title', title || `Blood donation guide ${randomUUID()}`)
  form.set('slug', slug || `blood-donation-guide-${randomUUID()}`)
  form.set('shortDescription', 'A practical and helpful guide for blood donors.')
  form.set('category', category)
  form.set('content', content || '## Prepare well\n\n**Stay hydrated** and learn more.\n\n- Bring your ID\n- Rest afterwards\n\n```js\nconst donor = true\n```')
  form.set('author', 'Ahoban Editorial Team')
  form.set('status', status)
  form.set('publishAt', new Date().toISOString())
  form.set('featured', 'true')
  if (cover) {
    form.set('coverImage', new Blob([imageBytes], { type: 'image/png' }), 'cover.png')
  }
  return form
}

test('blog CRUD, publication visibility, validation, and admin role authorization', async () => {
  const server = app.listen(0, '127.0.0.1')
  let baseUrl
  const coverImages = []
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    await mongoose.connect(isolatedDatabaseUri())
    await User.init()
    await Blog.init()
    await BlogCategory.init()
    const imageBytes = await sharp({
      create: { width: 16, height: 16, channels: 3, background: '#b93140' },
    }).png().toBuffer()
    baseUrl = `http://127.0.0.1:${server.address().port}`

    async function request(path, { method = 'GET', body, cookie } = {}) {
      const headers = { origin: clientOrigin }
      if (cookie) headers.cookie = cookie
      if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json'
      return fetch(`${baseUrl}/api${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
      })
    }

    const registration = await request('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Blog Access User',
        email: `blog-user-${randomUUID()}@example.test`,
        phone: '01712345678',
        bloodGroup: 'A+',
        division: 'ঢাকা',
        district: 'ঢাকা',
        upazila: 'সাভার',
        location: 'ঢাকা',
        password: 'a-secure-test-password',
        confirmPassword: 'a-secure-test-password',
        acceptTerms: true,
      },
    })
    assert.equal(registration.status, 201)
    const userCookie = getSessionCookie(registration)

    const seed = await seedSuperAdmin({
      email: `blog-super-${randomUUID()}@example.test`,
      password: 'a-secure-super-password',
      fullName: 'Blog Super Admin',
    })
    const superAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: seed.user.userId, password: 'a-secure-super-password' },
    })
    const superAdminCookie = getSessionCookie(superAdminLogin)
    const adminCreate = await request('/admins', {
      method: 'POST',
      cookie: superAdminCookie,
      body: {
        fullName: 'Blog Admin',
        email: `blog-admin-${randomUUID()}@example.test`,
        phone: '01812345678',
        password: 'a-secure-admin-password',
      },
    })
    const createdAdmin = (await adminCreate.json()).admin
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: createdAdmin.userId, password: 'a-secure-admin-password' },
    })
    const adminCookie = getSessionCookie(adminLogin)
    const categoriesResponse = await request('/admins/blogs/categories', { cookie: adminCookie })
    const initialCategories = (await categoriesResponse.json()).categories
    assert.equal(categoriesResponse.status, 200)
    assert.ok(initialCategories.some(({ name }) => name === 'Health Tips'))
    assert.ok(initialCategories.some(({ name }) => name === 'রক্তদানের উপকারিতা'))
    const publicCategories = await request('/blogs/categories')
    assert.ok((await publicCategories.json()).categories.includes('Blood Donation Myths & Facts'))
    const addedCategory = await request('/admins/blogs/categories', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Maternal Health', description: 'Care guidance', active: true },
    })
    assert.equal(addedCategory.status, 201)
    const managedCategory = (await addedCategory.json()).category
    assert.equal(managedCategory.description, 'Care guidance')
    assert.equal(managedCategory.active, true)
    assert.equal((await request('/admins/blogs/categories', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'maternal health' },
    })).status, 409)
    const deactivatedCategory = await request(`/admins/blogs/categories/${managedCategory.id}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { active: false },
    })
    assert.equal((await deactivatedCategory.json()).category.active, false)
    const inactivePostResponse = await request('/admins/blogs', {
      method: 'POST',
      cookie: adminCookie,
      body: blogForm({ category: 'Maternal Health', imageBytes }),
    })
    assert.equal(inactivePostResponse.status, 400)
    const activatedCategory = await request(`/admins/blogs/categories/${managedCategory.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { active: true },
    })
    assert.equal((await activatedCategory.json()).category.active, true)

    assert.equal((await request('/admins/blogs')).status, 401)
    assert.equal((await request('/admins/blogs', { cookie: userCookie })).status, 403)
    assert.equal((await request('/admins/blogs/categories', { cookie: userCookie })).status, 403)
    assert.equal((await request(`/admins/blogs/categories/${managedCategory.id}`, {
      method: 'DELETE',
      cookie: userCookie,
    })).status, 403)
    assert.equal((await request('/admins/blogs/categories/not-an-id', {
      method: 'DELETE',
      cookie: adminCookie,
    })).status, 404)
    assert.equal((await request('/admins/blogs/categories', {
      method: 'POST',
      cookie: userCookie,
      body: { name: 'Unauthorized Category' },
    })).status, 403)
    assert.equal((await request('/admins/blogs', {
      method: 'POST',
      cookie: userCookie,
      body: blogForm({ imageBytes }),
    })).status, 403)

    const draftResponse = await request('/admins/blogs', {
      method: 'POST',
      cookie: adminCookie,
      body: blogForm({
        status: 'draft',
        imageBytes,
        content: '<h2 style="color:#b93140">রক্তদান</h2><p onclick="alert(1)">নিরাপদ <strong>লেখা</strong><script>alert(2)</script></p>',
      }),
    })
    const draftBody = await draftResponse.json()
    assert.equal(draftResponse.status, 201, JSON.stringify(draftBody))
    const draft = draftBody.blog
    coverImages.push(draft.coverImage)
    assert.equal(draft.status, 'draft')
    assert.match(draft.content, /<h2 style="color:#b93140">রক্তদান<\/h2>/)
    assert.match(draft.content, /<strong>লেখা<\/strong>/)
    assert.doesNotMatch(draft.content, /onclick|<script|alert\(/i)
    assert.equal(draft.metaTitle, draft.title)
    assert.equal(draft.metaDescription, draft.shortDescription)
    assert.match(draft.coverImage, /^\/api\/uploads\/blogs\/.+\.webp$/)
    const publicDraftList = await request('/blogs?page=1&limit=20')
    assert.equal((await publicDraftList.json()).blogs.some(({ id }) => id === draft.id), false)
    assert.equal((await request(`/blogs/${draft.slug}`)).status, 404)
    const adminList = await request('/admins/blogs?status=draft&search=guide', { cookie: adminCookie })
    assert.equal((await adminList.json()).blogs.some(({ id }) => id === draft.id), true)

    const invalidImageForm = blogForm({ cover: false })
    invalidImageForm.set('coverImage', new Blob(['not an image'], { type: 'image/png' }), 'fake.png')
    assert.equal((await request('/admins/blogs', {
      method: 'POST',
      cookie: adminCookie,
      body: invalidImageForm,
    })).status, 400)

    const publishedResponse = await request(`/admins/blogs/${draft.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: blogForm({
        title: draft.title,
        slug: draft.slug,
        status: 'published',
        cover: false,
        content: '<p><span data-editor-comment="Check this source">Updated</span> <em>rich</em> content.</p><a href="javascript:alert(1)">unsafe link</a>',
      }),
    })
    assert.equal(publishedResponse.status, 200)
    const publishedBlog = (await publishedResponse.json()).blog
    assert.equal(publishedBlog.status, 'published')
    assert.equal(publishedBlog.metaTitle, publishedBlog.title)
    assert.equal(publishedBlog.metaDescription, publishedBlog.shortDescription)
    assert.match(publishedBlog.content, /<em>rich<\/em>/)
    assert.match(publishedBlog.content, /data-editor-comment="Check this source"/)
    assert.doesNotMatch(publishedBlog.content, /javascript:|alert\(/i)
    const publicRichBlog = await request(`/blogs/${draft.slug}`)
    const publicContent = (await publicRichBlog.json()).blog.content
    assert.match(publicContent, /<em>rich<\/em>/)
    assert.doesNotMatch(publicContent, /data-editor-comment/)
    const publicResponse = await request('/blogs?category=Health%20Tips&search=guide')
    const publicResult = await publicResponse.json()
    assert.equal(publicResult.blogs.some(({ id }) => id === draft.id), true)
    assert.ok(publicResult.categories.includes('Health Tips'))
    assert.equal((await request(`/blogs/${draft.slug}`)).status, 200)
    const anotherPost = await request('/admins/blogs', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        title: `Blood donation benefits ${randomUUID()}`,
        slug: `blood-donation-benefits-${randomUUID()}`,
        shortDescription: 'Research-based information for people considering donation.',
        category: 'Health Tips',
        content: 'Blood donation can help communities.',
        author: 'Ahoban Editorial Team',
        status: 'published',
        publishAt: new Date().toISOString(),
        featured: false,
        coverImage: 'https://example.test/cover.webp',
      },
    })
    assert.equal(anotherPost.status, 201)
    const secondBlog = (await anotherPost.json()).blog
    const firstPublicPage = await request('/blogs?category=Health%20Tips&page=1&limit=1')
    const paginatedPublicBlogs = await firstPublicPage.json()
    assert.equal(paginatedPublicBlogs.pagination.total, 2)
    assert.equal(paginatedPublicBlogs.pagination.pages, 2)
    assert.equal(paginatedPublicBlogs.blogs.length, 1)
    const managedCategoriesResponse = await request('/admins/blogs/categories', { cookie: adminCookie })
    const managedCategories = await managedCategoriesResponse.json()
    const healthCategory = managedCategories.categories.find(({ name }) => name === 'Health Tips')
    const renamedCategory = await request(`/admins/blogs/categories/${healthCategory.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: { name: 'Donation Health', description: 'Updated health guidance' },
    })
    assert.equal(renamedCategory.status, 200)
    assert.equal((await renamedCategory.json()).category.description, 'Updated health guidance')
    assert.equal((await Blog.findById(draft.id)).category, 'Donation Health')
    assert.equal((await request('/admins/blogs/categories', { cookie: adminCookie })).status, 200)
    const categoryInUseDelete = await request(`/admins/blogs/categories/${healthCategory.id}`, {
      method: 'DELETE',
      cookie: adminCookie,
    })
    assert.equal(categoryInUseDelete.status, 409)
    assert.equal((await categoryInUseDelete.json()).code, 'BLOG_CATEGORY_IN_USE')
    assert.ok(await BlogCategory.findById(healthCategory.id))
    assert.equal((await Blog.findById(draft.id)).category, 'Donation Health')
    assert.equal((await Blog.findById(secondBlog.id)).category, 'Donation Health')
    assert.equal((await request(`/admins/blogs/categories/${managedCategory.id}`, {
      method: 'DELETE',
      cookie: adminCookie,
    })).status, 204)
    assert.equal(await BlogCategory.findById(managedCategory.id), null)
    const categoriesAfterDelete = await request('/admins/blogs/categories', { cookie: adminCookie })
    assert.equal((await categoriesAfterDelete.json()).categories.some(({ id }) => id === managedCategory.id), false)
    assert.equal((await Blog.findById(secondBlog.id)).category, 'Donation Health')

    const duplicate = await request('/admins/blogs', {
      method: 'POST',
      cookie: adminCookie,
      body: blogForm({ slug: draft.slug, category: 'Donation Health', imageBytes }),
    })
    assert.equal(duplicate.status, 409)

    const unpublishResponse = await request(`/admins/blogs/${draft.id}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: blogForm({ title: draft.title, slug: draft.slug, status: 'draft', category: 'Donation Health', cover: false }),
    })
    assert.equal(unpublishResponse.status, 200)
    assert.equal((await request(`/blogs/${draft.slug}`)).status, 404)

    const republishResponse = await request(`/admins/blogs/${draft.id}`, {
      method: 'PATCH',
      cookie: superAdminCookie,
      body: blogForm({ title: draft.title, slug: draft.slug, status: 'published', category: 'Donation Health', cover: false }),
    })
    assert.equal(republishResponse.status, 200)
    assert.equal((await request(`/blogs/${draft.slug}`)).status, 200)
    assert.equal((await request(`/admins/blogs/${draft.id}`, {
      method: 'DELETE',
      cookie: userCookie,
    })).status, 403)
    assert.equal((await request(`/admins/blogs/${draft.id}`, {
      method: 'DELETE',
      cookie: adminCookie,
    })).status, 204)
    assert.equal((await request(`/admins/blogs/${secondBlog.id}`, {
      method: 'DELETE',
      cookie: superAdminCookie,
    })).status, 204)
    assert.equal((await request(`/admins/blogs/categories/${healthCategory.id}`, {
      method: 'DELETE',
      cookie: superAdminCookie,
    })).status, 204)
    assert.equal(await BlogCategory.findById(healthCategory.id), null)
    const categoriesAfterRefresh = await request('/admins/blogs/categories', { cookie: adminCookie })
    assert.equal((await categoriesAfterRefresh.json()).categories.some(({ name }) => name === 'Donation Health'), false)
    assert.equal(await Blog.findById(draft.id), null)
    assert.equal((await request(`/blogs/${draft.slug}`)).status, 404)
  } finally {
    await Promise.all(coverImages.map(removeBlogImage))
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

import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest } from '../src/services/api/apiRequest.js'

test('apiRequest serializes JSON object bodies before calling fetch', async () => {
  const originalFetch = globalThis.fetch
  let capturedRequest
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options }
    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await apiRequest('/admins/blogs/categories', {
      method: 'POST',
      body: { name: 'Health Tips', description: 'Helpful advice', active: true },
    })
    assert.equal(capturedRequest.url, '/api/admins/blogs/categories')
    assert.equal(capturedRequest.options.body, '{"name":"Health Tips","description":"Helpful advice","active":true}')
    assert.equal(capturedRequest.options.headers['Content-Type'], 'application/json')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('apiRequest preserves JSON strings and multipart form data', async () => {
  const originalFetch = globalThis.fetch
  const capturedBodies = []
  globalThis.fetch = async (_url, options) => {
    capturedBodies.push(options)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const json = '{"name":"Health Tips"}'
    await apiRequest('/admins/blogs/categories', { method: 'POST', body: json })
    const formData = new FormData()
    formData.set('name', 'Health Tips')
    await apiRequest('/admins/blogs/categories', { method: 'POST', body: formData })
    assert.equal(capturedBodies[0].body, json)
    assert.equal(capturedBodies[1].body, formData)
    assert.equal(capturedBodies[1].headers['Content-Type'], undefined)
  } finally {
    globalThis.fetch = originalFetch
  }
})

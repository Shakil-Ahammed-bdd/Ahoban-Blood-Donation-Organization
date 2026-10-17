const test = require('node:test')
const assert = require('node:assert/strict')

const { getHealthStatus } = require('../src/services/health.service')

test('reports degraded health while MongoDB is disconnected', () => {
  const health = getHealthStatus()

  assert.equal(health.httpStatus, 503)
  assert.deepEqual(health.body, {
    status: 'degraded',
    service: 'api',
    database: 'disconnected',
    message: 'The API is running, but MongoDB is not connected.',
  })
})

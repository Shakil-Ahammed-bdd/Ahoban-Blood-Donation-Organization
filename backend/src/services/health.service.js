const mongoose = require('mongoose')

function getHealthStatus() {
  const databaseConnected = mongoose.connection.readyState === 1

  return {
    httpStatus: databaseConnected ? 200 : 503,
    body: {
      status: databaseConnected ? 'ok' : 'degraded',
      service: 'api',
      database: databaseConnected ? 'connected' : 'disconnected',
      ...(!databaseConnected && {
        message: 'The API is running, but MongoDB is not connected.',
      }),
    },
  }
}

module.exports = { getHealthStatus }

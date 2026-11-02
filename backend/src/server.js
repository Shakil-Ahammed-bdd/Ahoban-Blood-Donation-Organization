const path = require('node:path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const app = require('./app')
const connectDatabase = require('./config/database')

const port = Number(process.env.PORT) || 5000
const jwtSecret = process.env.JWT_SECRET

if (
  !jwtSecret ||
  Buffer.byteLength(jwtSecret) < 32 ||
  /^(replace|change|your|generate)/i.test(jwtSecret)
) {
  console.error(
    'Set JWT_SECRET in the root .env to a unique random value of at least 32 bytes before starting the API.',
  )
  process.exitCode = 1
} else {
  async function startServer() {
    const databaseConnected = await connectDatabase(process.env.MONGODB_URI)
    if (process.env.NODE_ENV === 'production' && !databaseConnected) {
      console.error('Production startup aborted because database initialization did not complete.')
      process.exitCode = 1
      return
    }

    app.listen(port, () => {
      console.info(`API server listening on http://localhost:${port}`)
    })
  }

  startServer().catch((error) => {
    console.error(`API startup failed: ${error.message}`)
    process.exitCode = 1
  })
}

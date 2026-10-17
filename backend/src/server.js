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
  app.listen(port, () => {
    console.info(`API server listening on http://localhost:${port}`)
  })

  connectDatabase(process.env.MONGODB_URI)
}

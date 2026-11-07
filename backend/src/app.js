const cors = require('cors')
const cookieParser = require('cookie-parser')
const express = require('express')

const clientOrigin = require('./config/client-origin')
const errorHandler = require('./middleware/error-handler')
const authRoutes = require('./routes/auth.routes')
const donorRoutes = require('./routes/donor.routes')
const experienceRoutes = require('./routes/experience.routes')
const healthRoutes = require('./routes/health.routes')
const leaderboardRoutes = require('./routes/leaderboard.routes')
const statsRoutes = require('./routes/stats.routes')
const userRoutes = require('./routes/user.routes')
const adminRoutes = require('./routes/admin.routes')
const blogRoutes = require('./routes/blog.routes')
const adminBlogRoutes = require('./routes/admin-blog.routes')
const bloodRequestRoutes = require('./routes/blood-request.routes')
const notificationRoutes = require('./routes/notification.routes')
const { blogImageDirectory } = require('./services/blog-image-storage')
const { avatarDirectory, imageDirectory } = require('./services/experience-image-storage')

const app = express()

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '128kb' }))
app.use(cookieParser())
app.use(
  '/api/uploads/blogs',
  express.static(blogImageDirectory, {
    fallthrough: true,
    index: false,
    immutable: true,
    maxAge: '1y',
  }),
)
app.use(
  '/api/uploads/experiences',
  express.static(imageDirectory, {
    fallthrough: true,
    index: false,
    immutable: true,
    maxAge: '1y',
  }),
)
app.use(
  '/api/uploads/avatars',
  express.static(avatarDirectory, {
    fallthrough: true,
    index: false,
    immutable: true,
    maxAge: '1y',
  }),
)
app.use('/api/auth', authRoutes)
app.use('/api/admins', adminRoutes)
app.use('/api/admins/blogs', adminBlogRoutes)
app.use('/api/blogs', blogRoutes)
app.use('/api/blood-requests', bloodRequestRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/donors', donorRoutes)
app.use('/api/experiences', experienceRoutes)
app.use('/api/comments', require('./routes/experience-comment.routes'))
app.use('/api/stats', statsRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/health', healthRoutes)
app.use((req, res, next) => {
  const error = new Error('Route not found.')
  error.statusCode = 404
  next(error)
})
app.use(errorHandler)

module.exports = app

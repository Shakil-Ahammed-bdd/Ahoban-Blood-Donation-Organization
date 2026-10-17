const { clearSession, issueSession } = require('../middleware/authenticate')
const { loginUser, registerUser, toPublicUser } = require('../services/auth.service')
const { removeAvatar, storeAvatar } = require('../services/experience-image-storage')
const { validateLogin, validateRegistration } = require('../utils/auth-validation')

async function register(req, res, next) {
  let profilePhotoUrl = ''
  try {
    const input = validateRegistration(req.body)
    if (req.file) profilePhotoUrl = await storeAvatar(req.file)
    const user = await registerUser({ ...input, profilePhotoUrl })
    issueSession(res, user)
    res.status(201).json({
      status: 'ok',
      message: 'Registration successful.',
      user,
    })
  } catch (error) {
    if (profilePhotoUrl) await removeAvatar(profilePhotoUrl)
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password } = validateLogin(req.body)
    const user = await loginUser(identifier, password)
    issueSession(res, user)
    res.json({ status: 'ok', message: 'Login successful.', user })
  } catch (error) {
    next(error)
  }
}

async function getCurrentUser(req, res) {
  res.json({ status: 'ok', user: toPublicUser(req.user) })
}

function logout(req, res) {
  clearSession(res)
  res.status(204).end()
}

module.exports = { getCurrentUser, login, logout, register }

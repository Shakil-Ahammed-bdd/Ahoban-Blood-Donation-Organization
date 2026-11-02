const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')

const COOKIE_NAME = 'ahoban_session'
const JWT_ISSUER = 'ahoban-api'
const JWT_AUDIENCE = 'ahoban-web'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (
    !secret ||
    Buffer.byteLength(secret) < 32 ||
    /^(replace|change|your|generate)/i.test(secret)
  ) {
    throw new HttpError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Authentication is not configured. Set a unique JWT_SECRET of at least 32 bytes.',
    )
  }
  return secret
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api',
  }
}

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id }, getJwtSecret(), {
    algorithm: 'HS256',
    audience: JWT_AUDIENCE,
    expiresIn: '7d',
    issuer: JWT_ISSUER,
  })
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_DURATION_MS,
  })
}

async function authenticate(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Authentication is temporarily unavailable.')
    }
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) {
      throw new HttpError(401, 'AUTH_REQUIRED', 'Please sign in to continue.')
    }

    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    })
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new Error('Invalid token subject.')
    }

    const user = await User.findById(payload.sub)
    if (!user) {
      throw new HttpError(401, 'AUTH_REQUIRED', 'Please sign in to continue.')
    }
    if (user.isActive === false) {
      throw new HttpError(403, 'ACCOUNT_DISABLED', 'This account is disabled. Contact an administrator.')
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof HttpError) return next(error)
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'AUTH_REQUIRED', 'Please sign in to continue.'))
    }
    next(error)
  }
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions())
}

function requireRole(...allowedRoles) {
  const roles = new Set(allowedRoles.filter(Boolean))
  return function enforceRole(req, res, next) {
    if (!req.user) {
      return next(new HttpError(401, 'AUTH_REQUIRED', 'Please sign in to continue.'))
    }
    const userRole = req.user.role || 'user'
    if (!roles.has(userRole)) {
      return next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'))
    }
    next()
  }
}

function requireSuperAdmin(req, res, next) {
  return requireRole('super_admin')(req, res, next)
}

module.exports = { authenticate, clearSession, issueSession, requireRole, requireSuperAdmin }

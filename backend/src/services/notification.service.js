const Notification = require('../models/Notification')
const User = require('../models/User')
const BloodRequest = require('../models/BloodRequest')
const HttpError = require('../errors/http-error')
const { isAvailableToDonate } = require('../utils/donation-eligibility')

const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'normal']

function normalizePriority(value) {
  return PRIORITY_LEVELS.includes(value) ? value : 'normal'
}

function computeBloodRequestPriority(request) {
  const text = String(request?.patientIssue || request?.patientProblem || '').toLowerCase()
  if (!text) return 'normal'
  if (/(critical|emergency|bleeding|trauma|accident|icu|massive|sepsis|stroke|surgery|collapse|major bleed)/i.test(text)) {
    return 'critical'
  }
  if (/(urgent|serious|operation|transfusion|injury|hospital|blood loss|emergency)/i.test(text)) {
    return 'high'
  }
  if (/(procedure|scheduled|treatment|checkup|monitoring|medical)/i.test(text)) {
    return 'medium'
  }
  return 'normal'
}

function isNotificationEnabled(user) {
  const preferences = user?.notificationPreferences || {}
  return preferences.inAppEnabled !== false
}

function canSendWhatsApp(user) {
  const preferences = user?.notificationPreferences || {}
  const hasConsent = Boolean(preferences.whatsappConsent || user?.whatsappConsent)
  const enabled = preferences.whatsappEnabled !== false && hasConsent
  const number = String(user?.whatsappNumber || '').replace(/\D/g, '')
  return enabled && number.length >= 10
}

function toNotificationSummary(notification) {
  return {
    id: String(notification._id || notification.id),
    notificationId: String(notification._id || notification.id),
    type: notification.type,
    channel: notification.channel,
    status: notification.status,
    priority: notification.priority,
    createdAt: notification.createdAt,
    readAt: notification.readAt || null,
    payload: notification.payload || {},
  }
}

async function getMatchCandidates(request, { limit = 25 } = {}) {
  if (!request || !request._id) throw new HttpError(400, 'INVALID_REQUEST', 'Provide a valid approved blood request.')

  const requestText = [request.hospitalLocation, request.patientName, request.requesterName].filter(Boolean).join(' ').toLowerCase()
  const donors = await User.find({
    role: 'user',
    isActive: true,
    bloodGroup: request.bloodGroup,
    isSearchable: true,
  }).lean()

  const candidates = donors
    .filter((donor) => isNotificationEnabled(donor) && isAvailableToDonate(donor.lastDonationDate))
    .map((donor) => {
      const donorLocationText = [donor.division, donor.district, donor.upazila, donor.location].filter(Boolean).join(' ').toLowerCase()
      let matchPriority = 1
      let matchLabel = 'other-area'
      if (donor.upazila && requestText.includes(donor.upazila.toLowerCase())) {
        matchPriority = 4
        matchLabel = 'same-upazila'
      } else if (donor.district && requestText.includes(donor.district.toLowerCase())) {
        matchPriority = 3
        matchLabel = 'same-district'
      } else if (donor.division && requestText.includes(donor.division.toLowerCase())) {
        matchPriority = 2
        matchLabel = 'same-division'
      }

      return {
        donorId: String(donor._id),
        userId: donor.userId,
        fullName: donor.fullName,
        profilePhotoUrl: donor.profilePhotoUrl || '',
        bloodGroup: donor.bloodGroup,
        division: donor.division,
        district: donor.district,
        upazila: donor.upazila || '',
        isAvailableToDonate: isAvailableToDonate(donor.lastDonationDate),
        whatsappNumber: donor.whatsappNumber || '',
        matchPriority,
        matchLabel,
        donorLocation: donorLocationText,
        notificationEnabled: isNotificationEnabled(donor),
        whatsappEligible: canSendWhatsApp(donor),
      }
    })
    .sort((left, right) => {
      if (right.matchPriority !== left.matchPriority) return right.matchPriority - left.matchPriority
      return left.fullName.localeCompare(right.fullName)
    })
    .slice(0, limit)

  return candidates
}

async function buildBloodRequestNotifications(request) {
  const approvedRequest = await BloodRequest.findById(request._id || request.id).lean()
  if (!approvedRequest || approvedRequest.status !== 'approved') {
    return { notifications: [], candidates: [] }
  }

  const priority = normalizePriority(request.priority || approvedRequest.priority || computeBloodRequestPriority(approvedRequest))
  const candidates = await getMatchCandidates(approvedRequest)
  const notifications = []

  for (const candidate of candidates) {
    const notification = await Notification.findOneAndUpdate(
      { bloodRequestId: approvedRequest._id, recipient: candidate.donorId, channel: 'in_app' },
      {
        $set: {
          recipient: candidate.donorId,
          bloodRequestId: approvedRequest._id,
          type: 'blood_request_match',
          channel: 'in_app',
          status: 'pending',
          priority,
          payload: {
            donorId: candidate.donorId,
            bloodGroup: approvedRequest.bloodGroup,
            hospitalName: approvedRequest.hospitalName,
            hospitalLocation: approvedRequest.hospitalLocation,
            patientName: approvedRequest.patientName,
            requesterMobile: approvedRequest.phone,
            priority,
            requiredAt: approvedRequest.requiredAt,
            requestDate: approvedRequest.createdAt,
          },
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true },
    )
    notifications.push(toNotificationSummary(notification))
  }

  return { notifications, candidates }
}

async function markNotificationRead(notificationId, userId) {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId })
  if (!notification) {
    throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'This notification could not be found.')
  }
  notification.status = 'read'
  notification.readAt = new Date()
  await notification.save()
  return toNotificationSummary(notification)
}

async function markAllNotificationsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, channel: 'in_app', status: { $ne: 'read' } },
    { $set: { status: 'read', readAt: new Date() } },
  )
  return { updated: result.modifiedCount || 0 }
}

async function listNotificationsForUser(userId, { page = 1, limit = 10 } = {}) {
  const normalizedPage = Math.max(1, Number(page) || 1)
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 10))
  const criteria = { recipient: userId, channel: 'in_app' }
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(criteria)
      .sort({ createdAt: -1, _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean(),
    Notification.countDocuments(criteria),
    Notification.countDocuments({ ...criteria, status: { $ne: 'read' } }),
  ])

  return {
    notifications: items.map(toNotificationSummary),
    unreadCount,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      pages: Math.ceil(total / normalizedLimit),
    },
  }
}

function normalizePhoneForWhatsApp(number) {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('0')) return `+88${digits}`
  return `+${digits}`
}

function buildEmergencyWhatsAppMessage(request, donorName) {
  return [
    '🩸 জরুরি রক্তের প্রয়োজন!',
    '',
    'একজন রোগীর জন্য জরুরি ভিত্তিতে রক্ত প্রয়োজন।',
    '',
    `রোগীর নাম: ${request.patientName}`,
    `রক্তের গ্রুপ: ${request.bloodGroup}`,
    `হাসপাতাল: ${request.hospitalName}`,
    `হাসপাতালের ঠিকানা: ${request.hospitalLocation}`,
    `জরুরিতার মাত্রা: ${request.priority || 'normal'}`,
    `যোগাযোগ: ${request.phone}`,
    '',
    'আপনি রক্তদানে প্রস্তুত থাকলে অনুগ্রহ করে সরাসরি যোগাযোগ করুন।',
    '',
    'আহ্বান রক্তদান সংস্থা',
    'মানবতার পাশে, সবসময়।',
    '',
    `Hi ${donorName}, an emergency blood donation request is active.`,
    `Patient: ${request.patientName}`,
    `Blood group: ${request.bloodGroup}`,
    `Hospital: ${request.hospitalName}`,
    `Location: ${request.hospitalLocation}`,
    `Priority: ${request.priority || 'normal'}`,
    `Contact: ${request.phone}`,
  ].join('\n')
}

async function sendWhatsAppMessage(request, donor) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (String(process.env.WHATSAPP_ENABLED || '').toLowerCase() !== 'true') {
    return { sent: false, reason: 'disabled' }
  }
  if (!token || !phoneNumberId) {
    return { sent: false, reason: 'missing-config' }
  }

  const phone = normalizePhoneForWhatsApp(donor.whatsappNumber)
  if (!phone) {
    return { sent: false, reason: 'missing-number' }
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: {
      body: buildEmergencyWhatsAppMessage(request, donor.fullName || 'Donor'),
    },
  }

  const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v20.0'}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      sent: false,
      reason: 'api-error',
      details: body?.error || body,
    }
  }

  return {
    sent: true,
    messageId: body?.messages?.[0]?.id || '',
    details: body,
  }
}

async function triggerApprovalNotifications(request) {
  const approvedRequest = await BloodRequest.findById(request._id || request.id)
  if (!approvedRequest || approvedRequest.status !== 'approved') return { notifications: [], sent: 0 }

  const { notifications, candidates } = await buildBloodRequestNotifications(approvedRequest)
  const outbound = []

  for (const donor of candidates) {
    const donorUser = await User.findById(donor.donorId).lean()
    if (!donorUser) continue

    if (canSendWhatsApp(donorUser)) {
      const result = await sendWhatsAppMessage(approvedRequest, donorUser)
      const update = { status: result.sent ? 'sent' : 'failed', messageId: result.messageId || '', errorDetails: result.details ? JSON.stringify(result.details) : '' }
      await Notification.findOneAndUpdate(
        { bloodRequestId: approvedRequest._id, recipient: donorUser._id, channel: 'whatsapp' },
        {
          $set: {
            recipient: donorUser._id,
            bloodRequestId: approvedRequest._id,
            type: 'whatsapp_message',
            channel: 'whatsapp',
            status: update.status,
            priority: approvedRequest.priority || 'normal',
            messageId: update.messageId,
            errorDetails: update.errorDetails,
            payload: {
              donorId: String(donorUser._id),
              bloodGroup: approvedRequest.bloodGroup,
              hospitalName: approvedRequest.hospitalName,
              hospitalLocation: approvedRequest.hospitalLocation,
              patientName: approvedRequest.patientName,
              requesterMobile: approvedRequest.phone,
              priority: approvedRequest.priority || 'normal',
            },
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true },
      )
      outbound.push({ donorId: donorUser._id, sent: result.sent, messageId: result.messageId || '' })
    }
  }

  return { notifications, sent: outbound.filter((entry) => entry.sent).length, candidates }
}

module.exports = {
  buildBloodRequestNotifications,
  canSendWhatsApp,
  computeBloodRequestPriority,
  getMatchCandidates,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  normalizePriority,
  triggerApprovalNotifications,
}

const HttpError = require('../errors/http-error')

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ALLOWED_FIELDS = new Set([
  'requesterName',
  'patientName',
  'patientIssue',
  'hospitalName',
  'hospitalLocation',
  'phone',
  'bloodGroup',
  'units',
  'requiredAt',
  'contactConsent',
  'website',
])

function fieldError(field, message) {
  throw new HttpError(400, 'VALIDATION_ERROR', message, { [field]: message })
}

function validateBloodRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Provide valid blood request details.')
  }
  if (Object.keys(input).some((field) => !ALLOWED_FIELDS.has(field))) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The request contains unsupported fields.')
  }
  if (input.website !== undefined && (typeof input.website !== 'string' || input.website.trim())) {
    fieldError('website', 'The request could not be verified.')
  }
  if (input.contactConsent !== true) {
    fieldError('contactConsent', 'Consent to display the contact number is required.')
  }

  const requesterName = validateText(input.requesterName, 'requesterName', 'Requester name', 2, 100)
  const patientName = validateText(input.patientName, 'patientName', 'Patient name', 2, 100)
  const patientIssue = validateText(input.patientIssue, 'patientIssue', 'Patient issue', 10, 1000)
  const hospitalName = validateText(input.hospitalName, 'hospitalName', 'Hospital name', 2, 120)
  const hospitalLocation = validateText(input.hospitalLocation, 'hospitalLocation', 'Hospital location', 4, 200)

  if (typeof input.phone !== 'string') fieldError('phone', 'Enter a valid Bangladesh mobile number.')
  const phoneDigits = input.phone.replace(/[\s()-]/g, '')
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(phoneDigits)) {
    fieldError('phone', 'Enter a valid Bangladesh mobile number.')
  }
  const localPhone = phoneDigits.replace(/^\+?88/, '')
  const phone = `+880${localPhone.slice(1)}`

  if (!BLOOD_GROUPS.includes(input.bloodGroup)) fieldError('bloodGroup', 'Select a valid blood group.')
  const units = Number(input.units)
  if (!Number.isInteger(units) || units < 1 || units > 20) {
    fieldError('units', 'Blood units must be a whole number from 1 to 20.')
  }

  const requiredAt = new Date(input.requiredAt)
  if (
    typeof input.requiredAt !== 'string'
    || !Number.isFinite(requiredAt.getTime())
    || requiredAt.getTime() <= Date.now()
  ) {
    fieldError('requiredAt', 'Choose a future date and time for the blood request.')
  }

  return {
    requesterName,
    patientName,
    patientIssue,
    hospitalName,
    hospitalLocation,
    phone,
    bloodGroup: input.bloodGroup,
    units,
    requiredAt,
  }
}

function validateText(value, field, label, minLength, maxLength) {
  if (
    typeof value !== 'string'
    || value.trim().length < minLength
    || value.trim().length > maxLength
  ) {
    fieldError(field, `${label} must be between ${minLength} and ${maxLength} characters.`)
  }
  return value.trim()
}

module.exports = { BLOOD_GROUPS, validateBloodRequest }

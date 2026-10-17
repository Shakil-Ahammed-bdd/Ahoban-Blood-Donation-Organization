const HttpError = require('../errors/http-error')
const locations = require('./bangladesh-locations')
const upazilas = require('../../../shared/bangladesh-upazilas.json')

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const COORDINATE_FIELDS = ['latitude', 'longitude']

function validationError(fieldErrors) {
  throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', fieldErrors)
}

function readString(body, field, fieldErrors, { max = 300, min = 1, trim = true } = {}) {
  const value = body?.[field]
  if (typeof value !== 'string') {
    fieldErrors[field] = 'This field is required.'
    return ''
  }
  const result = trim ? value.trim() : value
  if (result.length < min || result.length > max) {
    fieldErrors[field] = `Enter between ${min} and ${max} characters.`
  }
  return result
}

function readOptionalString(body, field, fieldErrors, { max = 300 } = {}) {
  const value = body?.[field]
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') {
    fieldErrors[field] = 'Enter a valid value.'
    return ''
  }
  const result = value.trim()
  if (result.length > max) fieldErrors[field] = `Enter no more than ${max} characters.`
  return result
}

function readBoolean(value, field, fieldErrors, defaultValue = false) {
  if (value === undefined) return defaultValue
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  fieldErrors[field] = 'Choose a valid option.'
  return defaultValue
}

function readLastDonationDate(value, fieldErrors) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    fieldErrors.lastDonationDate = 'Enter a valid donation date.'
    return null
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fieldErrors.lastDonationDate = 'Enter a valid donation date.'
    return null
  }
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  if (date.getTime() > today) fieldErrors.lastDonationDate = 'Last donation date cannot be in the future.'
  return date
}

function validateDonationDate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    validationError({ donationDate: 'Select a valid donation date.' })
  }
  const fieldErrors = {}
  for (const key of Object.keys(body)) {
    if (key !== 'donationDate') fieldErrors[key] = 'This field cannot be submitted here.'
  }
  const value = body.donationDate
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    fieldErrors.donationDate = 'Select a valid donation date.'
  } else {
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      fieldErrors.donationDate = 'Select a valid donation date.'
    } else {
      const now = new Date()
      const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      if (date.getTime() > today) fieldErrors.donationDate = 'Donation date cannot be in the future.'
    }
  }
  if (Object.keys(fieldErrors).length) validationError(fieldErrors)
  return new Date(`${value}T00:00:00.000Z`)
}

function readPreviousBloodDonations(value, fieldErrors, defaultValue = 0) {
  if (value === undefined || value === null || value === '') return defaultValue
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isSafeInteger(number) || number < 0) {
    fieldErrors.previousBloodDonations = 'Enter a non-negative whole number.'
    return defaultValue
  }
  return number
}

function readCoordinates(body, fieldErrors) {
  const values = COORDINATE_FIELDS.map((field) => body?.[field])
  if (values.every((value) => value === undefined || value === null || value === '')) {
    return { latitude: null, longitude: null }
  }
  if (values.some((value) => value === undefined || value === null || value === '')) {
    fieldErrors.latitude = 'Provide both latitude and longitude.'
    fieldErrors.longitude = 'Provide both latitude and longitude.'
    return { latitude: null, longitude: null }
  }
  const [latitude, longitude] = values.map(Number)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    fieldErrors.latitude = 'Enter a valid latitude.'
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    fieldErrors.longitude = 'Enter a valid longitude.'
  }
  return { latitude, longitude }
}

function validateUpazila(district, upazila, fieldErrors, { required = false } = {}) {
  if (!upazila && !required) return
  if (!upazila || !(upazilas[district] || []).includes(upazila)) {
    fieldErrors.upazila = 'Select an upazila within the chosen district.'
  }
}

function validateRegistration(body) {
  const fieldErrors = {}
  const fullName = readString(body, 'fullName', fieldErrors, { min: 2, max: 100 })
  const email = readString(body, 'email', fieldErrors, { max: 254 }).toLowerCase()
  const phone = readString(body, 'phone', fieldErrors, { max: 16 })
  const whatsappNumber = readOptionalString(body, 'whatsappNumber', fieldErrors, { max: 16 })
  const bloodGroup = readString(body, 'bloodGroup', fieldErrors, { max: 3 })
  const division = readString(body, 'division', fieldErrors, { max: 40 })
  const district = readString(body, 'district', fieldErrors, { max: 40 })
  const upazila = readString(body, 'upazila', fieldErrors, { max: 80 })
  const location = readString(body, 'location', fieldErrors, { min: 2, max: 100 })
  const lastDonationDate = readLastDonationDate(body?.lastDonationDate, fieldErrors)
  const previousBloodDonations = readPreviousBloodDonations(body?.previousBloodDonations, fieldErrors)
  const { latitude, longitude } = readCoordinates(body, fieldErrors)
  const password = readString(body, 'password', fieldErrors, { min: 12, max: 72, trim: false })

  if (email && !EMAIL_PATTERN.test(email)) fieldErrors.email = 'Enter a valid email address.'
  if (phone && !PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))) {
    fieldErrors.phone = 'Enter a valid Bangladesh mobile number.'
  }
  if (whatsappNumber && !PHONE_PATTERN.test(whatsappNumber.replace(/[\s-]/g, ''))) {
    fieldErrors.whatsappNumber = 'Enter a valid Bangladesh WhatsApp number.'
  }
  if (bloodGroup && !BLOOD_GROUPS.has(bloodGroup)) {
    fieldErrors.bloodGroup = 'Select a valid blood group.'
  }
  if (division && !Object.hasOwn(locations, division)) {
    fieldErrors.division = 'Select a valid division.'
  } else if (district && !locations[division]?.includes(district)) {
    fieldErrors.district = 'Select a district within the chosen division.'
  }
  validateUpazila(district, upazila, fieldErrors, { required: true })
  if (password && Buffer.byteLength(password, 'utf8') > 72) {
    fieldErrors.password = 'Password must not exceed 72 UTF-8 bytes.'
  }
  if (body?.confirmPassword !== password) {
    fieldErrors.confirmPassword = 'Passwords do not match.'
  }
  if (!readBoolean(body?.acceptTerms, 'acceptTerms', fieldErrors)) {
    fieldErrors.acceptTerms = 'You must accept the terms and privacy policy.'
  }
  if (Object.hasOwn(body || {}, 'isDonorAvailable')) {
    fieldErrors.isDonorAvailable = 'Donation eligibility is calculated from the last donation date.'
  }
  const isSearchable = readBoolean(body?.isSearchable, 'isSearchable', fieldErrors)
  const isContactPublic = readBoolean(body?.isContactPublic, 'isContactPublic', fieldErrors)
  if (Object.keys(fieldErrors).length) validationError(fieldErrors)

  return {
    fullName,
    email,
    phone: phone.replace(/[\s-]/g, ''),
    whatsappNumber: whatsappNumber.replace(/[\s-]/g, ''),
    bloodGroup,
    division,
    district,
    upazila,
    location,
    lastDonationDate,
    previousBloodDonations,
    latitude,
    longitude,
    isSearchable,
    isContactPublic,
    password,
  }
}

function validateLogin(body) {
  const fieldErrors = {}
  const identifier = readString(body, 'identifier', fieldErrors, { max: 254 })
  const password = readString(body, 'password', fieldErrors, { max: 72, trim: false })
  if (identifier && !EMAIL_PATTERN.test(identifier) && !/^AHB-[A-F0-9]{16}$/i.test(identifier)) {
    fieldErrors.identifier = 'Enter a valid email address or Ahoban User ID.'
  }
  if (Object.keys(fieldErrors).length) validationError(fieldErrors)
  return { identifier, password }
}

const PROFILE_FIELDS = new Set([
  'fullName',
  'phone',
  'whatsappNumber',
  'bloodGroup',
  'division',
  'district',
  'upazila',
  'location',
  'isSearchable',
  'isContactPublic',
  'latitude',
  'longitude',
])

function validateProfileUpdate(body, currentProfile) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    validationError({ profile: 'Submit profile fields as an object.' })
  }

  const fieldErrors = {}
  const keys = Object.keys(body)
  for (const key of keys) {
    if (!PROFILE_FIELDS.has(key)) fieldErrors[key] = 'This field cannot be changed here.'
  }
  if (keys.length === 0) fieldErrors.profile = 'Provide at least one profile field to update.'

  const input = {}
  for (const field of keys.filter((key) => PROFILE_FIELDS.has(key))) {
    if (field === 'isSearchable' || field === 'isContactPublic') {
      input[field] = readBoolean(body[field], field, fieldErrors)
    } else if (COORDINATE_FIELDS.includes(field)) {
      continue
    } else if (field === 'whatsappNumber') {
      input[field] = readOptionalString(body, field, fieldErrors, { max: 16 }).replace(/[\s-]/g, '')
    } else if (field === 'upazila') {
      input[field] = readOptionalString(body, field, fieldErrors, { max: 80 })
    } else {
      const limits = {
        fullName: { min: 2, max: 100 },
        phone: { min: 1, max: 16 },
        bloodGroup: { min: 1, max: 3 },
        division: { min: 1, max: 40 },
        district: { min: 1, max: 40 },
        location: { min: 2, max: 100 },
      }[field]
      input[field] = readString(body, field, fieldErrors, limits)
    }
  }

  if (input.phone && !PHONE_PATTERN.test(input.phone.replace(/[\s-]/g, ''))) {
    fieldErrors.phone = 'Enter a valid Bangladesh mobile number.'
  } else if (input.phone) {
    input.phone = input.phone.replace(/[\s-]/g, '')
  }
  if (input.whatsappNumber && !PHONE_PATTERN.test(input.whatsappNumber)) {
    fieldErrors.whatsappNumber = 'Enter a valid Bangladesh WhatsApp number.'
  }
  if (input.bloodGroup && !BLOOD_GROUPS.has(input.bloodGroup)) {
    fieldErrors.bloodGroup = 'Select a valid blood group.'
  }
  if (input.division && !Object.hasOwn(locations, input.division)) {
    fieldErrors.division = 'Select a valid division.'
  }
  const coordinates = readCoordinates(body, fieldErrors)
  if (COORDINATE_FIELDS.some((field) => Object.hasOwn(body, field))) {
    Object.assign(input, coordinates)
  }
  const targetDivision = input.division || currentProfile.division
  const targetDistrict = input.district || currentProfile.district
  if (input.division && !input.district && !locations[input.division]?.includes(targetDistrict)) {
    fieldErrors.district = 'Select a district within the chosen division.'
  } else if (input.district) {
    if (!Object.hasOwn(locations, targetDivision) || !locations[targetDivision]?.includes(targetDistrict)) {
      fieldErrors.district = 'Select a district within the chosen division.'
    }
  }
  const targetUpazila = Object.hasOwn(input, 'upazila') ? input.upazila : currentProfile.upazila
  if (targetUpazila) validateUpazila(targetDistrict, targetUpazila, fieldErrors)
  if (Object.keys(fieldErrors).length) validationError(fieldErrors)
  return input
}

module.exports = { validateDonationDate, validateLogin, validateProfileUpdate, validateRegistration }

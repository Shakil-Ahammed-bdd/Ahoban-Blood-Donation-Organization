const mongoose = require('mongoose')
const bangladeshUpazilas = require('../../../shared/bangladesh-upazilas.json')

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    division: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    upazila: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
      validate: {
        validator(value) {
          if (this instanceof mongoose.Query && !this.get('district')) return true
          const district = this instanceof mongoose.Query ? this.get('district') : this.district
          return !value || (bangladeshUpazilas[district] || []).includes(value)
        },
        message: 'Select an upazila within the chosen district.',
      },
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 16,
    },
    lastDonationDate: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          if (!value) return true
          const today = new Date()
          const todayStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
          const valueStart = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
          return valueStart <= todayStart
        },
        message: 'Last donation date cannot be in the future.',
      },
    },
    previousBloodDonations: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Previous blood donations must be a non-negative integer.',
      },
    },
    donationHistory: {
      type: [{
        donationDate: {
          type: Date,
          required: true,
        },
        loggedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      }],
      default: [],
    },
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    isSearchable: {
      type: Boolean,
      default: false,
    },
    isContactPublic: {
      type: Boolean,
      default: false,
    },
    profilePhotoUrl: {
      type: String,
      default: '',
      maxlength: 500,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'super_admin'],
      default: 'user',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    permissions: {
      manageAdmins: {
        type: Boolean,
        default: false,
      },
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
)

userSchema.pre('save', function normalizeRole() {
  if (!['user', 'admin', 'super_admin'].includes(this.role)) {
    this.role = 'user'
  }
})


userSchema.index({ isSearchable: 1, bloodGroup: 1, division: 1, district: 1 })
userSchema.index({ isSearchable: 1, createdAt: -1, _id: -1 })
userSchema.index({ bloodGroup: 1 })
userSchema.index({ createdAt: 1 })
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'super_admin' },
    name: 'one_super_admin',
  },
)

module.exports = mongoose.models.User || mongoose.model('User', userSchema)

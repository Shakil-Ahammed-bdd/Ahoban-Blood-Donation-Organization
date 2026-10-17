const mongoose = require('mongoose')

const experienceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    donorName: { type: String, required: true, trim: true, maxlength: 100 },
    publicUserId: { type: String, required: true, trim: true, maxlength: 24 },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    division: { type: String, required: true, trim: true, maxlength: 40 },
    district: { type: String, required: true, trim: true, maxlength: 40 },
    location: { type: String, trim: true, maxlength: 100, default: '' },
    donationDate: { type: Date, required: true },
    message: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
    donationCount: { type: Number, min: 1, max: 1000 },
    images: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
      validate: {
        validator(images) {
          return Array.isArray(images) &&
            images.length <= 5 &&
            (images.length >= 1 || Boolean(this.photoUrl))
        },
        message: 'An experience must have between one and five images.',
      },
    },
    photoUrl: { type: String, maxlength: 500 },
    isPublic: { type: Boolean, required: true, default: false },
    // Kept during the transition from the original explicit-consent field.
    publicConsent: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: 'pending',
    },
  },
  { timestamps: true },
)

experienceSchema.index({ isPublic: 1, status: 1, donationDate: -1, createdAt: -1 })
experienceSchema.index({ userId: 1, createdAt: -1 })

module.exports =
  mongoose.models.Experience || mongoose.model('Experience', experienceSchema)

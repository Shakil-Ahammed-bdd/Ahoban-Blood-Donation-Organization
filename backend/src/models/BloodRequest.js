const mongoose = require('mongoose')

const bloodRequestSchema = new mongoose.Schema(
  {
    requesterName: { type: String, required: true, trim: true, maxlength: 100 },
    patientName: { type: String, required: true, trim: true, maxlength: 100 },
    patientIssue: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    hospitalName: { type: String, required: true, trim: true, maxlength: 120 },
    hospitalLocation: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    units: { type: Number, required: true, min: 1, max: 20 },
    requiredAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'fulfilled', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['active', 'fulfilled', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    managementTokenHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
)

bloodRequestSchema.index({ status: 1, createdAt: -1 })
bloodRequestSchema.index({ status: 1, fulfillmentStatus: 1, requiredAt: 1 })

module.exports = mongoose.models.BloodRequest || mongoose.model('BloodRequest', bloodRequestSchema)

const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bloodRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['blood_request_match', 'whatsapp_message'],
      default: 'blood_request_match',
      index: true,
    },
    channel: {
      type: String,
      enum: ['in_app', 'whatsapp'],
      default: 'in_app',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'normal'],
      default: 'normal',
      index: true,
    },
    messageId: {
      type: String,
      default: '',
    },
    errorDetails: {
      type: String,
      default: '',
    },
    readAt: {
      type: Date,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
)

notificationSchema.index(
  { bloodRequestId: 1, recipient: 1, channel: 1 },
  { unique: true, name: 'unique_blood_request_notification_per_channel' },
)

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

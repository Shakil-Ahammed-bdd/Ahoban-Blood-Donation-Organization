const mongoose = require('mongoose')

const experienceReactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experience',
      required: true,
      immutable: true,
    },
    type: { type: String, enum: ['like', 'love'], required: true },
  },
  { timestamps: true },
)

experienceReactionSchema.index({ userId: 1, experienceId: 1 }, { unique: true })
experienceReactionSchema.index({ experienceId: 1, createdAt: -1 })

module.exports =
  mongoose.models.ExperienceReaction ||
  mongoose.model('ExperienceReaction', experienceReactionSchema)

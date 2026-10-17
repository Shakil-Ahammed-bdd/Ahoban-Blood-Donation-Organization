const mongoose = require('mongoose')

const experienceCommentSchema = new mongoose.Schema(
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
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: true },
)

experienceCommentSchema.index({ experienceId: 1, createdAt: 1 })
experienceCommentSchema.index({ userId: 1, createdAt: -1 })

module.exports =
  mongoose.models.ExperienceComment ||
  mongoose.model('ExperienceComment', experienceCommentSchema)

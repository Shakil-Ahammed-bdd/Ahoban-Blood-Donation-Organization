const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      unique: true,
    },
    shortDescription: { type: String, required: true, trim: true, maxlength: 320 },
    coverImage: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    content: { type: String, required: true, maxlength: 100000 },
    author: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishAt: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false },
    metaTitle: { type: String, trim: true, maxlength: 180, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 320, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

blogSchema.index({ status: 1, publishAt: -1, createdAt: -1 })
blogSchema.index({ category: 1, status: 1, publishAt: -1 })

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema)

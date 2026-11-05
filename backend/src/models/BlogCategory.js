const mongoose = require('mongoose')

const blogCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

module.exports = mongoose.models.BlogCategory || mongoose.model('BlogCategory', blogCategorySchema)

const mongoose = require('mongoose')
const Experience = require('../models/Experience')
const ExperienceComment = require('../models/ExperienceComment')
const ExperienceReaction = require('../models/ExperienceReaction')
const { removeImages } = require('./experience-image-storage')
const HttpError = require('../errors/http-error')

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Social interactions are temporarily unavailable.')
  }
}

async function findPublicExperience(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  const experience = await Experience.exists({
    _id: id,
    isPublic: true,
    status: 'approved',
  })
  if (!experience) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
}

async function getExperienceSummaries(experiences, userId) {
  if (!experiences.length) return experiences
  ensureDatabase()
  const ids = experiences.map(({ id }) => new mongoose.Types.ObjectId(id))
  const [reactionCounts, commentCounts, userReactions] = await Promise.all([
    ExperienceReaction.aggregate([
      { $match: { experienceId: { $in: ids } } },
      { $group: { _id: '$experienceId', count: { $sum: 1 } } },
    ]),
    ExperienceComment.aggregate([
      { $match: { experienceId: { $in: ids } } },
      { $group: { _id: '$experienceId', count: { $sum: 1 } } },
    ]),
    userId
      ? ExperienceReaction.find({ experienceId: { $in: ids }, userId }).select('experienceId type').lean()
      : Promise.resolve([]),
  ])
  const reactionCountById = new Map(reactionCounts.map(({ _id, count }) => [String(_id), count]))
  const commentCountById = new Map(commentCounts.map(({ _id, count }) => [String(_id), count]))
  const userReactionById = new Map(userReactions.map(({ experienceId, type }) => [String(experienceId), type]))
  return experiences.map((experience) => ({
    ...experience,
    reactionCount: reactionCountById.get(experience.id) || 0,
    commentCount: commentCountById.get(experience.id) || 0,
    currentReaction: userReactionById.get(experience.id) || null,
  }))
}

async function getReactions(id, userId) {
  ensureDatabase()
  await findPublicExperience(id)
  const [count, current] = await Promise.all([
    ExperienceReaction.countDocuments({ experienceId: id }),
    userId ? ExperienceReaction.findOne({ experienceId: id, userId }).select('type').lean() : null,
  ])
  return { count, currentReaction: current?.type || null }
}

async function toggleReaction(id, userId, type) {
  ensureDatabase()
  await findPublicExperience(id)
  if (!['like', 'love'].includes(type)) {
    throw new HttpError(400, 'INVALID_REACTION', 'Choose a supported reaction.', {
      type: 'Choose like or love.',
    })
  }

  const existing = await ExperienceReaction.findOne({ experienceId: id, userId })
  if (existing?.type === type) {
    await existing.deleteOne()
  } else if (existing) {
    existing.type = type
    await existing.save()
  } else {
    try {
      await ExperienceReaction.create({ experienceId: id, userId, type })
    } catch (error) {
      if (error.code !== 11000) throw error
      await ExperienceReaction.updateOne({ experienceId: id, userId }, { $set: { type } })
    }
  }
  return getReactions(id, userId)
}

async function removeReaction(id, userId) {
  ensureDatabase()
  await findPublicExperience(id)
  await ExperienceReaction.deleteOne({ experienceId: id, userId })
  return getReactions(id, userId)
}

async function listComments(id, { page = 1, limit = 10 } = {}) {
  ensureDatabase()
  await findPublicExperience(id)
  const criteria = { experienceId: id }
  const [comments, total] = await Promise.all([
    ExperienceComment.find(criteria)
      .populate('userId', 'userId fullName profilePhotoUrl')
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ExperienceComment.countDocuments(criteria),
  ])
  return {
    comments: comments.map(serializeComment),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

function serializeComment(comment) {
  const user = comment.userId
  return {
    id: String(comment._id),
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: user
      ? {
          id: String(user._id),
          userId: user.userId,
          fullName: user.fullName,
          profilePhotoUrl: user.profilePhotoUrl || '',
        }
      : { id: '', userId: '', fullName: 'আহ্বান সদস্য', profilePhotoUrl: '' },
  }
}

async function createComment(experienceId, userId, content) {
  ensureDatabase()
  await findPublicExperience(experienceId)
  if (typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 1000) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please check your comment.', {
      content: 'Comment must be between 1 and 1000 characters.',
    })
  }
  const comment = await ExperienceComment.create({
    experienceId,
    userId,
    content: content.trim(),
  })
  await comment.populate('userId', 'userId fullName profilePhotoUrl')
  return serializeComment(comment)
}

async function updateComment(id, userId, content) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'COMMENT_NOT_FOUND', 'The comment was not found.')
  }
  if (typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 1000) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please check your comment.', {
      content: 'Comment must be between 1 and 1000 characters.',
    })
  }
  const existing = await ExperienceComment.findOne({ _id: id, userId })
  if (!existing) throw new HttpError(404, 'COMMENT_NOT_FOUND', 'The comment was not found.')
  await findPublicExperience(existing.experienceId)
  const comment = await ExperienceComment.findOneAndUpdate(
    { _id: id, userId },
    { $set: { content: content.trim() } },
    { returnDocument: 'after', runValidators: true },
  ).populate('userId', 'userId fullName profilePhotoUrl')
  if (!comment) throw new HttpError(404, 'COMMENT_NOT_FOUND', 'The comment was not found.')
  return serializeComment(comment)
}

async function deleteComment(id, userId) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'COMMENT_NOT_FOUND', 'The comment was not found.')
  }
  const comment = await ExperienceComment.findOne({ _id: id, userId })
  if (!comment) throw new HttpError(404, 'COMMENT_NOT_FOUND', 'The comment was not found.')
  await findPublicExperience(comment.experienceId)
  await comment.deleteOne()
}

async function deleteExperienceInteractions(experienceId) {
  await Promise.all([
    ExperienceReaction.deleteMany({ experienceId }),
    ExperienceComment.deleteMany({ experienceId }),
  ])
}

async function deleteUserInteractions(userId) {
  const userExperiences = await Experience.find({ userId }).select('_id images photoUrl').lean()
  const experienceIds = userExperiences.map(({ _id }) => _id)
  await Promise.all([
    ExperienceReaction.deleteMany({ $or: [{ userId }, { experienceId: { $in: experienceIds } }] }),
    ExperienceComment.deleteMany({ $or: [{ userId }, { experienceId: { $in: experienceIds } }] }),
    Experience.deleteMany({ userId }),
    removeImages(userExperiences.flatMap(({ images, photoUrl }) => [...(images || []), photoUrl].filter(Boolean))),
  ])
}

module.exports = {
  createComment,
  deleteComment,
  deleteExperienceInteractions,
  deleteUserInteractions,
  getExperienceSummaries,
  getReactions,
  listComments,
  removeReaction,
  toggleReaction,
  updateComment,
}

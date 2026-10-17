function getExperienceModeratorIds() {
  return new Set(
    (process.env.EXPERIENCE_MODERATOR_USER_IDS || '')
      .split(',')
      .map((userId) => userId.trim().toUpperCase())
      .filter(Boolean),
  )
}

function isExperienceModerator(user) {
  if (!user) return false
  const moderatorIds = getExperienceModeratorIds()
  return moderatorIds.has(String(user._id || user.id).toUpperCase()) ||
    moderatorIds.has(String(user.userId || '').toUpperCase())
}

module.exports = { getExperienceModeratorIds, isExperienceModerator }

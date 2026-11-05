function approvedExperienceCriteria(criteria = {}) {
  return {
    ...criteria,
    isPublic: true,
    $or: [{ status: 'approved' }, { status: { $exists: false } }],
  }
}

module.exports = { approvedExperienceCriteria }

const { getDonor, searchDonors } = require('../services/donor.service')

async function listDonors(req, res, next) {
  try {
    res.json({ status: 'ok', ...await searchDonors(req.query) })
  } catch (error) {
    next(error)
  }
}

async function readDonor(req, res, next) {
  try {
    res.json({ status: 'ok', donor: await getDonor(req.params.id) })
  } catch (error) {
    next(error)
  }
}

module.exports = { listDonors, readDonor }

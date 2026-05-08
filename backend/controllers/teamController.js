const TeamAccount = require('../models/TeamAccount');

const createTeam = async (req, res) => {
  try {
    const { name, company, seats } = req.body;
    const team = await TeamAccount.create({
      name,
      company,
      seats: seats || 5,
      ownerId: req.user._id,
      members: [req.user._id],
    });
    return res.status(201).json({ success: true, data: { team } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const listMyTeams = async (req, res) => {
  try {
    const teams = await TeamAccount.find({
      $or: [{ ownerId: req.user._id }, { members: req.user._id }],
      isActive: true,
    }).sort({ createdAt: -1 });
    return res.json({ success: true, data: { teams } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createTeam, listMyTeams };

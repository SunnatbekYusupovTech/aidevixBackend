const Job = require('../models/Job');

const listJobs = async (req, res) => {
  try {
    const { q = '', level, type } = req.query;
    const filter = { isActive: true };
    if (level) filter.level = level;
    if (type) filter.type = type;
    if (q.trim()) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { company: { $regex: escaped, $options: 'i' } },
        { skills: { $regex: escaped, $options: 'i' } },
      ];
    }
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, data: { jobs } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createJob = async (req, res) => {
  try {
    const job = await Job.create(req.body);
    return res.status(201).json({ success: true, data: { job } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { listJobs, createJob };

const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');
const SavedPrompt = require('../models/SavedPrompt');
const UserStats = require('../models/UserStats');

/** @route GET /api/prompts | @access Public */
const getPrompts = async (req, res) => {
  try {
    const { category, tool, sort = 'newest', page = 1, limit = 20, search } = req.query;
    const filter = { isPublic: true };

    if (category && category !== 'all') filter.category = category;
    if (tool && tool !== 'all') filter.tool = tool;
    if (search) filter.$text = { $search: search };

    const sortMap = {
      newest: { createdAt: -1 },
      popular: { likesCount: -1 },
      views: { viewsCount: -1 },
    };

    const prompts = await Prompt.find(filter)
      .populate('author', 'username firstName avatar aiStack')
      .sort(sortMap[sort] || sortMap.newest)
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Prompt.countDocuments(filter);

    res.json({ success: true, data: { prompts, total, page: +page, pages: Math.ceil(total / +limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route GET /api/prompts/featured | @access Public */
const getFeaturedPrompts = async (req, res) => {
  try {
    const prompts = await Prompt.find({ isFeatured: true, isPublic: true })
      .populate('author', 'username firstName avatar')
      .sort({ likesCount: -1 })
      .limit(6);
    res.json({ success: true, data: prompts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @route GET /api/prompts/saved/me | @access Private */
const getSavedPrompts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(50, Math.max(1, +req.query.limit || 12));
    const category = req.query.category;
    const search = String(req.query.search || '').trim();

    const pipeline = [
      { $match: { user: userId } },
      { $lookup: { from: 'prompts', localField: 'prompt', foreignField: '_id', as: 'p' } },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: false } },
      { $match: { 'p.isPublic': true } },
    ];

    if (category && category !== 'all') pipeline.push({ $match: { 'p.category': category } });
    if (search) {
      const r = new RegExp(escapeRegex(search), 'i');
      pipeline.push({ $match: { $or: [{ 'p.title': r }, { 'p.description': r }, { 'p.content': r }] } });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'users',
          let: { aid: '$p.author' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$aid'] } } },
            { $project: { username: 1, firstName: 1, avatar: 1, aiStack: 1, rankTitle: 1 } },
          ],
          as: 'authorArr',
        },
      },
      { $set: { 'p.author': { $arrayElemAt: ['$authorArr', 0] } } },
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                savedAt: '$updatedAt',
                _id: '$p._id',
                title: '$p.title',
                content: '$p.content',
                description: '$p.description',
                category: '$p.category',
                tool: '$p.tool',
                tags: '$p.tags',
                author: '$p.author',
                likesCount: '$p.likesCount',
                viewsCount: '$p.viewsCount',
                likes: '$p.likes',
                isFeatured: '$p.isFeatured',
                createdAt: '$p.createdAt',
              },
            },
          ],
          totalCount: [{ $count: 'c' }],
        },
      }
    );

    const result = await SavedPrompt.aggregate(pipeline);
    const row = result[0] || { data: [], totalCount: [] };
    const prompts = row.data;
    const total = row.totalCount[0]?.c || 0;
    res.json({
      success: true,
      data: { prompts, total, page, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route GET /api/prompts/saved/ids | @access Private */
const getSavedPromptIds = async (req, res) => {
  try {
    const ids = await SavedPrompt.find({ user: req.user._id }).distinct('prompt');
    res.json({ success: true, data: { ids: ids.map((id) => id.toString()) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route POST /api/prompts/:id/save | @access Private */
const savePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, isPublic: true });
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });
    await SavedPrompt.updateOne(
      { user: req.user._id, prompt: prompt._id },
      { $setOnInsert: { user: req.user._id, prompt: prompt._id } },
      { upsert: true }
    );
    res.json({ success: true, saved: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route DELETE /api/prompts/:id/save | @access Private */
const unsavePrompt = async (req, res) => {
  try {
    await SavedPrompt.deleteOne({ user: req.user._id, prompt: req.params.id });
    res.json({ success: true, saved: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route GET /api/prompts/:id | @access Public */
const getPrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).populate('author', 'username firstName avatar aiStack rankTitle');

    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });
    res.json({ success: true, data: prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route POST /api/prompts/:id/view | @access Public */
const viewPrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });
    return res.json({ success: true, viewsCount: prompt.viewsCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** @route POST /api/prompts | @access Private */
const createPrompt = async (req, res) => {
  try {
    const { title, content, description, category, tool, tags } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'title va content majburiy' });

    const prompt = await Prompt.create({
      title, content, description, category, tool,
      tags: (tags || []).slice(0, 5),
      author: req.user._id,
    });

    // Prompt yaratgani uchun XP +30
    await UserStats.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { xp: 30, weeklyXp: 30 } }
    );

    await prompt.populate('author', 'username firstName avatar');
    res.status(201).json({ success: true, message: 'Prompt yaratildi! +30 XP', data: prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route POST /api/prompts/:id/like | @access Private */
const likePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });

    const userId = req.user._id.toString();
    const alreadyLiked = prompt.likes.some(id => id.toString() === userId);

    if (alreadyLiked) {
      prompt.likes = prompt.likes.filter(id => id.toString() !== userId);
      prompt.likesCount = Math.max(0, prompt.likesCount - 1);
    } else {
      prompt.likes.push(req.user._id);
      prompt.likesCount += 1;
    }

    await prompt.save();
    res.json({ success: true, liked: !alreadyLiked, likesCount: prompt.likesCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route DELETE /api/prompts/:id | @access Private (owner or admin) */
const deletePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });

    const isOwner = prompt.author.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });

    await SavedPrompt.deleteMany({ prompt: req.params.id });
    await prompt.deleteOne();
    res.json({ success: true, message: 'Prompt o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route PATCH /api/prompts/:id/feature | @access Admin */
const featurePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { isFeatured: req.body.featured ?? true },
      { new: true }
    );
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });
    res.json({ success: true, data: prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route GET /api/admin/prompts | @access Admin */
const adminListPrompts = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const search = String(req.query.search || '').trim();
    const category = req.query.category;
    const tool = req.query.tool;
    const featured = req.query.featured;
    const visibility = req.query.visibility;

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (tool && tool !== 'all') filter.tool = tool;
    if (featured === 'true') filter.isFeatured = true;
    if (featured === 'false') filter.isFeatured = false;
    if (visibility === 'public') filter.isPublic = true;
    if (visibility === 'hidden') filter.isPublic = false;
    if (search) {
      const r = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: r }, { description: r }, { content: r }];
    }

    const [prompts, total] = await Promise.all([
      Prompt.find(filter)
        .populate('author', 'username email avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Prompt.countDocuments(filter),
    ]);

    res.json({ success: true, data: { prompts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route PATCH /api/admin/prompts/:id/visibility | @access Admin */
const adminSetPromptVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isPublic boolean bo\'lishi kerak' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz prompt ID' });
    }
    const prompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { isPublic },
      { new: true }
    );
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt topilmadi' });

    const logger = require('../utils/logger');
    logger.info('admin_prompt_visibility', {
      adminId: String(req.user._id),
      adminUsername: req.user.username,
      promptId: req.params.id,
      isPublic,
    });

    res.json({ success: true, data: prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPrompts,
  getFeaturedPrompts,
  getSavedPrompts,
  getSavedPromptIds,
  savePrompt,
  unsavePrompt,
  getPrompt,
  viewPrompt,
  createPrompt,
  likePrompt,
  deletePrompt,
  featurePrompt,
  adminListPrompts,
  adminSetPromptVisibility,
};

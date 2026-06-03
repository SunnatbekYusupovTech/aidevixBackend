const PromoCode = require('../models/PromoCode');

/** @route GET /api/admin/promos | @access Admin */
const listPromoCodes = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = (req.query.search || '').trim();
    const status = req.query.status; // 'active' | 'inactive' | ''

    const filter = {};
    if (search) filter.code = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (status === 'active')   filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const [promos, total] = await Promise.all([
      PromoCode.find(filter)
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PromoCode.countDocuments(filter),
    ]);

    res.json({ success: true, data: { promos, pagination: { total, page, limit } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route POST /api/admin/promos | @access Admin */
const createPromoCode = async (req, res) => {
  try {
    const { code, description, type, value, maxUses, courseIds, expiresAt } = req.body;

    if (!code || !type || !value) {
      return res.status(400).json({ success: false, message: 'code, type, value majburiy' });
    }
    if (type === 'percent' && (value < 1 || value > 100)) {
      return res.status(400).json({ success: false, message: 'Foiz chegirmasi 1-100 orasida bo\'lishi kerak' });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase().trim() });
    if (existing) return res.status(409).json({ success: false, message: 'Bu kod allaqachon mavjud' });

    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      description: description || '',
      type,
      value,
      maxUses:   maxUses   || null,
      courseIds: courseIds || [],
      expiresAt: expiresAt || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: { promo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route PUT /api/admin/promos/:id | @access Admin */
const updatePromoCode = async (req, res) => {
  try {
    const allowed = ['description', 'isActive', 'maxUses', 'expiresAt', 'courseIds'];
    const update  = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const promo = await PromoCode.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo kod topilmadi' });

    res.json({ success: true, data: { promo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route DELETE /api/admin/promos/:id | @access Admin */
const deletePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: 'Promo kod topilmadi' });

    res.json({ success: true, message: 'Promo kod o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @route GET /api/promos/validate/:code | @access Auth — payment flow */
const validatePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findOne({ code: req.params.code.toUpperCase().trim() });
    if (!promo || !promo.isActive) {
      return res.status(404).json({ success: false, message: 'Promo kod noto\'g\'ri yoki faol emas' });
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.status(410).json({ success: false, message: 'Promo kod muddati tugagan' });
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return res.status(410).json({ success: false, message: 'Promo kod limitga yetdi' });
    }
    // courseId scope: promo aniq kurslarga bog'langan bo'lsa, so'ralayotgan kurs ichida bo'lishi shart
    const courseId = (req.query.courseId || '').toString().trim();
    if (
      courseId &&
      Array.isArray(promo.courseIds) && promo.courseIds.length > 0 &&
      !promo.courseIds.some(cid => String(cid) === courseId)
    ) {
      return res.status(409).json({ success: false, message: 'Promo kod bu kursga taalluqli emas' });
    }

    res.json({
      success: true,
      data: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        description: promo.description,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, validatePromoCode };

const Course = require('../models/Course');
const Video  = require('../models/Video');
const CourseRating = require('../models/CourseRating');
const Enrollment = require('../models/Enrollment');

/**
 * @desc  Barcha kurslar — filter, qidiruv, pagination
 * @route GET /api/courses?category=react&search=...&level=beginner&sort=popular&page=1&limit=12
 * @access Public
 */
const getAllCourses = async (req, res) => {
  try {
    const {
      category,
      search,
      level,
      sort    = 'newest',
      page    = 1,
      limit   = 12,
      isFree,
    } = req.query;

    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;
    if (level) filter.level = level;
    if (isFree !== undefined) filter.isFree = isFree === 'true';
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title:       { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const sortMap = {
      newest:     { createdAt: -1 },
      oldest:     { createdAt: 1 },
      popular:    { viewCount: -1 },
      rating:     { rating: -1 },
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.newest;

    const lim  = Math.min(Math.max(1, parseInt(limit) || 12), 50);
    const pg   = Math.max(1, parseInt(page) || 1);
    const skip = (pg - 1) * lim;
    const total = await Course.countDocuments(filter);

    const courses = await Course.find(filter)
      .populate('instructor', 'username email jobTitle position')
      .sort(sortOption)
      .skip(skip)
      .limit(lim)
      .lean();

    // Map through courses to populate videoCount and calculate valid video stats
    // Even without populating full video details, we have the IDs in the array to count

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          total,
          page:  pg,
          limit: lim,
          pages: Math.ceil(total / lim),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Top kurslar (eng ko'p ko'rilgan)
 * @route GET /api/courses/top?limit=6&category=react
 * @access Public
 */
const getTopCourses = async (req, res) => {
  try {
    const limit    = Math.min(parseInt(req.query.limit) || 6, 20);
    const category = req.query.category || null;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const courses = await Course.find(filter)
      .populate('instructor', 'username email')
      .sort({ viewCount: -1, rating: -1 })
      .limit(limit)
      .select('-videos')
      .lean();

    res.json({ success: true, data: { courses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Mavjud kategoriyalar va kurslar soni
 * @route GET /api/courses/categories
 * @access Public
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map((c) => ({ name: c._id, count: c.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Bitta kurs to'liq ma'lumoti (videolar va loyihalar bilan)
 * @route GET /api/courses/:id
 * @access Public
 */
const getCourse = async (req, res) => {
  try {
    // Avval mavjudligini tekshirish (populate dan oldin)
    const exists = await Course.findOne({ _id: req.params.id, isActive: true }).select('_id').lean();
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    }

    const course = await Course.findById(req.params.id)
      .populate('instructor', 'username email jobTitle position')
      .populate({
        path:   'videos',
        match:  { isActive: true },
        select: 'title description order duration thumbnail',
        options: { sort: { order: 1 } },
      })
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    }

    // Ko'rishlar sonini oshirish (background'da) — unhandled rejection oldini olish
    Course.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } })
      .exec()
      .catch((err) => console.error('[courseController] viewCount inc xato:', err.message));

    res.json({ success: true, data: { course } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Tavsiya etilgan kurslar — xuddi shu kategoriyadan, eng yuqori reytingli
 * @route GET /api/courses/:id/recommended?limit=4
 * @access Public
 */
const getRecommendedCourses = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).select('category');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 4, 20);

    const courses = await Course.find({
      isActive: true,
      category: course.category,
      _id: { $ne: req.params.id },
    })
      .populate('instructor', 'username email jobTitle position')
      .sort({ rating: -1, viewCount: -1 })
      .limit(limit)
      .select('-videos')
      .lean();

    res.json({ success: true, data: { courses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Yangi kurs yaratish (Admin)
 * @route POST /api/courses
 * @access Admin
 */
const createCourse = async (req, res) => {
  try {
    const {
      title, description, thumbnail, price, category,
      level, isFree, rating, ratingCount, studentsCount,
    } = req.body;

    if (!title || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'title, description va price majburiy maydonlar',
      });
    }

    const course = await Course.create({
      title,
      description,
      thumbnail:     thumbnail || null,
      price,
      category:      category || 'general',
      level:         level || 'beginner',
      isFree:        isFree || false,
      rating:        rating || 0,
      ratingCount:   ratingCount || 0,
      studentsCount: studentsCount || 0,
      instructor:    req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Kurs muvaffaqiyatli yaratildi',
      data: { course },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Kursni yangilash (Admin)
 * @route PUT /api/courses/:id
 * @access Admin
 */
const updateCourse = async (req, res) => {
  try {
    const allowed = [
      'title', 'description', 'thumbnail', 'price', 'category',
      'level', 'isFree', 'isActive', 'rating', 'ratingCount', 'studentsCount',
    ];

    const update = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    );

    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });

    res.json({ success: true, message: 'Kurs yangilandi', data: { course } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Kursni o'chirish (Admin)
 * @route DELETE /api/courses/:id
 * @access Admin
 */
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });

    await course.deleteOne();
    res.json({ success: true, message: 'Kurs o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Kursni baholash (1-5 yulduz)
 * @route POST /api/courses/:id/rate
 * @access Private
 */
const rateCourse = async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Reyting 1 dan 5 gacha bo\'lishi kerak' });
    }

    const course = await Course.findById(req.params.id);
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    }

    // Upsert rating — har bir foydalanuvchi faqat bir marta baholay oladi
    const existing = await CourseRating.findOne({ userId: req.user._id, courseId: course._id });

    if (existing) {
      existing.rating = rating;
      if (review !== undefined) existing.review = review;
      await existing.save();
    } else {
      await CourseRating.create({ userId: req.user._id, courseId: course._id, rating, review });
    }

    // Kurs o'rtacha reytingini qayta hisoblash
    const agg = await CourseRating.aggregate([
      { $match: { courseId: course._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (agg.length > 0) {
      course.rating      = Math.round(agg[0].avg * 10) / 10;
      course.ratingCount = agg[0].count;
      await course.save();
    }

    res.json({
      success: true,
      message: 'Baholash saqlandi',
      data: { rating: course.rating, ratingCount: course.ratingCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Foydalanuvchi uchun aqlli tavsiya — AI Stack + tugatilgan kurslar kategoriyasi
 *        + yozilgan kurslarni chetlatib turish (collaborative filtering basic)
 * @route GET /api/courses/recommended
 * @access Private
 */
const getUserRecommendedCourses = async (req, res) => {
  try {
    const User = require('../models/User');
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const user = await User.findById(req.user._id).select('aiStack').lean();

    // Foydalanuvchi yozilgan kurslar — duplikatlarni chetlatamiz
    const myEnrollments = await Enrollment.find({ userId: req.user._id })
      .select('courseId isCompleted')
      .lean();
    const enrolledIds = myEnrollments.map((e) => e.courseId);

    // Tugatilgan kurslar kategoriyalarini olamiz (signal)
    const completedCourseIds = myEnrollments.filter((e) => e.isCompleted).map((e) => e.courseId);
    const completedCats = completedCourseIds.length
      ? await Course.find({ _id: { $in: completedCourseIds } }).distinct('category')
      : [];

    // AI Stack → category mapping (AI yo'nalishini tushunish)
    const aiStack = user?.aiStack || [];
    const stackCats = [];
    if (aiStack.length > 0) stackCats.push('ai');
    if (aiStack.includes('Cursor') || aiStack.includes('Windsurf')) stackCats.push('javascript', 'typescript');
    if (aiStack.includes('GitHub Copilot')) stackCats.push('javascript', 'nodejs');
    if (aiStack.includes('Claude Code')) stackCats.push('ai', 'security');

    const preferredCats = [...new Set([...completedCats, ...stackCats])];

    let courses = [];
    if (preferredCats.length > 0) {
      courses = await Course.find({
        isActive: true,
        category: { $in: preferredCats },
        _id: { $nin: enrolledIds },
      })
        .populate('instructor', 'username jobTitle')
        .sort({ rating: -1, viewCount: -1 })
        .limit(limit)
        .select('-videos')
        .lean();
    }

    // Yetarli emas bo'lsa — eng mashhurlardan to'ldiramiz (tartib saqlanadi)
    if (courses.length < limit) {
      const fill = await Course.find({
        isActive: true,
        _id: { $nin: [...enrolledIds, ...courses.map((c) => c._id)] },
      })
        .populate('instructor', 'username jobTitle')
        .sort({ rating: -1, viewCount: -1 })
        .limit(limit - courses.length)
        .select('-videos')
        .lean();
      courses = [...courses, ...fill];
    }

    res.json({
      success: true,
      data: {
        courses,
        meta: {
          basedOn: preferredCats,
          enrolledExcluded: enrolledIds.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**

 * @desc  Kurs nomlarini autocomplete qidirish
 * @route GET /api/courses/autocomplete?q=react
 * @access Public
 */
const getAutocomplete = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ success: true, data: { suggestions: [] } });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suggestions = await Course.find({
      isActive: true,
      title: { $regex: escaped, $options: 'i' },
    })
      .select('_id title category')
      .limit(5)
      .lean();

    res.json({ success: true, data: { suggestions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Filter badge counters (frontend uchun)
 * @route GET /api/courses/filter-counts
 * @access Public
 */
const getFilterCounts = async (req, res) => {
  try {
    const [catAgg, levelAgg, freeCount, paidCount] = await Promise.all([
      Course.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Course.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]),
      Course.countDocuments({ isActive: true, isFree: true }),
      Course.countDocuments({ isActive: true, isFree: false }),
    ]);

    const categories = {};
    catAgg.forEach((c) => { categories[c._id] = c.count; });

    const levels = {};
    levelAgg.forEach((l) => { levels[l._id] = l.count; });

    res.json({
      success: true,
      data: { categories, levels, free: freeCount, paid: paidCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourse,
  getTopCourses,
  getCategories,
  getRecommendedCourses,
  getUserRecommendedCourses,
  getAutocomplete,
  getFilterCounts,
  createCourse,
  updateCourse,
  deleteCourse,
  rateCourse,
};

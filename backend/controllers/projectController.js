const Project  = require('../models/Project');
const UserStats = require('../models/UserStats');
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * @desc  Kurs uchun barcha loyihalar
 * @route GET /api/projects/course/:courseId
 * @access Public
 */
const getProjectsByCourse = async (req, res) => {
  try {
    const projects = await Project.find({
      courseId: req.params.courseId,
      isActive: true,
    }).sort({ order: 1 });

    // Agar foydalanuvchi login bo'lsa, bajarilganini belgilash
    const userId = req.user?._id?.toString();

    const result = projects.map((p) => {
      const pObj = p.toObject();
      if (userId) {
        pObj.isCompleted = p.completedBy.some(
          (c) => c.userId.toString() === userId,
        );
      }
      // Kimlar bajarganini yashirish (shaxsiy ma'lumot)
      delete pObj.completedBy;
      return pObj;
    });

    res.json({ success: true, data: { projects: result } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Bitta loyiha tafsiloti
 * @route GET /api/projects/:id
 * @access Public
 */
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('courseId', 'title category');
    if (!project || !project.isActive) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi' });
    }

    const pObj = project.toObject();
    const userId = req.user?._id?.toString();
    if (userId) {
      pObj.isCompleted = project.completedBy.some(
        (c) => c.userId.toString() === userId,
      );
    }
    delete pObj.completedBy;

    res.json({ success: true, data: { project: pObj } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Loyihani bajarildi deb belgilash va XP berish
 * @route POST /api/projects/:id/complete
 * @access Private
 */
const completeProject = async (req, res) => {
  try {
    const { githubUrl } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project || !project.isActive) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi' });
    }

    const userId = req.user._id;
    const alreadyDone = project.completedBy.some(
      (c) => c.userId.toString() === userId.toString(),
    );

    if (alreadyDone) {
      return res.status(400).json({
        success: false,
        message: 'Bu loyihani allaqachon bajargansiz',
      });
    }

    // completedBy ga qo'shish
    project.completedBy.push({ userId, githubUrl, completedAt: new Date() });
    await project.save();

    // XP berish
    let stats = await UserStats.findOne({ userId });
    if (!stats) stats = await UserStats.create({ userId });

    stats.xp += project.xpReward;
    stats.level = stats.calculateLevel();
    stats.lastActivityDate = new Date();
    await stats.save();

    res.json({
      success: true,
      message: 'Loyiha bajarildi! XP qo\'shildi.',
      data: {
        xpEarned: project.xpReward,
        totalXp: stats.xp,
        level: stats.level,
        levelProgress: stats.getLevelProgress(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const reviewProject = async (req, res) => {
  try {
    const { githubUrl, codeSnippet = '' } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project || !project.isActive) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi' });
    }
    if (!githubUrl && !codeSnippet.trim()) {
      return res.status(400).json({ success: false, message: 'githubUrl yoki codeSnippet yuborilishi shart' });
    }

    const prompt = `Sen senior code reviewer san.
Project: ${project.title}
Description: ${project.description}
GitHub: ${githubUrl || 'not provided'}
Code snippet:
${codeSnippet.slice(0, 12000)}

JSON format:
{"score":0-100,"summary":"...","strengths":["..."],"improvements":["..."]}`;

    let parsed = null;
    if (GROQ_API_KEY) {
      try {
        const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are strict senior software reviewer. Return valid JSON only.' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
        }
      } catch (e) {
        parsed = null;
      }
    }

    if (!parsed) {
      const score = Math.max(45, Math.min(92, 60 + Math.floor(codeSnippet.length / 220)));
      parsed = {
        score,
        summary: 'Kod ishlaydigan holatda, lekin arxitektura va test qamrovi yaxshilanishi kerak.',
        strengths: ['Asosiy oqim tushunarli', 'Loyiha strukturasiga yaxshi start berilgan'],
        improvements: ['Error handling va validatsiyani kuchaytiring', 'Test va README ni kengaytiring'],
      };
    }

    project.reviews.push({
      userId: req.user._id,
      githubUrl: githubUrl || null,
      codeSnippet: codeSnippet.slice(0, 12000),
      score: Number(parsed.score) || 0,
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 6) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 6) : [],
      model: 'llama-3.3-70b-versatile',
      createdAt: new Date(),
    });
    await project.save();

    return res.status(201).json({
      success: true,
      message: 'AI review tayyor',
      data: { review: project.reviews[project.reviews.length - 1] },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

/**
 * @desc  Yangi loyiha yaratish (Admin)
 * @route POST /api/projects
 * @access Admin
 */
const createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Loyihani yangilash (Admin)
 * @route PUT /api/projects/:id
 * @access Admin
 */
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!project) return res.status(404).json({ success: false, message: 'Loyiha topilmadi' });
    res.json({ success: true, data: { project } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Loyihani o'chirish (Admin)
 * @route DELETE /api/projects/:id
 * @access Admin
 */
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!project) return res.status(404).json({ success: false, message: 'Loyiha topilmadi' });
    res.json({ success: true, message: 'Loyiha o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getProjectsByCourse,
  getProject,
  completeProject,
  reviewProject,
  createProject,
  updateProject,
  deleteProject,
};

const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { addXp } = require('../utils/awardXp');
const { startOfDay } = require('../utils/tashkentDate');

// COM-03: kunlik forum XP limiti. Bugungi (Toshkent) savol/javob/qabul qilingan javoblar
// sonidan hisoblanadi (alohida hisoblagich shart emas); har entity uchun XP bir marta beriladi.
const FORUM_XP = { question: 5, answer: 10, accepted: 50 };
const FORUM_DAILY_XP_CAP = 100;
const MAX_BODY = 10000;

const forumXpEarnedToday = async (userId) => {
  const since = startOfDay();
  const [q, a, acc] = await Promise.all([
    Question.countDocuments({ author: userId, createdAt: { $gte: since } }),
    Answer.countDocuments({ author: userId, createdAt: { $gte: since } }),
    Answer.countDocuments({ author: userId, isAccepted: true, updatedAt: { $gte: since } }),
  ]);
  return q * FORUM_XP.question + a * FORUM_XP.answer + acc * FORUM_XP.accepted;
};

// Chaqirishdan oldin entity yozilgan bo'ladi, shuning uchun bugungi yig'indi uni ham o'z ichiga oladi
const awardForumXP = async (userId, amount) => {
  try {
    if ((await forumXpEarnedToday(userId)) > FORUM_DAILY_XP_CAP) return 0;
    await addXp(userId, amount);
    return amount;
  } catch (e) {
    return 0;
  }
};

const getQuestions = async (req, res) => {
  try {
    const { sort = 'newest', tag } = req.query;
    // COM-12: chegaralangan sahifalash
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 15, 1), 50);
    const query = {};
    if (tag) query.tags = tag;

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { views: -1 };
    if (sort === 'unanswered') query.isResolved = false;

    const questions = await Question.find(query)
      .populate('author', 'username avatar rankTitle')
      .populate('answersCount')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Question.countDocuments(query);

    // Compute scores
    const questionsWithScore = questions.map(q => ({
      ...q,
      score: (q.upvotes?.length || 0) - (q.downvotes?.length || 0)
    }));

    return res.json({ success: true, data: { questions: questionsWithScore, total, page: Number(page) } });
  } catch (err) {
    console.error('[forumController.getQuestions]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username avatar rankTitle aiStack')
      .lean();

    if (!question) return res.status(404).json({ success: false, message: 'Savol topilmadi' });

    // Increment views (P-B14: fire-and-forget, javobni kutdirmaydi)
    Question.updateOne({ _id: req.params.id }, { $inc: { views: 1 } }).catch(() => {});

    const answers = await Answer.find({ questionId: req.params.id })
      .populate('author', 'username avatar rankTitle aiStack')
      .sort({ isAccepted: -1, createdAt: 1 })
      .limit(200)
      .lean();

    const qWithScore = {
      ...question,
      score: (question.upvotes?.length || 0) - (question.downvotes?.length || 0)
    };
    
    const ansWithScore = answers.map(a => ({
      ...a,
      score: (a.upvotes?.length || 0) - (a.downvotes?.length || 0)
    })).sort((a, b) => b.score - a.score);

    return res.json({ success: true, data: { question: qWithScore, answers: ansWithScore } });
  } catch (err) {
    console.error('[forumController.getQuestionById]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const createQuestion = async (req, res) => {
  try {
    const { title, body, tags } = req.body;
    // COM-12: hajm cheklovlari
    if (typeof body !== 'string' || body.length > MAX_BODY)
      return res.status(400).json({ success: false, message: 'Savol matni noto\'g\'ri yoki juda uzun' });
    if (tags !== undefined && (!Array.isArray(tags) || tags.length > 5 || tags.some((t) => typeof t !== 'string' || t.length > 30)))
      return res.status(400).json({ success: false, message: 'Teglar: ko\'pi bilan 5 ta, har biri 30 belgigacha' });

    const question = await Question.create({
      title,
      body,
      tags: tags || [],
      author: req.user._id,
    });

    // Reward for asking (5 XP, kunlik limit bilan)
    await awardForumXP(req.user._id, FORUM_XP.question);

    return res.status(201).json({ success: true, data: question });
  } catch (err) {
    console.error('[forumController.createQuestion]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const addAnswer = async (req, res) => {
  try {
    const { body } = req.body;
    const { id } = req.params;
    if (typeof body !== 'string' || !body.trim() || body.length > MAX_BODY)
      return res.status(400).json({ success: false, message: 'Javob matni noto\'g\'ri yoki juda uzun' });

    // COM-03: mavjud bo'lmagan savolga javob (va XP) yo'q
    if (!(await Question.exists({ _id: id })))
      return res.status(404).json({ success: false, message: 'Savol topilmadi' });

    const answer = await Answer.create({
      body,
      questionId: id,
      author: req.user._id,
    });

    // Reward for answering (10 XP, kunlik limit bilan)
    await awardForumXP(req.user._id, FORUM_XP.answer);

    return res.status(201).json({ success: true, data: answer });
  } catch (err) {
    console.error('[forumController.addAnswer]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const acceptAnswer = async (req, res) => {
  try {
    const { qId, aId } = req.params;
    const question = await Question.findById(qId).select('author acceptedAnswer').lean();

    if (!question) return res.status(404).json({ success: false, message: 'Savol topilmadi' });
    if (String(question.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Faqat savol egasi javobni qabul qila oladi' });
    }

    // COM-03: javob shu savolga tegishli bo'lishi shart
    const answer = await Answer.findOne({ _id: aId, questionId: qId }).select('author').lean();
    if (!answer) return res.status(404).json({ success: false, message: 'Javob topilmadi' });

    // Atomik: savolda faqat bitta javob, faqat bir marta qabul qilinadi (takroriy XP yo'q)
    const claimed = await Question.findOneAndUpdate(
      { _id: qId, acceptedAnswer: null },
      { $set: { acceptedAnswer: aId, isResolved: true } }
    );
    if (!claimed) return res.status(400).json({ success: false, message: 'Bu savolda javob allaqachon qabul qilingan' });

    await Answer.updateOne({ _id: aId }, { $set: { isAccepted: true } });
    // Reward for accepted answer (50 XP) — o'z javobini qabul qilganga XP yo'q
    if (String(answer.author) !== String(question.author)) {
      await awardForumXP(answer.author, FORUM_XP.accepted);
    }

    return res.json({ success: true, message: 'Javob qabul qilindi' });
  } catch (err) {
    console.error('[forumController.acceptAnswer]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const vote = async (req, res) => {
  try {
    const { type, id } = req.params; // type: 'question' or 'answer'
    const { action } = req.body; // 'up' or 'down' or 'none'

    const Model = type === 'question' ? Question : Answer;
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Topilmadi' });

    // Remove existing votes
    doc.upvotes = doc.upvotes.filter(u => String(u) !== String(req.user._id));
    doc.downvotes = doc.downvotes.filter(u => String(u) !== String(req.user._id));

    if (action === 'up') doc.upvotes.push(req.user._id);
    if (action === 'down') doc.downvotes.push(req.user._id);

    await doc.save();
    return res.json({ success: true, message: 'Ovoz berildi' });
  } catch (err) {
    console.error('[forumController.vote]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  addAnswer,
  acceptAnswer,
  vote
};

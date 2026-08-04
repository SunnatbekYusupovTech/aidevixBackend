const Question = require('../models/Question');
const Answer = require('../models/Answer');
const UserStats = require('../models/UserStats');
const User = require('../models/User');
const calculateRank = require('../utils/calculateRank');

const awardForumXP = async (userId, amount) => {
  try {
    const stats = await UserStats.findOneAndUpdate(
      { userId },
      { $inc: { xp: amount, weeklyXp: amount } },
      { new: true, upsert: true }
    );
    await User.findByIdAndUpdate(userId, { 
      $inc: { xp: amount }, 
      $set: { rankTitle: calculateRank(stats.xp) } 
    });
  } catch (e) {}
};

const getQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 15, sort = 'newest', tag } = req.query;
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
      .limit(Number(limit))
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

    // Increment views
    await Question.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    const answers = await Answer.find({ questionId: req.params.id })
      .populate('author', 'username avatar rankTitle aiStack')
      .sort({ isAccepted: -1, createdAt: 1 })
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
    
    const question = await Question.create({
      title,
      body,
      tags: tags || [],
      author: req.user._id,
    });

    // Reward for asking (5 XP)
    await awardForumXP(req.user._id, 5);

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

    const answer = await Answer.create({
      body,
      questionId: id,
      author: req.user._id,
    });

    // Reward for answering (10 XP)
    await awardForumXP(req.user._id, 10);

    return res.status(201).json({ success: true, data: answer });
  } catch (err) {
    console.error('[forumController.addAnswer]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const acceptAnswer = async (req, res) => {
  try {
    const { qId, aId } = req.params;
    const question = await Question.findById(qId);
    
    if (!question) return res.status(404).json({ success: false, message: 'Savol topilmadi' });
    if (String(question.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Faqat savol egasi javobni qabul qila oladi' });
    }

    question.acceptedAnswer = aId;
    question.isResolved = true;
    await question.save();

    const answer = await Answer.findById(aId);
    if (answer) {
      answer.isAccepted = true;
      await answer.save();
      // Massive reward for accepted answer (50 XP)
      await awardForumXP(answer.author, 50);
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

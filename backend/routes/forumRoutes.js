const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { 
  getQuestions, getQuestionById, createQuestion, addAnswer, acceptAnswer, vote 
} = require('../controllers/forumController');

router.get('/questions', getQuestions);
router.get('/questions/:id', validateObjectId('id'), getQuestionById);

router.post('/questions', authenticate, createQuestion);
router.post('/questions/:id/answers', authenticate, validateObjectId('id'), addAnswer);
router.put('/questions/:qId/answers/:aId/accept', authenticate, validateObjectId('qId'), validateObjectId('aId'), acceptAnswer);
router.post('/:type/:id/vote', authenticate, validateObjectId('id'), vote);

module.exports = router;

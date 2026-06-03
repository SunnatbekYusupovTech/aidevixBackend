const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/promptController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const requireTelegramForPromptsRead = require('../middleware/requireTelegramForPrompts');

router.get('/', authenticate, requireTelegramForPromptsRead, getPrompts);
router.get('/featured', authenticate, requireTelegramForPromptsRead, getFeaturedPrompts);
router.get('/saved/me', authenticate, getSavedPrompts);
router.get('/saved/ids', authenticate, getSavedPromptIds);
router.post('/:id/save', authenticate, validateObjectId('id'), savePrompt);
router.delete('/:id/save', authenticate, validateObjectId('id'), unsavePrompt);
router.get('/:id', authenticate, validateObjectId('id'), requireTelegramForPromptsRead, getPrompt);
router.post('/:id/view', authenticate, validateObjectId('id'), requireTelegramForPromptsRead, viewPrompt);
router.post('/',          authenticate, createPrompt);
router.post('/:id/like',  authenticate, validateObjectId('id'), likePrompt);
router.delete('/:id',     authenticate, validateObjectId('id'), deletePrompt);
router.patch('/:id/feature', authenticate, requireAdmin, validateObjectId('id'), featurePrompt);

module.exports = router;

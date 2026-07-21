const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  description: {
    type: String,
    maxlength: 300,
    default: '',
  },
  category: {
    type: String,
    enum: ['coding', 'debugging', 'vibe_coding', 'claude', 'cursor', 'copilot', 'architecture', 'refactoring', 'testing', 'documentation', 'system', 'other'],
    default: 'other',
  },
  tool: {
    type: String,
    enum: ['Claude Code', 'Cursor', 'GitHub Copilot', 'ChatGPT', 'Gemini', 'Windsurf', 'Any'],
    default: 'Any',
  },
  tags: [{ type: String, maxlength: 30 }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

promptSchema.index({ category: 1, createdAt: -1 });
promptSchema.index({ likesCount: -1 });
promptSchema.index({ tool: 1 });
promptSchema.index({ isFeatured: 1 });
promptSchema.index({ author: 1, isPublic: 1, likesCount: -1 });

module.exports = mongoose.model('Prompt', promptSchema);

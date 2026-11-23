const mongoose = require('mongoose');

const ACTIONS = [
  'unlock_ok', 'unlock_fail', 'unlock_locked', 'lock',
  'view_outline', 'view_lesson', 'view_page',
  'client_devtools', 'client_copy', 'client_print', 'client_screenshot_key', 'client_contextmenu',
  'admin_change', 'access_granted', 'access_updated', 'access_revoked',
];

// Kim, qachon, nimani ko'rdi — sizib chiqqan taqdirda manbani aniqlash uchun.
const metodikaAuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: ACTIONS, required: true },
  target: { type: String, maxlength: 200, default: '' },
  ip: { type: String, maxlength: 64, default: null },
  ua: { type: String, maxlength: 200, default: null },
  createdAt: { type: Date, default: Date.now },
});

metodikaAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
metodikaAuditLogSchema.index({ user: 1, createdAt: -1 });

const MetodikaAuditLog = mongoose.model('MetodikaAuditLog', metodikaAuditLogSchema);
MetodikaAuditLog.ACTIONS = ACTIONS;

module.exports = MetodikaAuditLog;

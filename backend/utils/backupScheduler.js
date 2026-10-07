const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { runWithLock } = require('./schedulerLock');

/**
 * MongoDB bazasidan har 24 soatda avtomatik nusxa (backup) oladi
 * Railway kabi serverlarda /tmp fayl tizimi reset bo'ladi,
 * shuning uchun asosan S3 ga yoki boshqa joyga yuborish tavsiya qilinadi,
 * lekin bu eng oddiy lokal backup varianti.
 *
 * P-B16: faqat BACKUP_SCHEDULER_ENABLED=true bo'lsa ishlaydi (default o'chiq —
 * Atlas backup'lari asosiy manba). URI: MONGODB_URI (ilova bilan bir xil), fallback MONGO_URI.
 */
const startBackupScheduler = () => {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.BACKUP_SCHEDULER_ENABLED !== 'true') {
    console.log('[Backup] O\'chirilgan (BACKUP_SCHEDULER_ENABLED!=true).');
    return;
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const runBackup = () => new Promise((resolve) => {
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!dbUri) {
      console.warn('[Backup] MONGODB_URI yo\'q — backup o\'tkazib yuborildi');
      return resolve();
    }

    const backupFile = path.join(backupDir, `backup-${dateStr}.archive`);

    // mongodump orqali arxiv nusxa olish (execFile — shell'siz, URI argument sifatida)
    execFile('mongodump', [`--uri=${dbUri}`, `--archive=${backupFile}`, '--gzip'], (error) => {
      if (error) {
        // error.message buyruq qatorini (URI bilan) o'z ichiga olishi mumkin — faqat kod log qilinadi
        console.error('❌ Database Backup Xatosi: exit code', error.code);
        return resolve();
      }
      console.log(`✅ MongoDB Backup muvaffaqiyatli saqlandi: ${backupFile}`);

      // 7 kundan eski backuplarni o'chirib tashlash (async — event loop bloklanmaydi)
      fs.promises.readdir(backupDir)
        .then((files) => Promise.all(files.map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stat = await fs.promises.stat(filePath);
          if (Date.now() > stat.ctime.getTime() + 7 * 24 * 60 * 60 * 1000) {
            await fs.promises.unlink(filePath);
          }
        })))
        .catch(() => {})
        .finally(resolve);
    });
  });

  // Har kunlik interval (24 soat); lock — bir nechta instance bo'lsa bitta backup
  setInterval(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    runWithLock(`dbBackup:${dateStr}`, 20 * 60 * 60 * 1000, runBackup)
      .catch((e) => console.error('[Backup] xato:', e.message));
  }, 24 * 60 * 60 * 1000); // Har 24 soat

  console.log('🕒 MongoDB Backup Scheduler ishga tushdi (24h interval).');
};

module.exports = { startBackupScheduler };

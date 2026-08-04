const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * MongoDB bazasidan har 24 soatda avtomatik nusxa (backup) oladi
 * Railway kabi serverlarda /tmp fayl tizimi reset bo'ladi,
 * shuning uchun asosan S3 ga yoki boshqa joyga yuborish tavsiya qilinadi,
 * lekin bu eng oddiy lokal backup varianti.
 */
const startBackupScheduler = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Har kunlik interval (24 soat)
  setInterval(() => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dbUri = process.env.MONGO_URI;
    
    if (!dbUri) return;

    const backupFile = path.join(backupDir, `backup-${dateStr}.archive`);
    
    // mongodump orqali arxiy nusxa olish
    const cmd = `mongodump --uri="${dbUri}" --archive="${backupFile}" --gzip`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Database Backup Xatosi:', error.message);
        return;
      }
      console.log(`✅ MongoDB Backup muvaffaqiyatli saqlandi: ${backupFile}`);
      
      // Ixtiyoriy: 7 kundan eski backuplarni o'chirib tashlash (joyni to'ldirmaslik uchun)
      fs.readdir(backupDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
          const filePath = path.join(backupDir, file);
          const stat = fs.statSync(filePath);
          const now = new Date().getTime();
          const endTime = new Date(stat.ctime).getTime() + 7 * 24 * 60 * 60 * 1000;
          if (now > endTime) {
            fs.unlinkSync(filePath);
          }
        });
      });
    });
  }, 24 * 60 * 60 * 1000); // Har 24 soat
  
  console.log('🕒 MongoDB Backup Scheduler ishga tushdi (24h interval).');
};

module.exports = { startBackupScheduler };

const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');

// Node 18+ defaults dns.lookup to "verbatim" (returns AAAA first when present).
// Railway containers expose AAAA records but have no IPv6 outbound route, so
// nodemailer's own `family: 4` is too late — it tries the IPv6 socket first and
// dies with ENETUNREACH. Force IPv4 globally for this process.
try { dns.setDefaultResultOrder('ipv4first'); } catch (_) {}

// Belt & suspenders: provide an explicit dns.lookup that only ever yields IPv4.
// Some socket paths inside nodemailer construct net.connect with options that
// ignore the transport-level `family` field, so we hand them a lookup that
// can't return an AAAA record in the first place.
const ipv4Lookup = (hostname, opts, cb) => {
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  return dns.lookup(hostname, { ...opts, family: 4 }, cb);
};

// Belt & suspenders #2: also turn off happy-eyeballs on the transport itself
// in case the global net.setDefaultAutoSelectFamily fails on older Node versions.
try { require('net').setDefaultAutoSelectFamily(false); } catch (_) {}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587, // Number() is safer than parseInt() here
  secure: (Number(process.env.EMAIL_PORT) === 465),
  // Railway containers lack IPv6 outbound; force IPv4 lookup to avoid ENETUNREACH on AAAA records.
  family: 4,
  tls: { family: 4 },
  // Disable happy-eyeballs at the socket level — net.connect would otherwise
  // race A and AAAA in parallel regardless of dns.setDefaultResultOrder.
  autoSelectFamily: false,
  // Custom DNS lookup — guarantees IPv4 even if internal options drop `family`.
  lookup: ipv4Lookup,
  // Fail-fast timeouts — without these, a stalled SMTP socket hangs the fire-and-forget
  // .catch() forever (promise never settles), so we never see why delivery is failing.
  connectionTimeout: 10_000,
  greetingTimeout: 5_000,
  socketTimeout: 15_000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Startup-time SMTP credential & connectivity check. Logs once at boot so Railway
// surfaces EMAIL_USER/EMAIL_PASS misconfig or outbound-port blocks immediately,
// instead of silently failing inside fire-and-forget sendMail calls.
async function verifyTransport() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  if (!user || !process.env.EMAIL_PASS) {
    console.error(`[email] ❌ SMTP creds missing — EMAIL_USER=${user ? 'set' : 'MISSING'} EMAIL_PASS=${process.env.EMAIL_PASS ? 'set' : 'MISSING'}`);
    return false;
  }
  try {
    await transporter.verify();
    console.log(`[email] ✅ SMTP ready — ${host}:${port} as ${user}`);
    return true;
  } catch (err) {
    console.error(`[email] ❌ SMTP verify failed — ${host}:${port} as ${user}: ${err.code || ''} ${err.message}`);
    return false;
  }
}

const FROM = `"Aidevix" <${process.env.EMAIL_USER || 'noreply@aidevix.uz'}>`;

const sendWelcomeEmail = async (email, username) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Aidevix ga xush kelibsiz! 🎉',
    html: `
      <h2>Salom, ${username}!</h2>
      <p>Aidevix platformasiga xush kelibsiz! Endi kurslarni ko'rishingiz mumkin.</p>
      <p>Boshlash uchun: <a href="${process.env.FRONTEND_URL}/courses">Kurslarni ko'rish</a></p>
    `,
  });
};

const sendLevelUpEmail = async (email, username, level, rankTitle) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Tabriklaymiz! Siz ${level}-darajaga yetdingiz! 🏆`,
    html: `
      <h2>Tabriklaymiz, ${username}!</h2>
      <p>Siz <strong>${level}-darajaga</strong> yetdingiz!</p>
      <p>Yangi unvoningiz: <strong>${rankTitle}</strong></p>
      <p>Davom eting: <a href="${process.env.FRONTEND_URL}/leaderboard">Leaderboard</a></p>
    `,
  });
};

const sendCertificateEmail = async (email, username, courseName, certificateCode) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Sertifikat: ${courseName} ✅`,
    html: `
      <h2>Tabriklaymiz, ${username}!</h2>
      <p>Siz <strong>${courseName}</strong> kursini muvaffaqiyatli tugatdingiz!</p>
      <p>Sertifikat kodi: <strong>${certificateCode}</strong></p>
      <p>Sertifikatni ko'rish: <a href="${process.env.FRONTEND_URL}/certificates/${certificateCode}">Bu yerda</a></p>
    `,
  });
};

const sendEnrollmentEmail = async (email, username, courseName) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `${courseName} kursiga yozildingiz! 📚`,
    html: `
      <h2>Salom, ${username}!</h2>
      <p>Siz <strong>${courseName}</strong> kursiga muvaffaqiyatli yozildingiz!</p>
      <p>O'qishni boshlash: <a href="${process.env.FRONTEND_URL}/courses">Kursga o'tish</a></p>
    `,
  });
};

async function sendEmailWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

const sendStreakReminderEmail = async (email, username, streak) => {
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#f97316;padding:32px;text-align:center">
      <div style="font-size:48px">🔥</div>
      <h1 style="color:#fff;margin:8px 0">Streak xavf ostida!</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#475569;font-size:16px">Salom, <strong>${username}</strong>!</p>
      <p style="color:#475569">Sizning <strong style="color:#f97316">${streak} kunlik</strong> streak'ingiz xavf ostida. Bugun faol bo'lmasangiz, streak tugaydi!</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${process.env.FRONTEND_URL || 'https://aidevix.vercel.app'}" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px">Platformaga kiring</a>
      </div>
    </div>
  </div>
</body>
</html>`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `🔥 ${streak} kunlik streak'ingizni saqlab qoling!`,
    html,
  }).catch(() => {});
};

const sendQuizResultEmail = async (email, username, quizTitle, score, passed) => {
  const color = passed ? '#22c55e' : '#ef4444';
  const icon = passed ? '🎉' : '💪';
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:${color};padding:32px;text-align:center">
      <div style="font-size:48px">${icon}</div>
      <h1 style="color:#fff;margin:8px 0">${passed ? 'Tabriklaymiz!' : 'Qayta urinib ko\'ring!'}</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#475569">Salom, <strong>${username}</strong>!</p>
      <p style="color:#475569">"<strong>${quizTitle}</strong>" kvizini yakunladingiz.</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <div style="font-size:48px;font-weight:bold;color:${color}">${score}%</div>
        <div style="color:#64748b">${passed ? 'O\'tdingiz!' : 'Minimum 70% kerak'}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `${icon} Kviz natijasi: ${score}% — ${quizTitle}`,
    html,
  }).catch(() => {});
};

const sendResetCodeEmail = async (email, username, code) => {
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.05)">
    <div style="background:#6366f1;padding:40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">Parolni tiklash</h1>
    </div>
    <div style="padding:40px">
      <p style="color:#475569;font-size:16px">Salom, <strong>${username}</strong>!</p>
      <p style="color:#475569;font-size:16px">Hisobingiz parolini tiklash uchun quyidagi maxfiylik kodidan foydalaning:</p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:32px 0">
        <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#4f46e5">${code}</div>
        <p style="color:#64748b;font-size:13px;margin-top:12px">Kod 10 daqiqa davomida amal qiladi</p>
      </div>
      <p style="color:#64748b;font-size:14px">Agar bu so'rovni siz yubormagan bo'lsangiz, ushbu xabarga e'tibor bermang.</p>
    </div>
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:12px;margin:0">© 2024 Aidevix Learning Platform</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `🔐 Parolni tiklash kodi: ${code}`,
    html,
  });
};

const sendEmailVerificationCode = async (email, username, code) => {
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.05)">
    <div style="background:#6366f1;padding:40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">Email manzilini tasdiqlang</h1>
    </div>
    <div style="padding:40px">
      <p style="color:#475569;font-size:16px">Salom, <strong>${username}</strong>!</p>
      <p style="color:#475569;font-size:16px">Aidevix hisobingizni aktivlashtirish uchun quyidagi kodni kiriting:</p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:32px 0">
        <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#4f46e5">${code}</div>
        <p style="color:#64748b;font-size:13px;margin-top:12px">Kod 15 daqiqa davomida amal qiladi</p>
      </div>
      <p style="color:#64748b;font-size:14px">Agar bu so'rovni siz yubormagan bo'lsangiz, ushbu xabarga e'tibor bermang.</p>
    </div>
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:12px;margin:0">© 2024 Aidevix Learning Platform</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmailWithRetry(async () => {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `✅ Email tasdiqlash kodi: ${code} — Aidevix`,
      html,
    });
  });
};

const sendNewDeviceLoginEmail = async (email, username, { ip, ua, when }) => {
  const safeUa = String(ua || 'unknown').slice(0, 200).replace(/[<>]/g, '');
  const safeIp = String(ip || 'unknown').replace(/[<>]/g, '');
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#dc2626;padding:32px;text-align:center">
      <div style="font-size:48px">🛡️</div>
      <h1 style="color:#fff;margin:8px 0">Yangi qurilmadan kirish</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#475569;font-size:16px">Salom, <strong>${username}</strong>!</p>
      <p style="color:#475569">Hisobingizga yangi qurilmadan kirilgan:</p>
      <table style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border-collapse:collapse">
        <tr><td style="padding:6px 12px;color:#64748b">Vaqt:</td><td style="padding:6px 12px;color:#0f172a"><strong>${when}</strong></td></tr>
        <tr><td style="padding:6px 12px;color:#64748b">IP:</td><td style="padding:6px 12px;color:#0f172a">${safeIp}</td></tr>
        <tr><td style="padding:6px 12px;color:#64748b">Brauzer / qurilma:</td><td style="padding:6px 12px;color:#0f172a">${safeUa}</td></tr>
      </table>
      <p style="color:#475569">Bu siz bo'lsangiz — e'tibor bermang. Bo'lmasa, <strong style="color:#dc2626">darhol parolingizni o'zgartiring</strong> va aktiv sessiyalarni tekshiring.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${process.env.FRONTEND_URL || 'https://aidevix.uz'}/profile/security" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none">Sessiyalarni boshqarish</a>
      </div>
    </div>
  </div>
</body>
</html>`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: '🛡️ Yangi qurilmadan Aidevix hisobiga kirish',
    html,
  }).catch(() => {});
};

const sendAccountDeletedEmail = async (email, username) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Aidevix hisob o\'chirildi',
    html: `
      <h2>Salom, ${username}!</h2>
      <p>Sizning Aidevix hisobingiz GDPR talabi asosida o'chirildi va anonimlashtirildi.</p>
      <p>Agar bu xato bo'lsa yoki yordam kerak bo'lsa, support@aidevix.uz ga murojaat qiling.</p>
    `,
  }).catch(() => {});
};

/**
 * Haftalik xulosa — yakshanba ertalab yuboriladi.
 * @param {string} email
 * @param {object} digest { username, weeklyXp, totalXp, rank, streak, newBadges, nextCourse }
 */
const sendWeeklyDigestEmail = async (email, digest) => {
  const {
    username,
    weeklyXp = 0,
    totalXp = 0,
    rank,
    streak = 0,
    newBadges = [],
    nextCourse = null,
  } = digest;

  const FE = process.env.FRONTEND_URL || 'https://aidevix.uz';

  const badgesHtml = newBadges.length
    ? `<p style="margin:18px 0 6px 0;"><strong>🏅 Bu hafta olingan badgelar:</strong></p>
       <ul style="padding-left:20px;">${newBadges.slice(0, 5).map((b) => `<li>${b.icon || '🏆'} ${b.name}</li>`).join('')}</ul>`
    : '';

  const nextHtml = nextCourse
    ? `<div style="margin:18px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6366f1;">Davom ettiring</div>
        <div style="font-size:16px;font-weight:700;margin:6px 0 8px 0;">${nextCourse.title}</div>
        <a href="${FE}/courses/${nextCourse._id}" style="display:inline-block;padding:8px 14px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Kursga o'tish →</a>
       </div>`
    : '';

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `📊 Aidevix — Haftalik xulosa (${weeklyXp.toLocaleString()} XP)`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
        <h1 style="font-size:22px;margin:0 0 6px 0;">Salom, ${username}! 👋</h1>
        <p style="color:#475569;margin:0 0 18px 0;">Bu haftangizning qisqacha xulosasi:</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
          <div style="padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Bu hafta XP</div>
            <div style="font-size:22px;font-weight:800;color:#6366f1;">${weeklyXp.toLocaleString()}</div>
          </div>
          <div style="padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Streak 🔥</div>
            <div style="font-size:22px;font-weight:800;color:#f97316;">${streak} kun</div>
          </div>
          <div style="padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Jami XP</div>
            <div style="font-size:22px;font-weight:800;">${totalXp.toLocaleString()}</div>
          </div>
          <div style="padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Ranking</div>
            <div style="font-size:22px;font-weight:800;color:#06b6d4;">#${rank || '—'}</div>
          </div>
        </div>

        ${badgesHtml}
        ${nextHtml}

        <p style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
          Streak buzilmasligi uchun bugun ham kirib oling. <a href="${FE}/profile" style="color:#6366f1;">Profil →</a><br/>
          <span style="font-size:11px;color:#94a3b8;">Bu xabardan obunani bekor qilish: <a href="${FE}/settings" style="color:#94a3b8;">Sozlamalar</a></span>
        </p>
      </div>
    `,
  }).catch((err) => console.error('[Digest] email failed:', err.message));
};

module.exports = {
  sendWelcomeEmail,
  sendEmailVerificationCode,
  sendLevelUpEmail,
  sendCertificateEmail,
  sendEnrollmentEmail,
  sendEmailWithRetry,
  sendStreakReminderEmail,
  sendQuizResultEmail,
  sendResetCodeEmail,
  sendNewDeviceLoginEmail,
  sendAccountDeletedEmail,
  sendWeeklyDigestEmail,
  verifyTransport,
};

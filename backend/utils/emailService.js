// HTTPS-based email transport (Resend). Replaces nodemailer/SMTP because Railway
// blocks outbound TCP on SMTP ports (25/465/587). Resend sends via HTTPS API
// over port 443 which is always reachable.
//
// Env vars:
//   RESEND_API_KEY   — required, from https://resend.com/api-keys
//   EMAIL_FROM       — optional, e.g. 'Aidevix <noreply@aidevix.uz>'.
//                      Defaults to onboarding@resend.dev (works without domain
//                      verification but only delivers to the Resend account owner).
const { Resend } = require('resend');

const FROM = process.env.EMAIL_FROM || 'Aidevix <onboarding@resend.dev>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FE = process.env.FRONTEND_URL || 'https://aidevix.uz';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.error('[email] ❌ RESEND_API_KEY not set — email sending is disabled');
}

async function sendMail({ from, to, subject, html }) {
  if (!resend) throw new Error('Resend not configured (RESEND_API_KEY missing)');
  const { data, error } = await resend.emails.send({
    from: from || FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });
  if (error) {
    const err = new Error(error.message || 'Resend send failed');
    err.code = error.name || error.statusCode || 'RESEND_ERROR';
    err.details = error;
    throw err;
  }
  return {
    messageId: data && data.id,
    accepted: [to],
    rejected: [],
    response: `Resend id=${data && data.id}`,
  };
}

async function verifyTransport() {
  if (!RESEND_API_KEY) {
    console.error('[email] ❌ RESEND_API_KEY missing — set it in Railway env');
    return false;
  }
  console.log(`[email] using FROM="${FROM}"`);
  try {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (res.status === 401) {
      const body = await res.text().catch(() => '');
      if (body.includes('restricted_api_key')) {
        console.log('[email] ✅ Resend ready — (restricted-scope key, sending only)');
        return true;
      }
      console.error(`[email] ❌ Resend auth failed — HTTP 401 ${body.slice(0, 200)}`);
      return false;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] ❌ Resend probe failed — HTTP ${res.status} ${body.slice(0, 200)}`);
      return false;
    }
    console.log(`[email] ✅ Resend ready — from=${FROM}`);
    return true;
  } catch (err) {
    console.error(`[email] ❌ Resend probe error: ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand layout — premium, responsive, dark-mode aware. Every Aidevix email is
// composed via renderLayout() so the wordmark / colors / footer stay consistent.
// ─────────────────────────────────────────────────────────────────────────────

const BRAND = {
  primary: '#6366f1',
  accent: '#a855f7',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  surface: '#ffffff',
  surfaceSoft: '#f1f5f9',
  pageBg: '#f4f6fb',
};

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLayout({
  preheader = '',
  title = 'Aidevix',
  accent = `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
  bodyHtml = '',
}) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(title)}</title>
<style>
  a { color: ${BRAND.primary}; }
  @media only screen and (max-width: 600px) {
    .px-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .py-pad { padding-top: 30px !important; padding-bottom: 30px !important; }
    .code-xl { font-size: 30px !important; letter-spacing: 9px !important; padding: 18px 18px !important; }
    .h1 { font-size: 22px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .body-bg { background: #07091a !important; }
    .card { background: #0f1430 !important; border-color: #1d2350 !important; }
    .text-primary { color: #f1f5f9 !important; }
    .text-secondary { color: #cbd5e1 !important; }
    .text-muted { color: #94a3b8 !important; }
    .divider { border-color: #1d2350 !important; }
    .code-box { background: #1a2046 !important; border-color: #2a3273 !important; }
    .chip { background: #1a2046 !important; border-color: #2a3273 !important; color: #cbd5e1 !important; }
    .footer-link { color: #94a3b8 !important; }
  }
</style>
</head>
<body class="body-bg" style="margin:0;padding:0;background:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;color:${BRAND.textPrimary};line-height:1.55;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:transparent;line-height:1px;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="body-bg" style="background:${BRAND.pageBg};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

      <tr><td align="center" style="padding-bottom:24px;">
        <a href="${FE}" style="text-decoration:none;display:inline-block;">
          <span style="display:inline-block;padding:8px 16px;border-radius:999px;background:${accent};color:#ffffff;font-size:13px;font-weight:800;letter-spacing:2.5px;">AIDEVIX</span>
        </a>
      </td></tr>

      <tr><td class="card" style="background:${BRAND.surface};border-radius:20px;border:1px solid ${BRAND.border};overflow:hidden;box-shadow:0 12px 36px rgba(99,102,241,0.08);">
        <div style="height:4px;background:${accent};line-height:0;font-size:0;">&nbsp;</div>
        <div class="px-pad py-pad" style="padding:40px 36px;">
          ${bodyHtml}
        </div>
      </td></tr>

      <tr><td align="center" style="padding:28px 12px 0 12px;">
        <p style="margin:0 0 8px 0;color:${BRAND.textSecondary};font-size:13px;font-weight:600;" class="text-secondary">AI bilan kelajakni o'rganing</p>
        <p style="margin:0 0 14px 0;font-size:12px;" class="text-muted">
          <a href="${FE}" class="footer-link" style="color:${BRAND.textMuted};text-decoration:none;margin:0 8px;">aidevix.uz</a>
          <span style="color:${BRAND.textMuted};">·</span>
          <a href="https://t.me/aidevix" class="footer-link" style="color:${BRAND.textMuted};text-decoration:none;margin:0 8px;">Telegram</a>
          <span style="color:${BRAND.textMuted};">·</span>
          <a href="https://instagram.com/aidevix" class="footer-link" style="color:${BRAND.textMuted};text-decoration:none;margin:0 8px;">Instagram</a>
        </p>
        <p style="margin:0;color:${BRAND.textMuted};font-size:11px;" class="text-muted">© ${year} Aidevix Learning Platform. Barcha huquqlar himoyalangan.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function button(href, label, gradient = `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${gradient};border-radius:12px;">
    <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.2px;">${label}</a>
  </td></tr></table>`;
}

function greeting(username) {
  return `<p style="margin:0 0 8px 0;color:${BRAND.textSecondary};font-size:15px;text-align:center;" class="text-secondary">Salom, <strong style="color:${BRAND.textPrimary};" class="text-primary">${escapeHtml(username)}</strong> 👋</p>`;
}

function h1(text) {
  return `<h1 class="h1 text-primary" style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:${BRAND.textPrimary};text-align:center;letter-spacing:-0.3px;">${escapeHtml(text)}</h1>`;
}

function lede(text) {
  return `<p style="margin:0 0 28px 0;color:${BRAND.textSecondary};font-size:15px;text-align:center;line-height:1.6;" class="text-secondary">${text}</p>`;
}

function divider() {
  return `<hr class="divider" style="border:none;border-top:1px solid ${BRAND.border};margin:32px 0;" />`;
}

function securityNote(text) {
  return `<p style="margin:0;color:${BRAND.textMuted};font-size:12px;line-height:1.7;text-align:center;" class="text-muted">🛡️ <strong style="color:${BRAND.textSecondary};" class="text-secondary">Xavfsizlik:</strong> ${text}</p>`;
}

function codeBox(code) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;"><tr><td align="center">
    <div class="code-box code-xl" style="display:inline-block;background:${BRAND.surfaceSoft};border:1px solid ${BRAND.border};border-radius:16px;padding:22px 36px;font-family:'SF Mono',Monaco,Menlo,'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:14px;color:${BRAND.primary};text-align:center;min-width:240px;">${escapeHtml(code)}</div>
  </td></tr></table>`;
}

function statCard(label, value, color = BRAND.primary) {
  return `<td class="card text-primary" style="padding:14px;border:1px solid ${BRAND.border};border-radius:12px;background:${BRAND.surface};text-align:center;width:50%;">
    <div class="text-muted" style="font-size:11px;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">${escapeHtml(label)}</div>
    <div style="font-size:24px;font-weight:800;color:${color};margin-top:4px;">${value}</div>
  </td>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email senders
// ─────────────────────────────────────────────────────────────────────────────

const sendWelcomeEmail = async (email, username) => {
  const html = renderLayout({
    preheader: 'Aidevix oilasiga xush kelibsiz! AI ta\'limini boshlang.',
    title: 'Aidevix ga xush kelibsiz',
    bodyHtml: `
      <div style="text-align:center;font-size:48px;margin:0 0 12px 0;">🎉</div>
      ${h1('Xush kelibsiz!')}
      ${greeting(username)}
      ${lede(`Aidevix oilasiga qo'shilganingiz uchun rahmat. Endi siz Claude, Cursor, GitHub Copilot va boshqa AI tool'lardan professional foydalanishni o'rganasiz.`)}
      <div style="text-align:center;margin:24px 0;">${button(`${FE}/courses`, 'Kurslarni ko\'rish →')}</div>
      ${divider()}
      <p style="margin:0;color:${BRAND.textMuted};font-size:13px;text-align:center;line-height:1.7;" class="text-muted">Yordamga muhtoj bo'lsangiz — <a href="${FE}/help" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">yordam markazi</a> har doim ochiq.</p>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: 'Aidevix ga xush kelibsiz! 🎉', html });
};

const sendEmailVerificationCode = async (email, username, code) => {
  const html = renderLayout({
    preheader: `Tasdiqlash kodingiz: ${code}. 15 daqiqada amal qiladi.`,
    title: 'Email tasdiqlash kodi',
    bodyHtml: `
      ${h1('Email manzilini tasdiqlang')}
      ${greeting(username)}
      ${lede(`Aidevix hisobingizni faollashtirish uchun quyidagi tasdiqlash kodini saytga kiriting.`)}
      ${codeBox(code)}
      <p style="margin:24px 0 0 0;color:${BRAND.textMuted};font-size:13px;text-align:center;" class="text-muted">Kod <strong style="color:${BRAND.textSecondary};" class="text-secondary">15 daqiqa</strong> davomida amal qiladi.</p>
      ${divider()}
      ${securityNote(`Agar bu so'rovni siz yubormagan bo'lsangiz, ushbu xabarga e'tibor bermang. Aidevix jamoasi hech qachon sizdan ushbu kodni so'ramaydi.`)}
    `,
  });

  const maskedTo = email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  try {
    await sendEmailWithRetry(async () => {
      const info = await sendMail({
        from: FROM,
        to: email,
        subject: `Tasdiqlash kodi: ${code} — Aidevix`,
        html,
      });
      console.log(`[email] ✅ verification sent to ${maskedTo} id=${info.messageId}`);
    });
  } catch (err) {
    console.error(`[email] ❌ verification send failed to ${maskedTo}: ${err.code || ''} ${err.message}`);
    throw err;
  }
};

const sendResetCodeEmail = async (email, username, code) => {
  const html = renderLayout({
    preheader: `Parolni tiklash kodi: ${code}. 10 daqiqa amal qiladi.`,
    title: 'Parolni tiklash kodi',
    accent: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
    bodyHtml: `
      ${h1('Parolni tiklash')}
      ${greeting(username)}
      ${lede(`Hisobingiz parolini tiklash uchun quyidagi maxfiy kodni kiriting.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;"><tr><td align="center">
        <div class="code-box code-xl" style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:22px 36px;font-family:'SF Mono',Monaco,Menlo,'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:14px;color:#ea580c;text-align:center;min-width:240px;">${escapeHtml(code)}</div>
      </td></tr></table>
      <p style="margin:24px 0 0 0;color:${BRAND.textMuted};font-size:13px;text-align:center;" class="text-muted">Kod <strong style="color:${BRAND.textSecondary};" class="text-secondary">10 daqiqa</strong> davomida amal qiladi.</p>
      ${divider()}
      ${securityNote(`Parolni siz tiklamayotgan bo'lsangiz, e'tibor bermang. Hisobingiz xavfsiz qolaveradi.`)}
    `,
  });
  await sendMail({ from: FROM, to: email, subject: `Parolni tiklash kodi: ${code} — Aidevix`, html });
};

const sendLevelUpEmail = async (email, username, level, rankTitle) => {
  const html = renderLayout({
    preheader: `Tabriklaymiz! Siz ${level}-darajaga yetdingiz.`,
    title: `Daraja: ${level}`,
    accent: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    bodyHtml: `
      <div style="text-align:center;font-size:56px;margin:0 0 8px 0;">🏆</div>
      ${h1(`${level}-daraja olindi!`)}
      ${greeting(username)}
      ${lede(`Tabriklaymiz! Aidevix darajalar tizimida yangi yutuq — qattiq mehnatingiz natijasi.`)}
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);color:#fff;font-size:18px;font-weight:700;letter-spacing:0.5px;">${escapeHtml(rankTitle)}</div>
      </div>
      <div style="text-align:center;margin:28px 0 8px 0;">${button(`${FE}/leaderboard`, 'Leaderboard\'ni ko\'rish →')}</div>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: `🏆 ${level}-darajaga yetdingiz! — Aidevix`, html });
};

const sendCertificateEmail = async (email, username, courseName, certificateCode) => {
  const html = renderLayout({
    preheader: `${courseName} sertifikati tayyor.`,
    title: 'Sertifikat',
    accent: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    bodyHtml: `
      <div style="text-align:center;font-size:56px;margin:0 0 8px 0;">🎓</div>
      ${h1('Sertifikat tayyor!')}
      ${greeting(username)}
      ${lede(`<strong style="color:${BRAND.textPrimary};">${escapeHtml(courseName)}</strong> kursini muvaffaqiyatli tugatdingiz. Bu — sizning ish portfolioingizga arzigulik yutuq.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;"><tr><td align="center">
        <div class="chip" style="display:inline-block;background:${BRAND.surfaceSoft};border:1px solid ${BRAND.border};border-radius:12px;padding:14px 22px;font-family:'SF Mono',Monaco,Menlo,'Courier New',monospace;font-size:16px;font-weight:700;color:${BRAND.textPrimary};letter-spacing:2px;">${escapeHtml(certificateCode)}</div>
      </td></tr></table>
      <div style="text-align:center;margin:24px 0;">${button(`${FE}/certificates/${certificateCode}`, 'Sertifikatni ko\'rish →', 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)')}</div>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: `🎓 Sertifikat: ${courseName} — Aidevix`, html });
};

const sendEnrollmentEmail = async (email, username, courseName) => {
  const html = renderLayout({
    preheader: `${courseName} kursiga yozildingiz. O'qishni boshlang!`,
    title: 'Kursga yozildingiz',
    bodyHtml: `
      <div style="text-align:center;font-size:48px;margin:0 0 8px 0;">📚</div>
      ${h1('Kursga yozildingiz!')}
      ${greeting(username)}
      ${lede(`<strong style="color:${BRAND.textPrimary};">${escapeHtml(courseName)}</strong> kursiga muvaffaqiyatli yozildingiz. Endi vaqt o'qishni boshlash!`)}
      <div style="text-align:center;margin:24px 0;">${button(`${FE}/courses`, 'Kursga o\'tish →')}</div>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: `📚 ${courseName} — Kursga yozildingiz`, html });
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
  const html = renderLayout({
    preheader: `${streak} kunlik streak'ingiz xavf ostida. Bugun kiring!`,
    title: 'Streak xavf ostida',
    accent: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
    bodyHtml: `
      <div style="text-align:center;font-size:56px;margin:0 0 8px 0;">🔥</div>
      ${h1('Streak xavf ostida!')}
      ${greeting(username)}
      ${lede(`Sizning <strong style="color:#ea580c;">${streak} kunlik</strong> streak'ingiz tugashga oz qoldi. Bugun kirib, uni saqlab qoling.`)}
      <div style="text-align:center;margin:24px 0;">${button(FE, 'Platformaga kirish →', 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)')}</div>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: `🔥 ${streak} kunlik streak'ingizni saqlang!`, html }).catch((err) => console.error('[email] sendStreakReminderEmail failed:', err.message));
};

const sendQuizResultEmail = async (email, username, quizTitle, score, passed) => {
  const color = passed ? '#22c55e' : '#ef4444';
  const icon = passed ? '🎉' : '💪';
  const headTitle = passed ? 'Tabriklaymiz!' : 'Yana bir bor urinib ko\'ring';
  const html = renderLayout({
    preheader: `"${quizTitle}" kvizi natijasi: ${score}%`,
    title: 'Kviz natijasi',
    accent: passed ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' : 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    bodyHtml: `
      <div style="text-align:center;font-size:56px;margin:0 0 8px 0;">${icon}</div>
      ${h1(headTitle)}
      ${greeting(username)}
      ${lede(`<strong style="color:${BRAND.textPrimary};">${escapeHtml(quizTitle)}</strong> kvizini yakunladingiz.`)}
      <div style="text-align:center;margin:24px 0;">
        <div class="code-box" style="display:inline-block;background:${BRAND.surfaceSoft};border:1px solid ${BRAND.border};border-radius:16px;padding:24px 40px;min-width:180px;">
          <div style="font-size:44px;font-weight:800;color:${color};line-height:1;">${score}%</div>
          <div class="text-muted" style="color:${BRAND.textMuted};font-size:13px;margin-top:6px;font-weight:500;">${passed ? "O'tdingiz" : 'Minimum 70% kerak'}</div>
        </div>
      </div>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: `${icon} Kviz natijasi: ${score}% — ${quizTitle}`, html }).catch((err) => console.error('[email] sendQuizResultEmail failed:', err.message));
};

const sendNewDeviceLoginEmail = async (email, username, { ip, ua, when }) => {
  const safeUa = String(ua || 'unknown').slice(0, 200);
  const safeIp = String(ip || 'unknown');
  const html = renderLayout({
    preheader: `Hisobingizga yangi qurilmadan kirilgan.`,
    title: 'Yangi qurilmadan kirish',
    accent: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
    bodyHtml: `
      <div style="text-align:center;font-size:56px;margin:0 0 8px 0;">🛡️</div>
      ${h1('Yangi qurilmadan kirish')}
      ${greeting(username)}
      ${lede(`Hisobingizga yangi qurilmadan kirilgan. Bu siz bo'lsangiz — e'tibor bermang.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="card" style="background:${BRAND.surfaceSoft};border:1px solid ${BRAND.border};border-radius:12px;margin:8px 0 24px 0;">
        <tr><td style="padding:14px 18px;font-size:13px;"><strong class="text-secondary" style="color:${BRAND.textSecondary};">Vaqt:</strong> <span class="text-primary" style="color:${BRAND.textPrimary};">${escapeHtml(when)}</span></td></tr>
        <tr><td style="padding:0 18px 14px 18px;font-size:13px;"><strong class="text-secondary" style="color:${BRAND.textSecondary};">IP:</strong> <span class="text-primary" style="color:${BRAND.textPrimary};">${escapeHtml(safeIp)}</span></td></tr>
        <tr><td style="padding:0 18px 14px 18px;font-size:13px;word-break:break-all;"><strong class="text-secondary" style="color:${BRAND.textSecondary};">Brauzer:</strong> <span class="text-primary" style="color:${BRAND.textPrimary};">${escapeHtml(safeUa)}</span></td></tr>
      </table>
      <p style="margin:0 0 24px 0;color:${BRAND.textSecondary};font-size:14px;text-align:center;" class="text-secondary">Bu siz emasmisiz? Darhol <strong style="color:#dc2626;">parolingizni o'zgartiring</strong>.</p>
      <div style="text-align:center;margin:24px 0;">${button(`${FE}/profile/security`, 'Sessiyalarni boshqarish →', 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)')}</div>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: '🛡️ Yangi qurilmadan Aidevix hisobiga kirish', html }).catch((err) => console.error('[email] sendNewDeviceLoginEmail failed:', err.message));
};

const sendAccountDeletedEmail = async (email, username) => {
  const html = renderLayout({
    preheader: 'Aidevix hisobingiz o\'chirildi.',
    title: 'Hisob o\'chirildi',
    accent: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    bodyHtml: `
      ${h1('Hisob o\'chirildi')}
      ${greeting(username)}
      ${lede(`Sizning Aidevix hisobingiz GDPR talabi asosida o'chirildi va anonimlashtirildi.`)}
      <p style="margin:0;color:${BRAND.textMuted};font-size:13px;text-align:center;" class="text-muted">Agar bu xato bo'lsa yoki yordam kerak bo'lsa — <a href="mailto:support@aidevix.uz" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">support@aidevix.uz</a></p>
    `,
  });
  await sendMail({ from: FROM, to: email, subject: 'Aidevix hisobi o\'chirildi', html }).catch((err) => console.error('[email] sendAccountDeletedEmail failed:', err.message));
};

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

  const badgesHtml = newBadges.length
    ? `<div class="card" style="margin:20px 0;padding:18px 20px;border:1px solid ${BRAND.border};border-radius:12px;background:${BRAND.surfaceSoft};">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.primary};margin-bottom:8px;">🏅 Yangi badgelar</div>
        ${newBadges.slice(0, 5).map((b) => `<div style="font-size:14px;margin:4px 0;color:${BRAND.textPrimary};" class="text-primary">${b.icon || '🏆'} ${escapeHtml(b.name)}</div>`).join('')}
      </div>`
    : '';

  const nextHtml = nextCourse
    ? `<div class="card" style="margin:20px 0;padding:18px 20px;border:1px solid ${BRAND.border};border-radius:12px;background:${BRAND.surfaceSoft};">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.primary};margin-bottom:6px;">Davom ettiring</div>
        <div class="text-primary" style="font-size:16px;font-weight:700;color:${BRAND.textPrimary};margin-bottom:10px;">${escapeHtml(nextCourse.title)}</div>
        <a href="${FE}/courses/${nextCourse._id}" style="display:inline-block;padding:8px 14px;background:${BRAND.primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Kursga o'tish →</a>
      </div>`
    : '';

  const html = renderLayout({
    preheader: `Haftalik xulosa: ${weeklyXp.toLocaleString()} XP, ${streak} kun streak.`,
    title: 'Haftalik xulosa',
    bodyHtml: `
      ${h1('Bu haftangiz')}
      ${greeting(username)}
      ${lede(`Sizning haftalik faoliyat xulosangiz tayyor.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 20px 0;border-spacing:8px;">
        <tr>${statCard('Bu hafta XP', weeklyXp.toLocaleString(), BRAND.primary)}${statCard('Streak 🔥', `${streak} kun`, '#f97316')}</tr>
        <tr>${statCard('Jami XP', totalXp.toLocaleString(), BRAND.textPrimary)}${statCard('Ranking', `#${rank || '—'}`, '#06b6d4')}</tr>
      </table>
      ${badgesHtml}
      ${nextHtml}
      <p style="margin:20px 0 0 0;padding-top:18px;border-top:1px solid ${BRAND.border};color:${BRAND.textMuted};font-size:12px;text-align:center;" class="text-muted divider">Streak buzilmasligi uchun bugun ham kiring. <a href="${FE}/profile" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">Profil →</a></p>
    `,
  });

  await sendMail({ from: FROM, to: email, subject: `📊 Haftalik xulosa — ${weeklyXp.toLocaleString()} XP`, html })
    .catch((err) => console.error('[Digest] email failed:', err.message));
};

module.exports = {
  sendMail,
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

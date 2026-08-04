require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('../config/database');
const Prompt = require('../models/Prompt');
const User = require('../models/User');

const PROMPTS = [
  {
    title: 'Vibe Coding — Next.js 14 & Tailwind UI Component',
    description: 'Zamonaviy Vibe Coding uslubida Next.js va Tailwind orqali premium UI komponent yaratish prompti.',
    category: 'vibe_coding',
    tool: 'Claude Code',
    tags: ['nextjs', 'tailwind', 'vibe-coding', 'ui'],
    isFeatured: true,
    content: `Sen dunyo darajasidagi Frontend Architect va UI/UX dizaynersan. Sening vazifang quyidagi talablar asosida premium, chiroyli va responsiv UI komponent yaratish.

TEXNOLOGIYALAR:
- Next.js 14 (App Router)
- React Server/Client components
- Tailwind CSS
- Framer Motion (animatsiyalar uchun)
- Lucide React (ikonkalar)

TALAB:
[KOMPONENT_YOKI_SAHIFA_TA'RIFI_BU_YERGA_YOZILADI]

KODLASH QOIDALARI:
1. "Vibe Coding" yondashuvini qo'lla: ranglar garmoniyasi (dark mode, glassmorphism), mayda mikro-animatsiyalar, hover/active effektlar.
2. Oddiy oq va qora ranglardan voz kechib, premium ko'rinadigan Indigo/Violet/Slate ranglaridan foydalan.
3. Koding qisqa va 'Clean Code' tamoyillariga mos bo'lishi kerak.
4. Foydalanuvchiga 'copy-paste' qilib ishlatib ketishi uchun tayyor \`page.tsx\` yoki komponent kodini taqdim et.

Natijada: Bir qarashda odamni "Wow" deydigan darajada chiroyli va mukammal ishlangan kod bering.`,
  },
  {
    title: 'Cursor Agent — Full-stack Feature Implementation',
    description: 'Cursor IDE uchun butun boshli featureni backenddan tortib frontendgacha to\'liq integratsiya qilish prompti.',
    category: 'cursor',
    tool: 'Cursor',
    tags: ['fullstack', 'cursor', 'feature', 'nodejs', 'react'],
    isFeatured: true,
    content: `Sen Cursor IDE agentisan. Quyidagi Featureni to'liq, end-to-end (Frontend + Backend + DB) amalga oshirishing kerak.

FEATURE: [FEATURE_NOMI_VA_TALABLARI_BU_YERGA_YOZILADI]

BOSQICHLAR (Ketma-ketlikka rioya qil):
1. **Backend / API (Node.js/Express)**
   - Kerakli Mongoose Model/Schema ni yaratish (yoki yangilash).
   - Controller va Route yaratish.
   - Xavfsizlik (auth, rate-limit, validation) larini tekshirish.
2. **Frontend / UI (Next.js/React)**
   - Backenddan ma'lumotni fetch qilish (Redux Toolkit yoki React Query orqali).
   - UI komponentini yaratish va xatoliklarni (Error & Loading states) chiroyli hande qilish.
3. **Integratsiya va Test**
   - End-to-end to'g'ri ulanganini tekshirish.
   - Har qanday tip (TypeScript) xatolarini to'g'irlash.

Kutilyotgan Natija: Har bir qadam bo'yicha menga nima qilayotganingni qisqacha tushuntir va fayllarni ro'yxatini ko'rsat. Keyin "Apply" tugmasini bosib ishlata olishim uchun to'liq kodni ber.`,
  },
  {
    title: 'Claude Code — Katta codebase\'ni Refactoring qilish',
    description: 'Loyihadagi eski yoki yomon yozilgan kodni (legacy code) xavfsiz ravishda tozalash va zamonaviy usulga o\'tkazish.',
    category: 'refactoring',
    tool: 'Claude Code',
    tags: ['refactoring', 'clean-code', 'legacy', 'claude-code'],
    isFeatured: true,
    content: `Sen Senior Software Engineer va Refactoring bo'yicha ekspertisan.

MENING KODIM (yoki fayl yo'li):
[KOD_BU_YERGA_TAKLANADI]

MUAMMO:
Bu kod eskirgan, o'qish qiyin va maintain qilish imkonsiz holatga kelib qolgan.

VAZIFA:
1. Kodni qismlarga bo'l (Separation of Concerns).
2. O'zgaruvchilar va funksiyalarga to'g'ri va tushunarli nomlar ber (Clean Code).
3. SOLID prinsiplari va DRY (Don't Repeat Yourself) qoidalarini qo'lla.
4. Agar kodda yashirin bug yoki xavfsizlik muammolari bo'lsa, uni tahlil qilib to'g'irla.
5. Asosiy biznes logikani buzmagan holda kodning optimal va tezkor ishlashini ta'minla.

OUTPUT: Menga refaktor qilingan toza kodni va nimalarni, nima uchun o'zgartirganingni bullet-pointlarda tushuntir.`,
  },
  {
    title: 'System Prompt — AI Agent / Bot yaratish uchun',
    description: 'Yangi maxsus AI bot yoki agent yaratayotganda uning tabiatini (persona) va cheklovlarini belgilash.',
    category: 'system',
    tool: 'Any',
    tags: ['system', 'bot', 'agent', 'prompt-engineering'],
    isFeatured: false,
    content: `Sen [MAXSUS_KASB_YOKI_ROL] san.
Sening maqsading foydalanuvchilarga [MAQSAD] mavzusida eng yuqori sifatli yordam berishdir.

# QOIDALAR:
1. Har doim o'zbek tilida (yoki foydalanuvchi qaysi tilda yozsa, o'sha tilda) javob ber.
2. Hech qachon [TAQIQLANGAN_MAVZU] haqida gapirma va bu bo'yicha savol berilsa, o'z rolingdan chetga chiqmasdan muloyim rad et.
3. Yolg'on ma'lumot (hallucination) bermaslik uchun, bilmagan narsangni "Bilmayman" deb ochiq ayt.
4. Javoblaringni formatlash uchun Markdown (qalin matn, ro'yxat, kod bloklari) dan samarali foydalan.
5. Emotsional intellektni saqlab qol: foydalanuvchi stressda bo'lsa, xotirjam va yordam beruvchi ohangda gapir.

# JAVOB FORMASI:
- Qisqa xulosa.
- Asosiy qadamlar (1, 2, 3).
- Kelgusidagi maslahat yoki "Call to action".`,
  },
  {
    title: 'GitHub Copilot — TDD (Test-Driven Development) uchun',
    description: 'Testlarni birinchi yozib, so\'ng unga mos dastur mantig\'ini yozish uchun maxsus promt.',
    category: 'copilot',
    tool: 'GitHub Copilot',
    tags: ['tdd', 'testing', 'copilot', 'jest'],
    isFeatured: false,
    content: `Copilot, quyidagi funksiya uchun avval qamrovdor (comprehensive) unit testlarni (Jest yoki Vitest yordamida) yozib ber:

FUNKSIYA VAZIFASI: [FUNKSIYA_NIMA_QILISHINI_YOZING]
KIRUVCHI PARAMETRLAR: [PARAMETRLAR_VA_TURLARI]
KUTILAYOTGAN NATIJA: [QAYTISH_QIYMATI]

Talablar:
1. Edge-caselarni (bo'sh qiymatlar, noto'g'ri data tiplar, katta hajmli ma'lumotlar) tekshiruvchi testlarni qo'sh.
2. "Happy path" uchun aniq bir misol keltir.
3. Testlar yozib bo'lingach, ularning barchasidan muvaffaqiyatli o'ta oladigan optimal TypeScript kodni taqdim et.`,
  }
];

async function seedTopSkills() {
  await connectDB();

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('❌ Admin foydalanuvchi topilmadi');
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;

  for (const p of PROMPTS) {
    const exists = await Prompt.findOne({ title: p.title });
    if (exists) {
      console.log(`⏭️  O'tkazildi: ${p.title}`);
      skipped += 1;
      continue;
    }

    await Prompt.create({
      ...p,
      author: admin._id,
      isPublic: true,
      viewsCount: Math.floor(Math.random() * 500) + 100, // ozgina tasodifiy view
      likesCount: Math.floor(Math.random() * 50) + 10,
    });
    console.log(`✅ Qo'shildi: [${p.category}] ${p.title}`);
    added += 1;
  }

  console.log(`\n🎉 Bajarildi! Qo'shildi: ${added} | O'tkazib yuborildi: ${skipped}`);
  process.exit(0);
}

seedTopSkills().catch((e) => {
  console.error('❌ Xato:', e.message);
  process.exit(1);
});

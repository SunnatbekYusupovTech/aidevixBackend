// Keyslar — /keyslar va /keyslar/[slug]. Maqsad: "Sunnatbek Yusupov va Aidevix
// aynan qanday AI ishini bajargan?" savoliga dalilli, tekshiriladigan javob.
// Qoida: o'lchanmagan natijaga raqam/foiz yozilmaydi; har da'vo manba kodi yoki
// jonli sahifa bilan tasdiqlanadi (sources). Yangi keys = shu massivga yangi obyekt.

export type CaseSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type CaseStudy = {
  slug: string;
  title: string; // <h1> + meta title (brandsiz)
  shortTitle: string;
  description: string; // meta description
  keywords: string[];
  kind: string; // kartochka yorlig'i, masalan "Production LLM · EdTech"
  status: string; // demo / pilot / production + sana
  datePublished: string; // ISO
  dateModified: string; // ISO
  product: { name: string; url: string; category: string }; // schema.org SoftwareApplication
  summary: string; // h1 ostidagi javob-birinchi xulosa (answer-engine uchun)
  sections: CaseSection[];
  stack: string[];
  sources: { label: string; href: string }[]; // tekshiriladigan havolalar
  faq: { q: string; a: string }[];
  related: { label: string; href: string }[];
};

export const CASES_UPDATED = '2026-11-03';

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'ai-coach',
    title: "Aidevix AI Coach — o'zbek tilidagi production LLM yordamchi va AI kod tahlili",
    shortTitle: 'Aidevix AI Coach',
    description:
      "Keys: Aidevix platformasidagi AI Coach qanday qurilgan — Claude/GPT-4o/Llama provider zanjiri, real kurs katalogiga ulangan javoblar, 18 tilda AI kod tahlili, rate-limit va prompt-injection himoyasi. Manba kodi ochiq.",
    keywords: [
      'AI Coach', 'LLM yordamchi', "o'zbek tilida AI chatbot", 'AI kod tahlili', 'Claude API integratsiya',
      'OpenAI integratsiya', 'AI keys O\'zbekiston', 'Aidevix keys', 'Sunnatbek Yusupov AI loyiha',
    ],
    kind: 'Production LLM · EdTech',
    status: "Production — aidevix.uz'da ishlab turibdi (2026-noyabr holatiga)",
    datePublished: '2026-11-03',
    dateModified: '2026-11-03',
    product: { name: 'Aidevix AI Coach', url: 'https://aidevix.uz/playground', category: 'EducationalApplication' },
    summary:
      "AI Coach — aidevix.uz o'quv platformasiga o'rnatilgan LLM yordamchi. U ikki ishni qiladi: (1) sayt bo'ylab chat — o'zbek tilida dasturlash savollariga mentor uslubida javob beradi va so'rovga mos kurs/video kartalarini haqiqiy katalogdan qo'shadi; (2) Playground — o'quvchi yozgan kodni 18 ta tilda tahlil qilib, xatolar, tuzatish va qayta yozilgan variantni qaytaradi. Loyihani Aidevix jamoasi qurgan; AI qatlami (arxitektura, prompt dizayni, provider zanjiri, xavfsizlik qoidalari) va frontend — Sunnatbek Yusupov.",
    sections: [
      {
        heading: 'Qanday muammo bor edi?',
        paragraphs: [
          "O'zbek tilida dasturlash o'rganayotgan o'quvchi savolni ko'pincha mentor band paytda — kechqurun yoki dam olish kuni — beradi. Umumiy chatbotlar bu holatda ikki muammo tug'diradi: platforma kontekstini bilmaydi (qaysi kurs, qaysi video) va bilmagan narsani — narx, kurs nomi, muddat — ishonch bilan to'qib chiqaradi.",
          "Ikkinchi ehtiyoj — kodni tekshirish. Video ostida yozilgan kodni kimdir darhol ko'rib, aynan qaysi qatorda nima noto'g'ri ekanini aytishi kerak edi; buni har safar mentorga yuborish real emas.",
        ],
      },
      {
        heading: 'Nima ishlab chiqildi?',
        bullets: [
          "Chat yordamchi (sayt bo'ylab vidjet, /api/coach): Next.js route handler. Foydalanuvchi xabari avval niyat bo'yicha tasniflanadi (video qidiruv / kurs qidiruv / mavzu / umumiy), LLM javobi va backend katalog qidiruvi parallel ishlaydi, topilgan kurs va video kartalari javob ostiga server tomonidan qo'shiladi.",
          "Provider zanjiri: Claude Haiku 4.5 (Anthropic) → GPT-4o (OpenAI) → Llama 3.3 70B (Groq). Keyingi provayderga faqat 429/5xx xatoda o'tiladi; provayder javob bergan-u, javob yaroqsiz bo'lsa, ikkinchi pullik chaqiruv qilinmaydi. Hech bir LLM mavjud bo'lmasa — qoidaga asoslangan deterministik fallback javob.",
          "Halollik qoidalari system prompt'da: model kurs katalogi, narx va chegirmalarni ko'rmaydi va ularni o'ylab topmasligi, ishonchi komil bo'lmasa buni aytishi, AI ekanini inkor qilmasligi talab qilinadi. Katalog ma'lumoti faqat serverdagi haqiqiy qidiruvdan keladi.",
          "AI kod tahlili (Playground, /api/playground/review): Express backend, Llama 3.3 70B (Groq) JSON rejimida. 18 ta til (JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, SQL, Bash va b.), 8 000 belgigacha kod. Natija: 0–100 ball, qisqa xulosa, qator raqami va tuzatish bilan muammolar ro'yxati (critical/high/medium/low), yaxshilash takliflari va qayta yozilgan kod. Monaco editor faqat foydalanuvchi yozishni boshlaganda yuklanadi.",
        ],
      },
      {
        heading: 'Xavfsizlik va xarajat nazorati',
        bullets: [
          "Faqat tizimga kirgan foydalanuvchilar: /api/coach sessiyani backend orqali tekshiradi (fail-closed — tekshiruv xato bersa, pullik model chaqirilmaydi).",
          "Limitlar: IP bo'yicha 20 so'rov/daqiqa; foydalanuvchi bo'yicha 10/daqiqa va 100/sutka; Playground — 15 tahlil/15 daqiqa; xabar 2 000 belgigacha; model javobi 800 tokengacha; 15 soniya timeout.",
          "Suhbat tarixi ishonchsiz kirish sifatida qaraladi: faqat user/assistant rollari, navbatma-navbat tartib, uzunlik cheklovi, faqat oxirgi 2 ta assistant javobi matni saqlanadi — soxta tarix orqali promptni boshqarish (prompt injection) qiyinlashtirilgan. Playground prompt'ida «oldingi ko'rsatmalarni unut» kabi buyruqlar va secret so'rovlari e'tiborsiz qoldiriladi.",
          "API kalitlari faqat serverda (private env), brauzer bundle'iga chiqmaydi.",
        ],
      },
      {
        heading: 'Sunnatbek Yusupovning roli',
        paragraphs: [
          "AI qatlamining arxitekturasi, system prompt'lar va halollik qoidalari, provider zanjiri va fallback mantig'i, limit/sanitizatsiya qoidalari hamda frontend vidjet va Playground UI. Backend infratuzilma (auth, Express limiter, katalog API) — Aidevix jamoasi bilan birga.",
        ],
      },
      {
        heading: 'Natija qanday tekshirildi?',
        bullets: [
          "Kod ochiq: route handler va playground controller GitHub'da — har bir da'voni manba kodidan tekshirish mumkin (quyidagi havolalar).",
          "Ichki LLM-xavfsizlik ro'yxati bo'yicha ko'rib chiqilgan: katalog gallyutsinatsiyasi, xarajat nazorati, tarix orqali injection, kalit sizishi.",
          "Jonli ishlash: aidevix.uz'da ro'yxatdan o'tib, Playground'da kod yuborish yoki chat vidjetida savol berish orqali.",
          "Foydalanish statistikasi (so'rovlar soni, qoniqish) hali ochiq e'lon qilinmagan — bu yerda o'lchanmagan raqam keltirilmaydi.",
        ],
      },
      {
        heading: 'Cheklovlar',
        bullets: [
          "Mentor o'rnini bosmaydi: murakkab arxitektura savollari va baholash odam tekshiruvi bilan.",
          "Model katalogni bilmaydi (ataylab) — kurs haqidagi aniq savolga faqat qidiruv topgan kartalar javob beradi.",
          "Javob oqim (streaming) shaklida emas — to'liq javob kelguncha kutiladi.",
          "Rate-limit hisoblagichlari har bir server instansida alohida (in-memory); global kvota uchun Redis rejalashtirilgan.",
          "Playground kodni bajarmaydi, faqat statik tahlil qiladi; o'zbekcha javob sifati tanlangan modelga bog'liq.",
        ],
      },
      {
        heading: 'Hozirgi holati',
        paragraphs: [
          "Production. aidevix.uz'da barcha ro'yxatdan o'tgan o'quvchilar uchun ishlaydi. Oxirgi yangilanish: 2026-yil noyabr.",
        ],
      },
    ],
    stack: [
      'Next.js (App Router)', 'Node.js / Express', 'MongoDB', 'Anthropic API (Claude Haiku 4.5)',
      'OpenAI API (GPT-4o)', 'Groq (Llama 3.3 70B)', 'Monaco Editor', 'Vercel + Railway',
    ],
    sources: [
      { label: 'Jonli: AI Code Playground', href: 'https://aidevix.uz/playground' },
      {
        label: 'Manba kodi: chat yordamchi (frontend/src/app/api/coach/route.ts)',
        href: 'https://github.com/SunnatbekYusupovTech/aidevixBackend/blob/main/frontend/src/app/api/coach/route.ts',
      },
      {
        label: 'Manba kodi: kod tahlili (backend/controllers/playgroundController.js)',
        href: 'https://github.com/SunnatbekYusupovTech/aidevixBackend/blob/main/backend/controllers/playgroundController.js',
      },
    ],
    faq: [
      {
        q: 'Aidevix AI Coach qaysi modelda ishlaydi?',
        a: "Chat — Claude Haiku 4.5, zaxira sifatida GPT-4o va Llama 3.3 70B (faqat 429/5xx xatolarda). Kod tahlili — Llama 3.3 70B (Groq) JSON rejimida. Arxitektura modelga bog'lanmagan: provayderni almashtirish bitta funksiyani o'zgartirish.",
      },
      {
        q: "AI Coach kurs narxlarini to'qib chiqarmaydimi?",
        a: "Yo'q — system prompt modelga katalog berilmaganini aniq aytadi va o'ylab topishni taqiqlaydi; kurs/video kartalari serverdagi haqiqiy qidiruvdan keyin qo'shiladi. Bu qoidalar manba kodida ochiq.",
      },
      {
        q: 'Shunday yordamchini bizning biznesimiz uchun qurish mumkinmi?',
        a: "Ha. Aynan shu arxitektura — LLM + sizning ma'lumotlaringiz bo'yicha qidiruv + limitlar va halollik qoidalari — mijozlar xizmati, ichki bilimlar bazasi yoki savdo yordamchisiga mos keladi. Xizmatlar: AI integratsiya va AI agentlar.",
      },
    ],
    related: [
      { label: 'AI integratsiya xizmati', href: '/xizmatlar/ai-integratsiya' },
      { label: 'AI agentlar yaratish', href: '/xizmatlar/ai-agent' },
      { label: 'Korporativ AI trening', href: '/xizmatlar/korporativ-ai-trening' },
      { label: 'AI agent nima va qanday quriladi? (maqola)', href: '/blog/ai-agent-nima-qanday-quriladi' },
    ],
  },
];

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug);

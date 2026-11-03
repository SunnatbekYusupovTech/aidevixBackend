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
          "Limitlar (chat, /api/coach): IP bo'yicha 20 so'rov/daqiqa; foydalanuvchi bo'yicha 10/daqiqa va 100/sutka; xabar 2 000 belgigacha; model javobi 800 tokengacha; 15 soniya timeout.",
          "Limitlar (Playground, /api/playground/review): foydalanuvchi bo'yicha 15 tahlil/15 daqiqa; kod 8 000 belgigacha; model javobi 1 500 tokengacha; 25 soniya timeout.",
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
          "Kod ochiq: route handler va playground controller GitHub'da — texnik implementatsiya tafsilotlarini (provider zanjiri, prompt qoidalari, limitlar, sanitizatsiya) manba kodidan tekshirish mumkin (quyidagi havolalar). Mualliflik taqsimoti va haqiqiy foydalanish natijasini kodning o'zi isbotlamaydi — ular alohida dalil talab qiladi.",
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
          "Chat (/api/coach) rate-limit hisoblagichlari har bir server instansida alohida (in-memory); global kvota uchun Redis rejalashtirilgan. Playground limiti esa REDIS_URL sozlanganda Redis'da (instanslar o'rtasida umumiy), aks holda xotirada saqlanadi.",
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
        a: "To'liq kafolat yo'q, lekin xavf ataylab kamaytirilgan: system prompt modelga katalog berilmaganini aniq aytadi va narx/kurs o'ylab topishni taqiqlaydi; kurs/video kartalari esa serverdagi haqiqiy qidiruvdan keyin qo'shiladi. Erkin matnda model baribir xato qilishi mumkin — shuning uchun aniq kurs savollari /courses sahifasiga yo'naltiriladi. Qoidalar manba kodida ochiq.",
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
  {
    slug: 'biolife',
    title: "Biolife (IMIR-TRADE GROUP) — ichimlik suvi ishlab chiqaruvchida buyurtma, savdo, hisobot va call-center bo'limlarini AI bilan avtomatlashtirish",
    shortTitle: "Biolife — biznes bo'limlarini AI avtomatlashtirish",
    description:
      "Keys: O'zbekistonning yirik ichimlik suvi ishlab chiqaruvchisi Biolife (IMIR-TRADE GROUP) uchun Telegram AI buyurtma boti, CRM'ga ulangan savdo agenti, 1C/ombor asosida hisobot avtomatlashtirish va call-center qo'ng'iroqlarini matnga o'girib tahlil qilish. Claude va Gemini. Natija raqamlari e'lon qilinmagan.",
    keywords: [
      'biznesda AI joriy etish', "O'zbekistonda AI integratsiya", 'Telegram AI bot buyurtma', 'CRM AI agent',
      '1C AI hisobot', 'call-center STT', 'ishlab chiqarish AI avtomatlashtirish', 'Biolife AI', 'IMIR-TRADE GROUP',
      'Sunnatbek Yusupov AI loyiha', 'CEO AI',
    ],
    kind: 'AI integratsiya · FMCG / ishlab chiqarish',
    status: 'Yakunlangan — mijozga topshirilgan (2026-noyabr holatiga)',
    datePublished: '2026-11-03',
    dateModified: '2026-11-03',
    product: { name: "Biolife biznes-bo'limlari uchun AI avtomatlashtirish tizimi", url: 'https://aidevix.uz/keyslar/biolife', category: 'BusinessApplication' },
    summary:
      "Biolife — \"IMIR-TRADE GROUP\" MChJ (2004-yildan ishlaydi, O'zbekistonda 4 ta ishlab chiqarish maydoni, chakana, ulgurji, HoReCa va davlat buyurtmalari bo'yicha ~90 kishilik savdo jamoasi) ichimlik suvi brendi. Loyihada kompaniyaning to'rt bo'limi AI bilan avtomatlashtirildi: (1) Telegram'da buyurtma qabul qiladigan va mijoz savollariga javob beradigan AI bot, (2) CRM'ga ulangan savdo AI agenti, (3) 1C/ombor ma'lumotlari asosida hisobotlarni avtomatik tayyorlash, (4) call-center qo'ng'iroqlarini matnga o'girib (STT) tahlil qilish. LLM: Claude (Anthropic) va Gemini (Google). Loyihani Sunnatbek Yusupov CEO AI kompaniyasida CTO va loyiha menejeri sifatida boshqargan.",
    sections: [
      {
        heading: 'Mijoz kim?',
        paragraphs: [
          "IMIR-TRADE GROUP — Toshkentdagi (Bektemir tumani) alkogolsiz ichimliklar ishlab chiqaruvchisi; Biolife brendi 2015-yildan bozorda, gazli va gazsiz suv 0,33 litrdan 10 litrgacha. Ishlab chiqarish Toshkent, Keles, Denov va Samarqandda; savdo kanallari — do'konlar, supermarketlar, ulgurji, HoReCa va davlat tashkilotlari. 5 va 10 litrlik suv Toshkent bo'ylab uyga va ofisga yetkazib beriladi, buyurtma kanallaridan biri — Telegram bot.",
          "Bunday ko'lamda har kuni bir xil turdagi ko'p ish takrorlanadi: buyurtmani qabul qilish va tizimga kiritish, savdo xodimlarining mijoz bilan yozishmasi va CRM'ni to'ldirishi, 1C va ombordan hisobot yig'ish, call-center qo'ng'iroqlarini sifat bo'yicha tekshirish. Aynan shu takrorlanuvchi, qoidaga asoslangan ishlar AI uchun eng mos nuqta.",
        ],
      },
      {
        heading: 'Qanday muammo bor edi?',
        bullets: [
          "Buyurtma va mijoz savollari odam operator orqali o'tardi: ish vaqtidan tashqarida javob kechikardi, bir xil savollarga (narx, hajm, yetkazib berish hududi) qayta-qayta qo'lda javob berilardi.",
          "Savdo jamoasi vaqtining bir qismi sotuvga emas, CRM'ga yozish, yozishma qoralamasi va kunlik xulosa tayyorlashga ketardi.",
          "Hisobotlar 1C va ombor ma'lumotlaridan qo'lda yig'ilardi — kechikadi va xatoga moyil.",
          "Call-center qo'ng'iroqlari yozib olinardi, lekin tizimli tahlil qilinmasdi: murojaat sabablari va sifat muammolari ko'rinmasdi.",
        ],
      },
      {
        heading: 'Nima ishlab chiqildi?',
        bullets: [
          "Telegram AI bot: buyurtmani (hajm, miqdor, manzil, vaqt) suhbat orqali qabul qiladi, yetkazib berish va mahsulot bo'yicha savollarga javob beradi; narx va mavjudlik ma'lumoti model tomonidan o'ylab topilmaydi — faqat mijoz tizimidan olinadi; murakkab holat odam operatorga o'tkaziladi.",
          "Savdo AI agenti: CRM'ga ulangan — murojaatlarni saralaydi, mijoz bilan yozishma qoralamasini tayyorlaydi, kartochkani to'ldiradi va kunlik xulosa beradi. Yakuniy qaror va yuborish — savdo xodimida.",
          "Hisobot avtomatlashtirish: 1C/ombor ma'lumotlari va Google Sheets asosida belgilangan jadval bo'yicha hisobotlar avtomatik tayyorlanadi; LLM raqamni hisoblamaydi, tayyor ma'lumotni izohlaydi va formatlaydi.",
          "Call-center: qo'ng'iroq yozuvlari matnga o'giriladi (STT), so'ng LLM murojaat sababini tasniflaydi va sifat mezonlari bo'yicha belgilaydi — rahbariyat uchun umumiy manzara.",
          "LLM qatlami: Claude (Anthropic) va Gemini (Google). Arxitektura provayderga bog'lanmagan; har bo'lim uchun alohida prompt qoidalari va ruxsat chegaralari.",
        ],
      },
      {
        heading: 'Natija qanday tekshirildi?',
        bullets: [
          "Tizim mijozga topshirilgan va to'rtta bo'lim bo'yicha ishga tushirilgan (loyiha holati: yakunlangan).",
          "Natija ko'rsatkichlari (javob vaqti, operator yuki, hisobot tayyorlash vaqti) mijoz ichida o'lchanadi va hali ochiq e'lon qilinmagan — shu sababli bu sahifada raqam yoki foiz keltirilmaydi. Mijoz ruxsati bilan o'lchangan ko'rsatkichlar qo'shiladi.",
          "Mijoz haqidagi faktlar (tarix, ishlab chiqarish joylari, savdo kanallari, yetkazib berish) kompaniyaning ochiq manbalaridan olingan (quyidagi havolalar).",
        ],
      },
      {
        heading: 'Cheklovlar',
        bullets: [
          "Bot va agent qaror qabul qilmaydi: to'lov, chegirma va nostandart buyurtmalar odam tasdig'i bilan.",
          "Hisobot moduli manba ma'lumot sifatiga bog'liq: 1C/omborda kechikkan yozuv hisobotga ham kechikib tushadi.",
          "STT sifati ovoz yozuvi sifatiga va o'zbek/rus aralash nutqqa bog'liq; shubhali tasniflar qo'lda ko'rib chiqiladi.",
          "Mijoz ichki ma'lumotlari (buyurtmalar, mijozlar bazasi, yozishmalar) ochiq e'lon qilinmaydi.",
        ],
      },
      {
        heading: 'Hozirgi holati',
        paragraphs: [
          "Yakunlangan va mijozga topshirilgan. Loyiha CEO AI jamoasi tomonidan bajarilgan; Sunnatbek Yusupov — CTO va loyiha menejeri (arxitektura, LLM qatlami, integratsiya rejasi, jamoa boshqaruvi). Sahifa 2026-yil noyabrda e'lon qilindi.",
        ],
      },
    ],
    stack: [
      'Anthropic API (Claude)', 'Google Gemini API', 'Telegram Bot API', 'CRM integratsiyasi (amoCRM / Bitrix24)',
      "1C / ombor ma'lumotlari", 'Google Sheets API', 'Speech-to-Text (call-center)', 'Node.js',
    ],
    sources: [
      { label: 'IMIR-TRADE GROUP — rasmiy sayt, ishlab chiqarish', href: 'https://imirtradegroup.uz/proizvodstvo' },
      { label: "Biolife 5 va 10 l yetkazib berish (Telegram bot ko'rsatilgan)", href: 'https://imirtradegroup.uz/dostavka-vody-biolife-5l-i-10l-na-dom-i-v-ofis/' },
      { label: 'Biolife Instagram', href: 'https://www.instagram.com/biolife.water/' },
      { label: 'Sunnatbek Yusupov — profil va rollar', href: 'https://aidevix.uz/team' },
    ],
    faq: [
      {
        q: 'Biolife loyihasida qaysi AI modellar ishlatilgan?',
        a: "Claude (Anthropic) va Gemini (Google). Bo'limlar bo'yicha vazifaga qarab model tanlangan; arxitektura provayderga bog'lanmagan, shuning uchun modelni almashtirish mijoz jarayonini o'zgartirmaydi.",
      },
      {
        q: "AI bot buyurtmani o'zi tizimga yozadimi?",
        a: "Ha — bot buyurtma ma'lumotini suhbatdan ajratib, mijozning tizimiga uzatadi. Lekin narx, mavjudlik va yetkazib berish shartlarini model o'ylab topmaydi, faqat tizimdan oladi; to'lov va nostandart holatlar odam tasdig'i bilan.",
      },
      {
        q: 'Natija raqamlari qani?',
        a: "Ko'rsatkichlar mijoz ichida o'lchanadi va hali ochiq e'lon qilinmagan. Biz o'lchanmagan yoki tasdiqlanmagan raqamni keysga yozmaymiz; mijoz ruxsat bergach qo'shiladi.",
      },
      {
        q: 'Bizning biznesga ham shunday tizim qurish mumkinmi?',
        a: "Ha. Odatda bitta bo'limdan (ko'pincha buyurtma yoki mijoz savollari) boshlanadi, keyin CRM, hisobot va call-center qo'shiladi. Xizmatlar: AI integratsiya, AI agentlar va biznes jarayonlarini avtomatlashtirish.",
      },
    ],
    related: [
      { label: 'AI integratsiya xizmati', href: '/xizmatlar/ai-integratsiya' },
      { label: 'AI agentlar yaratish', href: '/xizmatlar/ai-agent' },
      { label: 'Biznes jarayonlarini avtomatlashtirish', href: '/xizmatlar/avtomatlashtirish' },
      { label: 'Keys: Aidevix AI Coach', href: '/keyslar/ai-coach' },
      { label: 'Biznesni AI bilan avtomatlashtirish (maqola)', href: '/blog/biznesni-ai-bilan-avtomatlashtirish' },
    ],
  },
];

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug);

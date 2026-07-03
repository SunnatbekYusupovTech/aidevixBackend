// SEO blog qo'llanmalari — statik, server-render qilinadigan maqolalar.
// Maqsad: O'zbek tilida kam raqobatli AI-tool + dasturlash kalit so'zlari bo'yicha
// indekslanadigan kontent yaratish (Search Console ko'rsatishlarini oshirish uchun).
// Har bir maqola /blog/[slug] da render bo'ladi + sitemap'ga qo'shiladi.

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'cta'; text: string; href: string; label: string };

export type BlogArticle = {
  slug: string;
  title: string; // brandsiz — template "| Aidevix" qo'shadi
  description: string; // meta description (~150 belgi)
  keywords: string[];
  category: string;
  date: string; // ISO
  updated?: string; // ISO
  readMinutes: number;
  excerpt: string;
  blocks: ArticleBlock[];
  faq?: { q: string; a: string }[];
  related?: { label: string; href: string }[];
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'claude-code-nima-qollanma',
    title: 'Claude Code nima va undan qanday foydalanish kerak',
    description:
      "Claude Code — terminalda ishlaydigan AI dasturlash agenti. O'zbek tilida to'liq qo'llanma: o'rnatish, asosiy buyruqlar, CLAUDE.md va amaliy maslahatlar.",
    keywords: [
      'claude code', 'claude code o\'zbek', 'claude code qanday ishlatiladi',
      'ai bilan kod yozish', 'anthropic claude', 'claude code qo\'llanma',
      'terminal ai agent', 'claude.md',
    ],
    category: 'ai',
    date: '2026-06-28',
    readMinutes: 8,
    excerpt:
      "Claude Code terminalda turib butun loyihangizni o'qiydi, tahrirlaydi va testdan o'tkazadi. Uni o'zbek tilida noldan o'rganamiz.",
    blocks: [
      { type: 'p', text: "Claude Code — Anthropic kompaniyasining buyruq qatori (terminal) orqali ishlaydigan AI dasturlash agenti. Oddiy chat-botdan farqi shundaki, u sizning butun loyihangizni o'qiy oladi, fayllarni o'zi tahrirlaydi, terminalda buyruqlar bajaradi va natijani tekshiradi — ya'ni haqiqiy dasturchi kabi ishlaydi." },
      { type: 'h2', text: 'Claude Code nima uchun kerak?' },
      { type: 'p', text: "An'anaviy AI yordamchilar sizga faqat kod parchasini qaytaradi va siz uni qo'lda joylashtiryapsiz. Claude Code esa kontekstni — papkalar tuzilishi, fayllar mazmuni, git tarixi — to'liq tushunadi va o'zgartirishni to'g'ridan-to'g'ri qiladi. Bu katta loyihalarda vaqtni bir necha barobar tejaydi." },
      { type: 'h2', text: 'O\'rnatish' },
      { type: 'p', text: "Claude Code Node.js muhitida ishlaydi. O'rnatish uchun terminalda quyidagi buyruqni bajaring va Anthropic akkauntingiz bilan tizimga kiring. So'ng loyiha papkangizda `claude` deb yozsangiz, agent ishga tushadi." },
      { type: 'ul', items: [
        "Node.js 18+ o'rnatilgan bo'lishi kerak",
        "npm orqali global o'rnatiladi",
        "Birinchi ishga tushganda Anthropic akkaunti bilan login qilinadi",
      ] },
      { type: 'h2', text: 'CLAUDE.md — loyiha xotirasi' },
      { type: 'p', text: "Eng muhim fayl — loyiha ildizidagi `CLAUDE.md`. Agent har safar shu faylni avtomatik o'qiydi. Unga stack, papkalar tuzilishi, qoidalar va muhim eslatmalarni yozib qo'ysangiz, Claude har gal kontekstni qaytadan tushuntirishga hojat qolmaydi. Bu — sizning loyihangiz uchun doimiy yo'riqnoma." },
      { type: 'h2', text: 'Asosiy slash buyruqlar' },
      { type: 'ul', items: [
        "/init — loyiha uchun CLAUDE.md yaratadi",
        "/review — kodni tekshiradi",
        "/security-review — xavfsizlik auditi qiladi",
        "/model — modelni almashtiradi (tez yoki kuchli)",
        "/clear — kontekstni tozalaydi",
      ] },
      { type: 'h2', text: 'Amaliy maslahatlar' },
      { type: 'p', text: "Aniq vazifa bering — \"loginni tuzat\" o'rniga \"login formasida email validatsiyasi ishlamayapti, RegisterForm.tsx da tekshir\" deyish ancha yaxshi natija beradi. Murakkab arxitektura uchun kuchli modeldan, oddiy o'zgarishlar uchun tezroq modeldan foydalaning." },
      { type: 'cta', text: "Claude Code va boshqa AI vositalari uchun tayyor promptlar to'plamini ko'ring", href: '/prompts', label: 'Prompt kutubxonasi' },
    ],
    faq: [
      { q: 'Claude Code bepulmi?', a: "Claude Code Anthropic obunasi yoki API krediti orqali ishlaydi. Foydalanish hajmiga qarab to'lov olinadi." },
      { q: 'Claude Code o\'zbek tilini tushunadimi?', a: "Ha, Claude o'zbek tilidagi ko'rsatmalarni yaxshi tushunadi va o'zbekcha javob bera oladi." },
    ],
    related: [
      { label: 'Cursor AI qo\'llanmasi', href: '/blog/cursor-ai-qollanma' },
      { label: 'AI Code Playground', href: '/playground' },
    ],
  },

  {
    slug: 'cursor-ai-qollanma',
    title: 'Cursor AI bilan kod yozish: to\'liq qo\'llanma',
    description:
      "Cursor — AI o'rnatilgan kod muharriri. O'zbek tilida qo'llanma: .cursorrules, Composer, @ buyruqlari va tez ishlash usullari.",
    keywords: [
      'cursor ai', 'cursor ai o\'zbek tilida', 'cursor editor', 'cursorrules',
      'ai kod muharriri', 'cursor composer', 'vibe coding', 'cursor qo\'llanma',
    ],
    category: 'ai',
    date: '2026-06-28',
    readMinutes: 7,
    excerpt:
      "Cursor — VS Code asosidagi, ichiga AI o'rnatilgan muharrir. Uni o'zbek tilida noldan sozlashni o'rganamiz.",
    blocks: [
      { type: 'p', text: "Cursor — VS Code asosida qurilgan, lekin ichiga sun'iy intellekt chuqur singdirilgan kod muharriri. U kod yozishda real vaqtda taklif beradi, butun fayllarni qayta yozadi va loyiha kontekstini tushunadi." },
      { type: 'h2', text: '.cursorrules — loyiha qoidalari' },
      { type: 'p', text: "Loyiha ildizida `.cursorrules` fayli yaratib, unga loyihangiz qoidalarini yozing. Masalan: qaysi texnologiyalar ishlatilishi, auth qanday bo'lishi, qaysi naqshlardan qochish kerakligi. Cursor bu qoidalarni har bir taklifda hisobga oladi." },
      { type: 'h2', text: 'Composer va Chat' },
      { type: 'p', text: "Composer — bir necha faylni bir vaqtda o'zgartirish uchun. Chat — savol berish va kod tushuntirish uchun. Ikkalasi ham loyiha kontekstini ko'radi." },
      { type: 'h2', text: '@ buyruqlari' },
      { type: 'ul', items: [
        "@codebase — butun loyiha konteksti",
        "@file — aniq bir fayl",
        "@web — internetdan qidirish",
        "@docs — rasmiy hujjatlar",
      ] },
      { type: 'h2', text: 'Cursor yoki Claude Code — qaysi biri?' },
      { type: 'p', text: "Cursor — vizual muharrir yoqtiradiganlar uchun, kod yozishda real vaqtdagi yordam kuchli. Claude Code — terminalda ishlash va katta avtomatlashtirilgan vazifalar uchun qulay. Ko'p dasturchilar ikkalasini birga ishlatadi." },
      { type: 'cta', text: "Cursor uchun tayyor promptlarni Prompt kutubxonasidan toping", href: '/prompts', label: 'Promptlarni ko\'rish' },
    ],
    faq: [
      { q: 'Cursor bepulmi?', a: "Cursor bepul rejaga ega, lekin kuchli AI modellari uchun pullik obuna kerak bo'ladi." },
      { q: 'VS Code sozlamalarim Cursor\'ga o\'tadimi?', a: "Ha, Cursor VS Code asosida bo'lgani uchun kengaytmalar va sozlamalarni import qila oladi." },
    ],
    related: [
      { label: 'Claude Code qo\'llanmasi', href: '/blog/claude-code-nima-qollanma' },
      { label: 'Prompt engineering asoslari', href: '/blog/prompt-engineering-asoslari' },
    ],
  },

  {
    slug: 'prompt-engineering-asoslari',
    title: 'Prompt engineering asoslari: AI\'dan to\'g\'ri javob olish',
    description:
      "Prompt engineering nima va AI'dan sifatli natija olish uchun prompt qanday yoziladi. O'zbek tilida amaliy misollar bilan qo'llanma.",
    keywords: [
      'prompt engineering', 'prompt yozish', 'prompt engineering o\'zbek',
      'ai prompt', 'chatgpt prompt', 'yaxshi prompt qanday yoziladi', 'ai bilan ishlash',
    ],
    category: 'ai',
    date: '2026-06-28',
    readMinutes: 6,
    excerpt:
      "Bir xil AI ikki xil promptga ikki xil sifatda javob beradi. To'g'ri prompt yozishni o'rganamiz.",
    blocks: [
      { type: 'p', text: "Prompt engineering — sun'iy intellektga shunday ko'rsatma berishki, u aynan siz xohlagan, sifatli natijani qaytarsin. Bir xil model yomon promptga umumiy, yaxshi promptga aniq javob beradi. Bu — alohida ko'nikma." },
      { type: 'h2', text: 'Yaxshi promptning 4 ustuni' },
      { type: 'ul', items: [
        "Kontekst — AI kim uchun va nima sharoitda ishlayotganini bilsin",
        "Aniq vazifa — \"yaxshilab yoz\" emas, \"3 ta bandda, rasmiy uslubda yoz\"",
        "Format — natija qanday ko'rinishda bo'lishi kerak (ro'yxat, jadval, kod)",
        "Misol — bitta namuna ko'rsatish natijani keskin yaxshilaydi",
      ] },
      { type: 'h2', text: 'Yomon va yaxshi prompt — taqqoslash' },
      { type: 'p', text: "Yomon: \"Menga funksiya yoz.\" Yaxshi: \"JavaScript'da massivdagi takrorlanmas elementlarni qaytaradigan funksiya yoz. Toza kod, izohlar o'zbekcha, ES6 sintaksisi ishlat.\" Ikkinchisi har doim foydaliroq natija beradi." },
      { type: 'h2', text: 'Rol berish texnikasi' },
      { type: 'p', text: "AI'ga rol bering: \"Sen tajribali senior backend dasturchisan.\" Bu modelni mos kontekstga sozlaydi va javob sifatini oshiradi. Kod review, arxitektura yoki o'qitish vazifalarida ayniqsa foydali." },
      { type: 'h2', text: 'Iteratsiya — bir martada to\'g\'ri bo\'lishi shart emas' },
      { type: 'p', text: "Birinchi javob ideal bo'lmasa, \"qisqartir\", \"xatoliklarni ushla\", \"o'zbekcha izoh qo'sh\" kabi aniqlovchi promptlar bilan natijani bosqichma-bosqich yaxshilang." },
      { type: 'cta', text: "Tayyor, sinovdan o'tgan promptlarni Prompt kutubxonasidan oling", href: '/prompts', label: 'Prompt kutubxonasi' },
    ],
    faq: [
      { q: 'Prompt engineering o\'rganish qiyinmi?', a: "Yo'q, asoslarni bir kunda o'zlashtirish mumkin. Asosiysi — ko'p mashq qilish va natijalarni taqqoslash." },
    ],
    related: [
      { label: 'Eng yaxshi AI dasturlash vositalari', href: '/blog/eng-yaxshi-ai-dasturlash-vositalari' },
      { label: 'ChatGPT qo\'llanmasi', href: '/blog/chatgpt-nima-qanday-foydalanish' },
      { label: 'Claude Code qo\'llanmasi', href: '/blog/claude-code-nima-qollanma' },
    ],
  },

  {
    slug: 'dasturlashni-qayerdan-boshlash',
    title: 'Dasturlashni 0 dan qayerdan boshlash kerak',
    description:
      "Dasturlashni noldan boshlamoqchimisiz? Qaysi tilni tanlash, yo'l xaritasi va birinchi qadamlar — o'zbek tilida amaliy maslahatlar.",
    keywords: [
      'dasturlashni qayerdan boshlash', '0 dan dasturlashni o\'rganish',
      'dasturlashni o\'rganish', 'dasturchi bo\'lish', 'qaysi dasturlash tilini o\'rganish',
      'kodlashni o\'rganish', 'it ga kirish',
    ],
    category: 'career',
    date: '2026-06-28',
    readMinutes: 9,
    excerpt:
      "Dasturlashni boshlashda eng ko'p qiynaydigan savol — qayerdan boshlash? Aniq yo'l xaritasini beramiz.",
    blocks: [
      { type: 'p', text: "Dasturlashni boshlamoqchi bo'lganlarni eng ko'p qiynaydigan narsa — ma'lumot ko'pligi va qayerdan boshlashni bilmaslik. Bu maqolada chalkashликsiz, aniq yo'l xaritasini beramiz." },
      { type: 'h2', text: '1-qadam: Maqsadingizni aniqlang' },
      { type: 'p', text: "Veb-sayt yaratmoqchimisiz, mobil ilovami yoki sun'iy intellekt? Maqsad birinchi tilni tanlashda yo'l ko'rsatadi. Aniq maqsad bo'lmasa, veb-dasturlashdan boshlash eng oson va natijasi tez ko'rinadigan yo'nalish." },
      { type: 'h2', text: '2-qadam: Birinchi tilni tanlang' },
      { type: 'ul', items: [
        "Veb-sayt (frontend) — HTML, CSS, keyin JavaScript",
        "Backend / server — Node.js yoki Python",
        "Sun'iy intellekt va ma'lumotlar — Python",
        "Mobil ilova — React Native yoki Flutter",
      ] },
      { type: 'h2', text: '3-qadam: Asoslarni mustahkamlang' },
      { type: 'p', text: "Yangi boshlovchilar tez-tez bir tildan ikkinchisiga sakraydi va hech birini chuqur o'rganmaydi. Bitta tilni tanlang va undagi o'zgaruvchilar, sikllar, funksiyalar va ma'lumot tuzilmalarini mustahkam egallang. Bu asoslar barcha tillarda bir xil." },
      { type: 'h2', text: '4-qadam: Loyiha qiling' },
      { type: 'p', text: "Faqat video ko'rish bilan dasturchi bo'lib bo'lmaydi. Har bir mavzudan keyin kichik loyiha qiling: kalkulyator, to-do ro'yxati, oddiy sayt. Amaliyot — bilimni mustahkamlovchi yagona yo'l." },
      { type: 'h2', text: '5-qadam: AI vositalaridan foydalaning' },
      { type: 'p', text: "Bugungi dasturchilar Claude Code, Cursor va GitHub Copilot kabi AI vositalaridan foydalanadi. Ularni erta o'rganish — zamonaviy bozorda katta ustunlik. Lekin avval asoslarni o'zingiz tushuning, AI'ni ko'mak sifatida ishlating, mutlaq tayanch emas." },
      { type: 'cta', text: "O'zbek tilidagi dasturlash kurslari bilan amaliy boshlang", href: '/courses', label: 'Kurslarni ko\'rish' },
    ],
    faq: [
      { q: 'Dasturlashni o\'rganish uchun matematika kuchli bo\'lishi shartmi?', a: "Veb-dasturlash uchun oddiy maktab matematikasi yetarli. Sun'iy intellekt va algoritmlar uchun esa chuqurroq bilim kerak bo'ladi." },
      { q: 'Necha oyda dasturchi bo\'lish mumkin?', a: "Kuniga 2-3 soat muntazam o'rgansangiz, 6-12 oyda birinchi ish darajasiga yetish mumkin." },
    ],
    related: [
      { label: 'Qaysi dasturlash tilini o\'rganish kerak', href: '/blog/qaysi-dasturlash-tilini-organish' },
      { label: 'IT kasblari va maoshlari', href: '/blog/it-kasblari-va-maoshlari' },
      { label: 'JavaScript kurslari', href: '/courses/category/javascript' },
    ],
  },

  {
    slug: 'eng-yaxshi-ai-dasturlash-vositalari',
    title: 'Eng yaxshi AI dasturlash vositalari (2026)',
    description:
      "2026-yilda dasturchilar uchun eng yaxshi AI vositalari: Claude Code, Cursor, GitHub Copilot va boshqalar. Taqqoslash va tanlash bo'yicha o'zbekcha qo'llanma.",
    keywords: [
      'eng yaxshi ai dasturlash vositalari', 'ai dasturlash vositalari',
      'github copilot', 'claude code', 'cursor', 'ai coding tools o\'zbek',
      'dasturchilar uchun ai', 'sun\'iy intellekt dasturlash',
    ],
    category: 'ai',
    date: '2026-06-28',
    readMinutes: 8,
    excerpt:
      "AI vositalari dasturchi ishini tubdan o'zgartirdi. 2026-yilning eng kuchli vositalarini taqqoslaymiz.",
    blocks: [
      { type: 'p', text: "Sun'iy intellekt dasturchi kasbini tubdan o'zgartirdi. To'g'ri vositani tanlash — unumdorlikni bir necha barobar oshiradi. Quyida 2026-yilning eng kuchli AI dasturlash vositalarini ko'rib chiqamiz." },
      { type: 'h2', text: '1. Claude Code' },
      { type: 'p', text: "Anthropic'ning terminal asosidagi agenti. Butun loyihani tushunadi, fayllarni o'zi tahrirlaydi va buyruqlar bajaradi. Katta refactoring va avtomatlashtirilgan vazifalar uchun eng kuchli tanlovlardan biri." },
      { type: 'h2', text: '2. Cursor' },
      { type: 'p', text: "VS Code asosidagi AI muharrir. Real vaqtdagi takliflar va Composer orqali ko'p faylli o'zgarishlar bilan kuchli. Vizual muharrir yoqtiradiganlar uchun ideal." },
      { type: 'h2', text: '3. GitHub Copilot' },
      { type: 'p', text: "Eng keng tarqalgan avtotugallash vositasi. Ko'plab muharrirlarga integratsiya bo'ladi va kod yozayotganda qator-qator taklif beradi. Yangi boshlovchilar uchun qulay kirish nuqtasi." },
      { type: 'h2', text: 'Qaysi birini tanlash kerak?' },
      { type: 'ul', items: [
        "Terminal va avtomatlashtirish — Claude Code",
        "Vizual muharrir + real vaqt yordam — Cursor",
        "Oddiy avtotugallash — GitHub Copilot",
        "Tez prototip (vibe coding) — Cursor yoki Claude Code",
      ] },
      { type: 'h2', text: 'Muhim eslatma' },
      { type: 'p', text: "AI vositalari kuchli, lekin ular dasturlash asoslarini bilishni o'rnini bosmaydi. Avval o'zingiz tushunib, keyin AI'ni tezlashtiruvchi vosita sifatida ishlating. Eng yaxshi natija — bilim va AI'ning birikuvi." },
      { type: 'cta', text: "Bu vositalar uchun tayyor promptlarni Prompt kutubxonasidan oling", href: '/prompts', label: 'Prompt kutubxonasi' },
    ],
    faq: [
      { q: 'AI dasturchilarni ishsiz qoldiradimi?', a: "Yo'q. AI rutina ishlarni tezlashtiradi, lekin masalani tushunish, arxitektura va qaror qabul qilish baribir insondan talab qilinadi. AI'dan foydalana oladigan dasturchilar afzal." },
      { q: 'Bu vositalardan birini bepul sinab ko\'rsam bo\'ladimi?', a: "Ha, ularning ko'pchiligida bepul reja yoki sinov muddati mavjud." },
    ],
    related: [
      { label: 'Claude Code qo\'llanmasi', href: '/blog/claude-code-nima-qollanma' },
      { label: 'Cursor AI qo\'llanmasi', href: '/blog/cursor-ai-qollanma' },
    ],
  },
  {
    slug: 'chatgpt-nima-qanday-foydalanish',
    title: 'ChatGPT nima va undan qanday foydalanish kerak',
    description:
      "ChatGPT nima, qanday ishlaydi va undan o'qish, ish va dasturlashda qanday foydalanish mumkin. O'zbek tilida to'liq boshlang'ich qo'llanma.",
    keywords: [
      'chatgpt', 'chatgpt nima', 'chatgpt qanday ishlatiladi', 'chatgpt o\'zbekcha',
      'chatgpt o\'zbek tilida', 'chat gpt', 'openai', 'ai chat', 'suniy intellekt chat',
    ],
    category: 'ai',
    date: '2026-07-04',
    readMinutes: 7,
    excerpt:
      "ChatGPT — dunyodagi eng mashhur AI yordamchi. Uni o'qish, ish va dasturlashda qanday samarali ishlatishni o'rganamiz.",
    blocks: [
      { type: 'p', text: "ChatGPT — OpenAI kompaniyasi yaratgan sun'iy intellekt asosidagi suhbat yordamchisi. U savollarga javob beradi, matn yozadi, kod tushuntiradi, tarjima qiladi va deyarli har qanday intellektual vazifada ko'maklashadi. Eng muhimi — u o'zbek tilini ham tushunadi." },
      { type: 'h2', text: 'ChatGPT qanday ishlaydi?' },
      { type: 'p', text: "ChatGPT — katta til modeli (LLM). U internetdagi milliardlab matnlardan o'rganib, savolingizga eng mos javobni so'zma-so'z bashorat qilib quradi. Bu shuni anglatadiki, u \"bilim bazasi\" emas — ba'zan ishonchli ohangda xato ma'lumot ham berishi mumkin. Shuning uchun muhim faktlarni doim tekshiring." },
      { type: 'h2', text: "Qanday boshlash mumkin?" },
      { type: 'ul', items: [
        "chat.openai.com saytiga kiring yoki mobil ilovasini yuklab oling",
        "Bepul hisob oching — asosiy imkoniyatlar bepul rejada ham bor",
        "Savolingizni oddiy tilda, xuddi insonga yozgandek yozing",
        "Javob yoqmasa — aniqlashtiring: \"qisqartir\", \"misol bilan tushuntir\"",
      ] },
      { type: 'h2', text: "O'qishda qanday foydalansa bo'ladi?" },
      { type: 'p', text: "ChatGPT — 24/7 ishlaydigan shaxsiy repetitor. Tushunmagan mavzuni \"menga 12 yoshli bolaga tushuntirgandek tushuntir\" deb so'rang. Mavzu bo'yicha test savollari tuzdiring, insho rejasini oling yoki ingliz tilida suhbat mashqi qiling. Lekin tayyor javobni ko'chirish o'rniga tushunish uchun ishlating — aks holda o'zingizga zarar qilasiz." },
      { type: 'h2', text: 'Dasturlashda ChatGPT' },
      { type: 'p', text: "Dasturchilar ChatGPT'dan kod tushuntirish, xato (bug) topish, kichik funksiyalar yozish va yangi texnologiyani tez o'rganish uchun foydalanadi. Jiddiy loyihalar uchun esa Claude Code va Cursor kabi maxsus AI dasturlash vositalari samaraliroq — ular butun loyihangizni ko'ra oladi." },
      { type: 'h2', text: 'Yaxshi savol berish sirlari' },
      { type: 'ul', items: [
        "Kontekst bering: kim ekaningiz va maqsadingizni ayting",
        "Formatni belgilang: \"jadval qilib ber\", \"5 banddan oshmasin\"",
        "Rol bering: \"sen tajribali matematika o'qituvchisisan\"",
        "Bosqichma-bosqich so'rang — bitta ulkan savoldan ko'ra kichik savollar zanjiri yaxshiroq",
      ] },
      { type: 'cta', text: "AI bilan ishlashni chuqurroq o'rganmoqchimisiz? Amaliy AI kurslarimizni ko'ring", href: '/courses/category/ai', label: 'AI kurslari' },
    ],
    faq: [
      { q: 'ChatGPT bepulmi?', a: "Ha, asosiy versiyasi bepul. Pullik rejada kuchliroq modellar, tezroq javob va qo'shimcha imkoniyatlar beriladi." },
      { q: 'ChatGPT o\'zbek tilini biladimi?', a: "Ha, ChatGPT o'zbek tilida savol tushunadi va javob beradi. Murakkab texnik mavzularda inglizcha so'rov ba'zan aniqroq natija beradi." },
      { q: 'ChatGPT bergan ma\'lumotga ishonsa bo\'ladimi?', a: "Ehtiyot bo'ling — u ba'zan ishonchli ohangda xato ma'lumot beradi (gallyutsinatsiya). Muhim faktlarni mustaqil manbadan tekshiring." },
    ],
    related: [
      { label: 'Prompt engineering asoslari', href: '/blog/prompt-engineering-asoslari' },
      { label: 'Eng yaxshi AI dasturlash vositalari', href: '/blog/eng-yaxshi-ai-dasturlash-vositalari' },
    ],
  },

  {
    slug: 'suniy-intellekt-nima',
    title: "Sun'iy intellekt nima? Oddiy tilda tushuntiramiz",
    description:
      "Sun'iy intellekt (AI) nima, qanday ishlaydi va hayotimizni qanday o'zgartirmoqda. Machine learning, neyron tarmoqlar va AI kasblari haqida o'zbek tilida.",
    keywords: [
      'sun\'iy intellekt', 'sun\'iy intellekt nima', 'ai nima', 'suniy intellekt',
      'machine learning nima', 'neyron tarmoq', 'ai o\'rganish', 'sun\'iy intellekt o\'zbek tilida',
      'ai kasblari',
    ],
    category: 'ai',
    date: '2026-07-04',
    readMinutes: 8,
    excerpt:
      "AI atrofimizda: telefon kamerasidan tortib ChatGPT'gacha. Sun'iy intellekt aslida nima ekanini oddiy tilda tushuntiramiz.",
    blocks: [
      { type: 'p', text: "Sun'iy intellekt (AI — Artificial Intelligence) — kompyuterlarning inson aqli talab qiladigan vazifalarni bajarish qobiliyati: tushunish, o'rganish, xulosa chiqarish va qaror qabul qilish. Siz undan har kuni foydalanasiz — telefon kamerasi yuzni taniganda, YouTube video tavsiya qilganda, navigator eng qisqa yo'lni topganda." },
      { type: 'h2', text: "Machine Learning — AI'ning yuragi" },
      { type: 'p', text: "Zamonaviy AI'ning asosida mashinaviy o'rganish (machine learning) yotadi. An'anaviy dasturda dasturchi qoidalarni qo'lda yozadi. Machine learning'da esa kompyuterga minglab misollar ko'rsatiladi va u qonuniyatlarni o'zi topadi. Masalan, millionlab mushuk rasmini ko'rgan model yangi rasmda mushukni o'zi taniydi." },
      { type: 'h2', text: 'Neyron tarmoqlar va chuqur o\'rganish' },
      { type: 'p', text: "Neyron tarmoqlar — inson miyasidagi neyronlardan ilhomlangan matematik tuzilmalar. Ko'p qatlamli neyron tarmoqlar bilan ishlash chuqur o'rganish (deep learning) deb ataladi. ChatGPT, Claude va Gemini kabi zamonaviy AI'lar — trilliondan ortiq parametrga ega ulkan neyron tarmoqlardir." },
      { type: 'h2', text: "AI hozir nimalarga qodir?" },
      { type: 'ul', items: [
        "Matn: maqola yozish, tarjima, xulosa chiqarish (ChatGPT, Claude)",
        "Kod: dastur yozish va xatolarni topish (Claude Code, Cursor, Copilot)",
        "Rasm va video: matndan rasm/video yaratish",
        "Ovoz: nutqni tanish va sintez qilish",
        "Tibbiyot: kasalliklarni erta aniqlash",
      ] },
      { type: 'h2', text: "AI sohasida qanday kasblar bor?" },
      { type: 'p', text: "AI muhandisi, ma'lumotlar olimi (data scientist), ML muhandisi, prompt muhandisi va AI mahsulot menejeri — bular dunyoda eng tez o'sayotgan va eng yuqori maosh to'lanadigan kasblar qatorida. O'zbekistonda ham bu mutaxassislarga talab yildan-yilga oshmoqda." },
      { type: 'h2', text: "AI'ni o'rganishni nimadan boshlash kerak?" },
      { type: 'p', text: "Birinchi qadam — dasturlash asoslari, ayniqsa Python. Keyin matematika (ehtimollik, chiziqli algebra) va machine learning kutubxonalari. Parallel ravishda tayyor AI vositalaridan (ChatGPT, Claude) samarali foydalanishni o'rganing — bu har qanday kasbda ustunlik beradi." },
      { type: 'cta', text: "AI va zamonaviy dasturlashni o'zbek tilida o'rganing", href: '/courses/category/ai', label: 'AI kurslarini ko\'rish' },
    ],
    faq: [
      { q: 'Sun\'iy intellekt insonni ishsiz qoldiradimi?', a: "Ba'zi rutina vazifalar avtomatlashadi, lekin yangi kasblar ham paydo bo'lmoqda. Eng xavfsiz yo'l — AI'dan foydalanishni o'rganish: AI sizni emas, AI'ni biladigan mutaxassis siz o'rningizni egallashi mumkin." },
      { q: 'AI o\'rganish uchun kuchli matematika kerakmi?', a: "Tayyor AI vositalaridan foydalanish uchun matematika shart emas. AI modellarini yaratish uchun esa ehtimollik va chiziqli algebra asoslari kerak bo'ladi." },
    ],
    related: [
      { label: 'ChatGPT qo\'llanmasi', href: '/blog/chatgpt-nima-qanday-foydalanish' },
      { label: 'Eng yaxshi AI dasturlash vositalari', href: '/blog/eng-yaxshi-ai-dasturlash-vositalari' },
    ],
  },

  {
    slug: 'python-organish-yol-xaritasi',
    title: "Python o'rganish: noldan boshlovchilar uchun yo'l xaritasi",
    description:
      "Python dasturlash tilini noldan o'rganish bo'yicha to'liq yo'l xaritasi: nimadan boshlash, qancha vaqt ketadi va qanday loyihalar qilish kerak. O'zbek tilida.",
    keywords: [
      'python o\'rganish', 'python darslari', 'python o\'zbek tilida', 'python kurslari',
      'python noldan', 'python dasturlash', 'python yo\'l xaritasi', 'python nima uchun kerak',
    ],
    category: 'ai',
    date: '2026-07-04',
    readMinutes: 9,
    excerpt:
      "Python — dunyodagi eng mashhur va o'rganish eng oson dasturlash tili. Noldan professional darajagacha yo'l xaritasi.",
    blocks: [
      { type: 'p', text: "Python — dunyoda eng ko'p ishlatiladigan dasturlash tillaridan biri va yangi boshlovchilar uchun eng qulay tanlov. Sintaksisi oddiy ingliz tiliga o'xshaydi, shuning uchun birinchi dasturingizni bir necha daqiqada yozasiz. Python sun'iy intellekt, ma'lumotlar tahlili, veb-backend va avtomatlashtirishda yetakchi til." },
      { type: 'h2', text: 'Nega aynan Python?' },
      { type: 'ul', items: [
        "Eng oson sintaksis — kod o'qish oddiy matn o'qishga yaqin",
        "AI va data science'ning asosiy tili (TensorFlow, PyTorch, pandas)",
        "Backend dasturlash (Django, FastAPI)",
        "Avtomatlashtirish va skriptlar — rutina ishlarni kompyuterga topshirish",
        "Katta hamjamiyat — har qanday savolga javob topiladi",
      ] },
      { type: 'h2', text: '1-bosqich: Asoslar (1–2 oy)' },
      { type: 'p', text: "O'zgaruvchilar, ma'lumot turlari (son, satr, ro'yxat, lug'at), shart operatorlari (if/else), sikllar (for/while) va funksiyalar. Har kuni kamida 1 soat mashq qiling — nazariyani o'qish emas, kod yozish muhim. Kichik masalalar yeching: kalkulyator, son taxmin o'yini, matn tahlilchisi." },
      { type: 'h2', text: "2-bosqich: Chuqurlashish (2–3 oy)" },
      { type: 'p', text: "Obyektga yo'naltirilgan dasturlash (OOP), fayllar bilan ishlash, xatolarni boshqarish (try/except), modullar va pip orqali kutubxonalar o'rnatish. Shu bosqichda birinchi haqiqiy loyihangizni qiling: masalan, xarajatlarni hisoblovchi dastur yoki oddiy Telegram bot." },
      { type: 'h2', text: "3-bosqich: Yo'nalish tanlash" },
      { type: 'ul', items: [
        "AI / Data Science — pandas, NumPy, keyin machine learning",
        "Backend — FastAPI yoki Django bilan API yaratish",
        "Avtomatlashtirish — skriptlar, veb-scraping, bot yaratish",
        "Telegram botlar — O'zbekistonda talab katta yo'nalish",
      ] },
      { type: 'h2', text: "AI vositalari bilan tezroq o'rganing" },
      { type: 'p', text: "Kod yozayotganda tushunmagan qatorni ChatGPT yoki Claude'dan so'rang: \"bu kod nima qilyapti, qatorma-qator tushuntir\". Xato chiqsa, xato matnini AI'ga ko'rsating. Bu usul o'rganish tezligini sezilarli oshiradi — lekin kodni avval o'zingiz yozib ko'ring, keyin AI'dan tekshirtiring." },
      { type: 'cta', text: "Python va AI'ni o'zbek tilida amaliy o'rganing", href: '/courses', label: 'Kurslarni ko\'rish' },
    ],
    faq: [
      { q: 'Python o\'rganish uchun qancha vaqt kerak?', a: "Kuniga 1-2 soat shug'ullansangiz, 2-3 oyda asoslarni, 6-9 oyda ishga tayyor darajani egallash mumkin." },
      { q: 'Python bilan qancha maosh olish mumkin?', a: "O'zbekistonda junior Python dasturchi taxminan 5-10 mln so'm, tajribali mutaxassis 15-30 mln so'm va undan ko'p oladi. Xorijiy kompaniyalarda masofaviy ishlashda esa ancha yuqori." },
      { q: 'Python yoki JavaScript — qaysi birini birinchi o\'rganish kerak?', a: "AI va ma'lumotlar tahlili qiziq bo'lsa — Python. Veb-sayt va frontend qiziq bo'lsa — JavaScript. Ikkalasi ham boshlovchi uchun yaxshi tanlov." },
    ],
    related: [
      { label: 'Dasturlashni qayerdan boshlash', href: '/blog/dasturlashni-qayerdan-boshlash' },
      { label: 'Qaysi dasturlash tilini o\'rganish kerak', href: '/blog/qaysi-dasturlash-tilini-organish' },
    ],
  },

  {
    slug: 'it-kasblari-va-maoshlari',
    title: "IT kasblari va maoshlari: qaysi yo'nalishni tanlash kerak (2026)",
    description:
      "O'zbekistonda va dunyoda IT kasblari, ularning maoshlari va talab darajasi: frontend, backend, AI, kiberxavfsizlik, dizayn. Qaysi IT kasb sizga mos?",
    keywords: [
      'it kasblari', 'it kasblar', 'dasturchi maoshi', 'it maosh', 'dasturchi oyligi',
      'it sohasida ish', 'qaysi it kasbini tanlash', 'programmist maoshi', 'it mutaxassisliklari',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 10,
    excerpt:
      "IT — bu faqat dasturchi degani emas. Eng talab yuqori IT kasblari, ularning maoshlari va kirish yo'llarini taqqoslaymiz.",
    blocks: [
      { type: 'p', text: "IT sohasi — O'zbekistonda eng tez o'sayotgan va eng yuqori maosh to'lanadigan sohalardan biri. IT Park rezidentlari soni yildan-yilga oshmoqda, xorijiy kompaniyalar masofaviy ishchilarni yollamoqda. Lekin IT — bu faqat \"dasturchi\" degani emas. Keling, asosiy yo'nalishlarni ko'rib chiqamiz." },
      { type: 'h2', text: 'Frontend dasturchi' },
      { type: 'p', text: "Saytning foydalanuvchi ko'radigan qismini yaratadi. Texnologiyalar: HTML, CSS, JavaScript, React. Kirish eng oson yo'nalishlardan biri — natija darhol ko'rinadi. O'zbekistonda junior 4-8 mln, middle 10-20 mln, senior 25+ mln so'm oladi." },
      { type: 'h2', text: 'Backend dasturchi' },
      { type: 'p', text: "Server, ma'lumotlar bazasi va biznes mantiqni quradi. Texnologiyalar: Node.js, Python, Java, Go. Frontend'ga qaraganda kirish biroz murakkabroq, lekin maosh o'rtacha yuqoriroq va masshtabli tizimlar tajribasi juda qadrlanadi." },
      { type: 'h2', text: 'AI / Machine Learning muhandisi' },
      { type: 'p', text: "Eng tez o'sayotgan va eng yuqori maoshli yo'nalish. AI modellar bilan ishlash, ularni mahsulotga integratsiya qilish. Python + matematika asoslari kerak. Xorijda senior AI muhandislari yiliga $150,000+ oladi; O'zbekistonda ham talab keskin oshmoqda." },
      { type: 'h2', text: 'Boshqa talab yuqori yo\'nalishlar' },
      { type: 'ul', items: [
        "Kiberxavfsizlik — tizimlarni himoya qilish, penetration testing. Kadr yetishmovchiligi eng katta sohalardan",
        "Mobil dasturchi — iOS/Android ilovalar (React Native, Flutter)",
        "DevOps — infratuzilma va avtomatlashtirish, tajribali mutaxassis juda qimmat",
        "UX/UI dizayner — kod yozmasdan IT'ga kirish yo'li",
        "QA muhandis (tester) — sifat nazorati, IT'ga kirishning oson eshigi",
        "Data Analyst — ma'lumotlar tahlili, SQL + Excel + Python",
      ] },
      { type: 'h2', text: "Qaysi birini tanlash kerak?" },
      { type: 'p', text: "O'zingizga savol bering: vizual natija yoqadimi (frontend, dizayn), mantiqiy tizimlar qiziqmi (backend, DevOps), yoki tahlil va algoritmlarmi (AI, data)? Eng muhimi — tez boshlang va amaliyot qiling. Yo'nalishni keyin o'zgartirish mumkin, asoslar hamma yerda bir xil." },
      { type: 'h2', text: "AI davri: hamma IT kasblariga ta'siri" },
      { type: 'p', text: "2026-yilda har qanday IT mutaxassisdan AI vositalari bilan ishlash kutiladi. Claude Code, Cursor va Copilot bilan ishlay oladigan dasturchi oddiy dasturchidan bir necha barobar samaraliroq. Shuning uchun qaysi yo'nalishni tanlamang, AI vositalarini parallel o'rganing." },
      { type: 'cta', text: "IT karyerangizni bugun boshlang — amaliy kurslar o'zbek tilida", href: '/courses', label: 'Kurslarni ko\'rish' },
    ],
    faq: [
      { q: 'IT sohasiga oliy ma\'lumotsiz kirish mumkinmi?', a: "Ha. IT'da diplom emas, amaliy ko'nikma va portfolio hal qiladi. Ko'plab muvaffaqiyatli dasturchilar o'zi mustaqil o'rgangan." },
      { q: 'IT o\'rganishni necha yoshda boshlash mumkin?', a: "Yosh chegarasi yo'q — 14 yoshda ham, 40 yoshda ham boshlash mumkin. Muhimi — muntazamlik va amaliyot." },
      { q: 'Ingliz tili bilmasdan IT\'da ishlash mumkinmi?', a: "Boshlash mumkin, lekin o'sish uchun ingliz tili zarur — hujjatlar, xatolar va eng yaxshi manbalar inglizcha. IT bilan parallel o'rganing." },
    ],
    related: [
      { label: 'Dasturlashni qayerdan boshlash', href: '/blog/dasturlashni-qayerdan-boshlash' },
      { label: 'Freelance qanday boshlanadi', href: '/blog/freelance-dasturchi-qanday-boshlash' },
    ],
  },

  {
    slug: 'qaysi-dasturlash-tilini-organish',
    title: "Qaysi dasturlash tilini o'rganish kerak? (2026 tahlili)",
    description:
      "2026-yilda qaysi dasturlash tilini o'rganish kerak: JavaScript, Python, TypeScript, Go taqqoslash. Maqsadingizga qarab to'g'ri tanlov qilish qo'llanmasi.",
    keywords: [
      'qaysi dasturlash tilini o\'rganish', 'eng yaxshi dasturlash tili', 'dasturlash tillari',
      'dasturlash tili tanlash', 'javascript yoki python', 'eng mashhur dasturlash tillari 2026',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 8,
    excerpt:
      "\"Qaysi tilni o'rganay?\" — har bir boshlovchining birinchi savoli. Javob maqsadingizga bog'liq. Keling, aniqlaymiz.",
    blocks: [
      { type: 'p', text: "Dasturlash tilini tanlash — ko'plab boshlovchilarni haftalab ushlab turadigan savol. Yaxshi yangilik: birinchi tanlov hal qiluvchi emas. Dasturlash mantig'ini bir tilda o'rgansangiz, ikkinchisiga o'tish ancha oson. Yomon yangilik: noto'g'ri maqsad bilan tanlangan til motivatsiyani o'ldirishi mumkin. Shuning uchun tildan emas — maqsaddan boshlang." },
      { type: 'h2', text: 'JavaScript — veb-ning tili' },
      { type: 'p', text: "Agar sayt va veb-ilovalar yaratmoqchi bo'lsangiz, JavaScript — majburiy tanlov, chunki brauzerlar faqat uni tushunadi. Bitta til bilan frontend (React), backend (Node.js) va hatto mobil ilova (React Native) yozish mumkin. Ish e'lonlari soni bo'yicha doim yetakchi." },
      { type: 'h2', text: "Python — AI va soddalik" },
      { type: 'p', text: "Eng oson o'rganiladigan jiddiy til. Sun'iy intellekt, ma'lumotlar tahlili va avtomatlashtirishning shubhasiz yetakchisi. Agar AI sohasi qiziqtirsa yoki \"dasturlash menga to'g'ri kelarmikan\" deb ikkilanayotgan bo'lsangiz — Python'dan boshlang." },
      { type: 'h2', text: 'TypeScript — professional JavaScript' },
      { type: 'p', text: "JavaScript'ning tiplar qo'shilgan versiyasi. Zamonaviy kompaniyalarning aksariyati frontend'da TypeScript talab qiladi. Uni to'g'ridan-to'g'ri emas, avval JavaScript'ni o'rganib, keyin o'tish tavsiya qilinadi." },
      { type: 'h2', text: 'Tez xulosa — maqsabga qarab tanlang' },
      { type: 'ul', items: [
        "Veb-sayt va ilovalar → JavaScript (keyin TypeScript + React)",
        "AI, data science, avtomatlashtirish → Python",
        "Telegram botlar → Python yoki JavaScript",
        "Mobil ilovalar → JavaScript (React Native) yoki Dart (Flutter)",
        "Yuqori yuklamali tizimlar → Go yoki Java (birinchi til sifatida tavsiya etilmaydi)",
      ] },
      { type: 'h2', text: 'Eng katta xato' },
      { type: 'p', text: "Eng katta xato — tillar orasida sakrab yurish. Bir oyda JavaScript, keyin Python, keyin yana boshqasi... Bunday yo'l hech qayerga olib bormaydi. Bittasini tanlang, kamida 3-4 oy chuqur shug'ullaning va kichik loyihalar qiling. Asoslar (o'zgaruvchi, sikl, funksiya, ma'lumot tuzilmalari) barcha tillarda bir xil." },
      { type: 'cta', text: "JavaScript, Python va boshqa yo'nalishlar bo'yicha o'zbek tilidagi kurslar", href: '/courses', label: 'Kurslarni ko\'rish' },
    ],
    faq: [
      { q: 'Eng yuqori maosh qaysi tilda?', a: "Til emas, tajriba va soha hal qiladi. Hozirda AI/ML (Python), yuqori yuklamali backend (Go, Java) va senior frontend (TypeScript) eng yuqori haq to'lanadiganlar qatorida." },
      { q: 'Bir vaqtda ikki tilni o\'rgansam bo\'ladimi?', a: "Boshlovchi uchun tavsiya etilmaydi — chalkashlik va sekin progress bo'ladi. Avval bittasini mustahkam egallang." },
    ],
    related: [
      { label: 'Python o\'rganish yo\'l xaritasi', href: '/blog/python-organish-yol-xaritasi' },
      { label: 'JavaScript kurslari', href: '/courses/category/javascript' },
    ],
  },

  {
    slug: 'git-github-asoslari',
    title: 'Git va GitHub nima? Boshlovchilar uchun qo\'llanma',
    description:
      "Git va GitHub nima, nima uchun har bir dasturchiga kerak va qanday boshlash mumkin. Asosiy buyruqlar va portfolio yaratish — o'zbek tilida.",
    keywords: [
      'github nima', 'git nima', 'git o\'rganish', 'github qanday ishlatiladi',
      'git buyruqlari', 'github portfolio', 'version control', 'git o\'zbek tilida',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 7,
    excerpt:
      "Git'siz zamonaviy dasturchi bo'lish mumkin emas. Versiya nazorati nima va GitHub'da portfolio qanday quriladi — noldan tushuntiramiz.",
    blocks: [
      { type: 'p', text: "Git — kod o'zgarishlar tarixini saqlaydigan versiya nazorati tizimi. GitHub esa — Git loyihalarini internetda saqlash va jamoa bo'lib ishlash platformasi. Fayl nomini \"loyiha_final_eng_oxirgi_2.zip\" deb saqlagan bo'lsangiz — Git aynan shu muammoni professional hal qiladi." },
      { type: 'h2', text: 'Git nima uchun kerak?' },
      { type: 'ul', items: [
        "Har bir o'zgarish tarixda saqlanadi — istalgan holatga qaytish mumkin",
        "Jamoa bir loyihada bir vaqtda ishlaydi, o'zgarishlar avtomatik birlashadi",
        "Yangi funksiyani alohida branch'da sinab, tayyor bo'lgach qo'shasiz",
        "Ish beruvchilar GitHub profilingizga qarab tajribangizni baholaydi",
      ] },
      { type: 'h2', text: 'Asosiy tushunchalar' },
      { type: 'p', text: "Repository (repo) — loyihangiz va uning butun tarixi. Commit — o'zgarishlarning saqlangan \"surati\", har biri izoh bilan. Branch — asosiy koddan ajralib mustaqil ishlash liniyasi. Pull Request — o'zgarishlaringizni asosiy kodga qo'shish so'rovi, jamoa ko'rib chiqadi." },
      { type: 'h2', text: 'Birinchi qadamlar' },
      { type: 'ul', items: [
        "git init — papkada yangi repo yaratish",
        "git add . — o'zgargan fayllarni belgilash",
        "git commit -m \"izoh\" — o'zgarishlarni saqlash",
        "git push — GitHub'ga yuklash",
        "git pull — GitHub'dagi yangi o'zgarishlarni olish",
      ] },
      { type: 'h2', text: "GitHub — sizning portfolio'ngiz" },
      { type: 'p', text: "O'zbekistonda ham, xorijda ham ish beruvchilar birinchi navbatda GitHub profilingizni ochib ko'radi. Har bir o'quv loyihangizni GitHub'ga yuklang, README faylida loyiha nima qilishini yozing. Muntazam commit'lar (yashil kvadratchalar) — o'rganishga jiddiy yondashuvingizning eng yaxshi isboti." },
      { type: 'h2', text: 'AI vositalari va Git' },
      { type: 'p', text: "Claude Code va Cursor kabi AI vositalar Git bilan chambarchas ishlaydi: ular commit yaratadi, diff'larni tahlil qiladi va PR tavsifini yozadi. Git asoslarini bilish — bu vositalardan to'liq foydalanishning sharti." },
      { type: 'cta', text: "Dasturlashni amaliy loyihalar bilan o'rganing — har bir kurs portfolio uchun loyiha beradi", href: '/courses', label: 'Kurslarni ko\'rish' },
    ],
    faq: [
      { q: 'Git va GitHub bir narsami?', a: "Yo'q. Git — kompyuteringizda ishlaydigan versiya nazorati dasturi. GitHub — Git repolarini onlayn saqlaydigan platforma (GitLab, Bitbucket kabi muqobillari ham bor)." },
      { q: 'GitHub bepulmi?', a: "Ha, shaxsiy foydalanish uchun bepul — cheksiz ochiq va yopiq repolar yaratish mumkin." },
    ],
    related: [
      { label: 'Dasturlashni qayerdan boshlash', href: '/blog/dasturlashni-qayerdan-boshlash' },
      { label: 'IT kasblari va maoshlari', href: '/blog/it-kasblari-va-maoshlari' },
    ],
  },
  {
    slug: 'frontend-developer-qanday-bolish',
    title: 'Frontend developer qanday bo\'lish mumkin: to\'liq yo\'l xaritasi',
    description:
      "Frontend developer bo'lish uchun nimalarni o'rganish kerak: HTML, CSS, JavaScript, React. Bosqichma-bosqich yo'l xaritasi va ishga kirish maslahatlari.",
    keywords: [
      'frontend developer', 'frontend nima', 'frontend o\'rganish', 'frontend developer bo\'lish',
      'frontend yo\'l xaritasi', 'frontend kurslari', 'veb dasturchi bo\'lish', 'react o\'rganish',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 9,
    excerpt:
      "Frontend — IT'ga kirishning eng mashhur eshigi. HTML'dan React'gacha bo'lgan yo'lni bosqichma-bosqich chizamiz.",
    blocks: [
      { type: 'p', text: "Frontend developer — veb-saytning foydalanuvchi ko'radigan va bosadigan qismini yaratadigan mutaxassis. Siz hozir o'qiyotgan sahifa ham frontend dasturchi ishining natijasi. Bu yo'nalish IT'ga kirish uchun eng qulay: natija darhol ko'rinadi, resurslar ko'p va talab doimiy yuqori." },
      { type: 'h2', text: '1-bosqich: HTML va CSS (1–2 oy)' },
      { type: 'p', text: "HTML — sahifa skeleti (sarlavhalar, matnlar, rasmlar, formalar), CSS — uning ko'rinishi (ranglar, joylashuv, animatsiya). Flexbox va Grid'ni mustahkam o'rganing — zamonaviy layout shularga quriladi. Shu bosqichning o'zida bir nechta statik sayt yasang: shaxsiy sahifa, restoran menyusi, portfolio." },
      { type: 'h2', text: '2-bosqich: JavaScript (2–4 oy)' },
      { type: 'p', text: "Frontend'ning yuragi. O'zgaruvchilar, funksiyalar, massivlar, obyektlar, DOM bilan ishlash, event'lar va API'dan ma'lumot olish (fetch, async/await). Bu eng muhim bosqich — shoshilmang. To-do ilova, ob-havo ilovasi, quiz o'yini kabi loyihalar qiling." },
      { type: 'h2', text: '3-bosqich: React (2–3 oy)' },
      { type: 'p', text: "React — dunyodagi eng mashhur frontend kutubxonasi va O'zbekiston ish e'lonlarida ham №1 talab. Komponentlar, props, state, hooks (useState, useEffect) va router. Keyin Tailwind CSS bilan tez va chiroyli UI qurishni o'rganing." },
      { type: 'h2', text: '4-bosqich: Professional darajaga' },
      { type: 'ul', items: [
        "TypeScript — jiddiy kompaniyalarning standart talabi",
        "Next.js — React'ning to'liq framework'i (SSR, SEO)",
        "Git va GitHub — jamoada ishlash uchun majburiy",
        "AI vositalari — Cursor, Claude Code, Copilot bilan tez ishlash",
        "3-5 ta kuchli portfolio loyihasi",
      ] },
      { type: 'h2', text: 'Ishga qanday kirish mumkin?' },
      { type: 'p', text: "Portfolio tayyor bo'lgach: GitHub profilingizni tartibga keltiring, LinkedIn to'ldiring, mahalliy IT kompaniyalarning junior vakansiyalariga ariza bering. Birinchi ish uchun maosh emas, tajriba muhim — 6 oylik real ish tajribasi darajangizni keskin ko'taradi. Parallel ravishda freelance buyurtmalar bilan ham boshlash mumkin." },
      { type: 'cta', text: "Frontend'ni o'zbek tilida noldan o'rganing — HTML, CSS, JavaScript, React kurslari", href: '/courses/category/react', label: 'React kurslari' },
    ],
    faq: [
      { q: 'Frontend developer bo\'lish uchun qancha vaqt kerak?', a: "Kuniga 2-3 soat muntazam o'qisangiz, 8-12 oyda junior darajaga yetish real. Asosiy omil — amaliyot miqdori." },
      { q: 'Frontend uchun dizayn bilish kerakmi?', a: "Dizayner bo'lish shart emas, lekin tayyor dizaynni (Figma) aniq kodga o'tkaza olish — asosiy ko'nikmalardan biri." },
      { q: "Frontend'ning kelajagi bormi, AI uni almashtirmaydimi?", a: "AI kod yozishni tezlashtiradi, lekin mahsulot talablarini tushunish, arxitektura va sifat nazorati insonda qoladi. AI bilan ishlay oladigan frontendchilar aksincha qimmatlashdi." },
    ],
    related: [
      { label: 'JavaScript kurslari', href: '/courses/category/javascript' },
      { label: 'IT kasblari va maoshlari', href: '/blog/it-kasblari-va-maoshlari' },
    ],
  },

  {
    slug: 'backend-dasturlash-nima',
    title: 'Backend dasturlash nima? Server tomonini tushunamiz',
    description:
      "Backend nima, backend dasturchi nima ish qiladi va qanday o'rganish kerak: server, API, ma'lumotlar bazasi. Node.js bilan boshlash yo'l xaritasi.",
    keywords: [
      'backend nima', 'backend dasturlash', 'backend developer', 'backend o\'rganish',
      'server dasturlash', 'api nima', 'node.js o\'rganish', 'ma\'lumotlar bazasi',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 8,
    excerpt:
      "Sayt tugmasini bosganingizda \"parda ortida\" nima bo'ladi? Backend dunyosini oddiy tilda tushuntiramiz.",
    blocks: [
      { type: 'p', text: "Backend — veb-ilovaning foydalanuvchi ko'rmaydigan qismi: server, ma'lumotlar bazasi va biznes mantiq. Instagram'da rasm joylaganingizda uni saqlash, obunachilaringizga ko'rsatish, like'larni sanash — hammasi backend ishi. Frontend \"vitrina\" bo'lsa, backend — butun \"ombor va fabrika\"." },
      { type: 'h2', text: 'Backend nimalardan tashkil topgan?' },
      { type: 'ul', items: [
        "Server — so'rovlarni qabul qilib javob qaytaradigan dastur (Node.js, Python)",
        "Ma'lumotlar bazasi — ma'lumotlarni saqlash (MongoDB, PostgreSQL, MySQL)",
        "API — frontend va backend gaplashadigan \"til\" (REST, GraphQL)",
        "Autentifikatsiya — kim kirganini aniqlash va himoya (JWT, sessiyalar)",
      ] },
      { type: 'h2', text: 'API qanday ishlaydi — oddiy misol' },
      { type: 'p', text: "Siz ilovada \"Kirish\" tugmasini bosasiz. Frontend serverga so'rov yuboradi: \"login: ali, parol: ***\". Backend parolni tekshiradi, bazadan foydalanuvchini topadi va javob qaytaradi: \"xush kelibsiz\" yoki \"parol xato\". Har bir bosishingiz ortida shunday so'rov-javob almashinuvi yotadi." },
      { type: 'h2', text: "Qanday o'rganish kerak? (Node.js yo'li)" },
      { type: 'p', text: "JavaScript asoslarini bilsangiz, Node.js — eng tez yo'l: yangi til o'rganish shart emas. Express framework bilan birinchi API'ingizni yozing, MongoDB'da ma'lumot saqlashni o'rganing, keyin autentifikatsiya (JWT) va deploy (serverga joylash) qo'shing. Muqobil yo'l — Python + FastAPI/Django, ayniqsa AI yo'nalishi ham qiziq bo'lsa." },
      { type: 'h2', text: 'Amaliy loyiha g\'oyalari' },
      { type: 'ul', items: [
        "To-do API — CRUD amallarining klassik mashqi",
        "Blog backend — postlar, kommentlar, foydalanuvchilar",
        "Telegram bot — O'zbekistonda talab katta amaliy ko'nikma",
        "Onlayn do'kon API — mahsulotlar, savat, buyurtmalar",
      ] },
      { type: 'h2', text: 'Frontend yoki Backend — qaysi biri menga mos?' },
      { type: 'p', text: "Vizual natijani darhol ko'rish yoqsa — frontend. Mantiqiy tizimlar, ma'lumotlar va \"mexanizm ichini\" qurish qiziq bo'lsa — backend. Ko'pchilik ikkalasini ham biladigan fullstack darajaga o'sadi — kichik kompaniyalarda bu ayniqsa qadrlanadi." },
      { type: 'cta', text: "Node.js va backend kurslarini o'zbek tilida o'rganing", href: '/courses/category/nodejs', label: 'Backend kurslari' },
    ],
    faq: [
      { q: 'Backend frontenddan qiyinmi?', a: "Kirish biroz murakkabroq — natija vizual ko'rinmaydi. Lekin mantiq kuchli bo'lsa, backend aksincha tushunarliroq tuyuladi. Ikkalasida ham chuqurlik bir xil." },
      { q: 'Backend uchun qaysi til yaxshi?', a: "Boshlovchi uchun Node.js (JavaScript bilsangiz) yoki Python. Katta korporativ tizimlarda Java va Go ham keng ishlatiladi." },
    ],
    related: [
      { label: 'Frontend developer bo\'lish', href: '/blog/frontend-developer-qanday-bolish' },
      { label: 'Node.js kurslari', href: '/courses/category/nodejs' },
    ],
  },

  {
    slug: 'sayt-yaratishni-organish',
    title: 'Sayt yaratishni o\'rganish: noldan birinchi saytgacha',
    description:
      "O'z saytingizni qanday yaratish mumkin: HTML/CSS bilan noldan yozishdan tortib AI vositalarigacha. Boshlovchilar uchun amaliy qo'llanma o'zbek tilida.",
    keywords: [
      'sayt yaratish', 'veb sayt yaratish', 'sayt qanday yaratiladi', 'sayt yasash',
      'html css o\'rganish', 'sayt yaratishni o\'rganish', 'o\'zim sayt qilmoqchiman', 'landing page yaratish',
    ],
    category: 'html',
    date: '2026-07-04',
    readMinutes: 8,
    excerpt:
      "Sayt yaratish siz o'ylagandan osonroq. Birinchi sahifangizni bugunoq yasashingiz mumkin — qanday qilishni ko'rsatamiz.",
    blocks: [
      { type: 'p', text: "Sayt yaratish — dasturlashga kirishning eng qiziqarli yo'li, chunki natijani darhol brauzerda ko'rasiz. Birinchi oddiy sahifangizni bir kunda yasashingiz mumkin. Bu maqolada noldan sayt yaratishning barcha yo'llarini — kod yozishdan AI vositalarigacha — ko'rib chiqamiz." },
      { type: 'h2', text: "1-yo'l: HTML va CSS bilan noldan (tavsiya etiladi)" },
      { type: 'p', text: "HTML sahifa tuzilishini beradi: sarlavha, matn, rasm, tugma. CSS esa dizaynni: rang, shrift, joylashuv. Oddiy matn muharriri (VS Code) va brauzer yetarli — hech qanday pullik dastur kerak emas. `index.html` fayl yaratasiz, brauzerda ochasiz — saytingiz tayyor. Bu yo'l dasturlash asosini beradi va keyingi o'sish uchun poydevor bo'ladi." },
      { type: 'h2', text: 'Birinchi saytingiz uchun reja' },
      { type: 'ul', items: [
        "1-kun: HTML teglar — h1, p, img, a, ul. Oddiy sahifa tuzing",
        "2-3-kun: CSS asoslari — ranglar, shriftlar, margin/padding",
        "4-7-kun: Flexbox bilan joylashuv — header, kartalar, footer",
        "2-hafta: To'liq landing page — masalan, o'zingiz haqingizda sayt",
        "3-hafta: Responsive dizayn — telefonda ham chiroyli ko'rinishi",
      ] },
      { type: 'h2', text: "Saytni internetga qanday chiqarish mumkin?" },
      { type: 'p', text: "Statik sayt (faqat HTML/CSS/JS) uchun bepul xizmatlar yetarli: GitHub Pages, Vercel yoki Netlify. Kodingizni yuklaysiz — bir daqiqada saytingiz internetda. O'z domeningizni (masalan, ismingiz.uz) ulash ham mumkin — .uz domenlar yiliga arzon narxda sotiladi." },
      { type: 'h2', text: "2-yo'l: AI yordamida sayt yaratish" },
      { type: 'p', text: "2026-yilda AI vositalari (Claude, ChatGPT, v0, Cursor) matnli tavsifdan to'liq sayt kodini yozib bera oladi. Bu tez, lekin muhim ogohlantirish: HTML/CSS asoslarini bilmasangiz, AI bergan kodni tahrirlash, xatosini topish va o'zgartirish qiyin bo'ladi. Eng kuchli kombinatsiya — asoslarni bilish + AI bilan tezlashish." },
      { type: 'h2', text: "3-yo'l: Konstruktorlar (kod yozmasdan)" },
      { type: 'p', text: "Tilda, Wix, WordPress kabi konstruktorlarda kod yozmasdan sayt yig'ish mumkin. Biznes uchun tez yechim, lekin dasturchi bo'lish maqsadida bo'lsangiz — bu yo'l ko'nikma bermaydi. Vizitka-sayt kerak bo'lsa yaxshi, karyera uchun kod o'rganing." },
      { type: 'cta', text: "HTML, CSS va JavaScript'ni o'zbek tilida video darslar bilan o'rganing", href: '/courses/category/html', label: 'HTML kurslari' },
    ],
    faq: [
      { q: 'Sayt yaratish uchun qancha pul kerak?', a: "O'rganish va statik sayt joylash — mutlaqo bepul (VS Code, GitHub Pages). Xarajat faqat shaxsiy domen olsangiz paydo bo'ladi." },
      { q: 'Kod yozmasdan sayt qilish mumkinmi?', a: "Ha, konstruktorlar (Tilda, WordPress) bilan mumkin. Lekin moslashuvchanlik cheklangan va bu dasturchilik ko'nikmasi bermaydi." },
    ],
    related: [
      { label: 'CSS kurslari', href: '/courses/category/css' },
      { label: 'Frontend developer bo\'lish', href: '/blog/frontend-developer-qanday-bolish' },
    ],
  },

  {
    slug: 'onlayn-dasturlash-kurslari-qanday-tanlash',
    title: 'Onlayn dasturlash kurslarini qanday tanlash kerak',
    description:
      "IT va dasturlash kurslarini tanlashda nimalarga e'tibor berish kerak: amaliyot, mentor, portfolio, narx. Sifatli kursni sifatsizdan ajratish mezonlari.",
    keywords: [
      'dasturlash kurslari', 'it kurslari', 'onlayn kurslar', 'it kurslari toshkent',
      'dasturlash kurslari toshkent', 'programmalash kurslari', 'bepul it kurslar', 'it o\'quv markazlari',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 7,
    excerpt:
      "Kurslar ko'p, lekin qaysi biri haqiqatan natija beradi? Sifatli kursni tanlashning aniq mezonlarini beramiz.",
    blocks: [
      { type: 'p', text: "O'zbekistonda IT ta'limga qiziqish portlashi bilan kurslar soni ham keskin oshdi — oflayn markazlardan onlayn platformalargacha. Afsuski, hammasi ham sifatli emas. Pulingiz va eng qimmat resursingiz — vaqtingizni to'g'ri sarflash uchun kurs tanlash mezonlarini bilib oling." },
      { type: 'h2', text: '1. Amaliyot ulushi — eng muhim mezon' },
      { type: 'p', text: "Dasturlash faqat video ko'rish bilan o'rganilmaydi. Yaxshi kursda har mavzudan keyin mashq, kviz va loyiha bo'ladi. Kurs oxirida portfolio'ga qo'yadigan real loyihangiz qolishi kerak. \"90% nazariya\" kurslardan qoching." },
      { type: 'h2', text: '2. Dastur dolzarbligi' },
      { type: 'ul', items: [
        "Texnologiyalar zamonaviymi? (React hooks, ES6+, zamonaviy Python)",
        "AI vositalari o'rgatiladimi? 2026-yilda Claude/Cursor/Copilot'siz dastur eskirgan",
        "Dastur oxirgi 1-2 yilda yangilangani ko'rinib turadimi?",
      ] },
      { type: 'h2', text: '3. Onlayn yoki oflayn?' },
      { type: 'p', text: "Oflayn — jonli muhit va intizom, lekin qimmatroq va yo'lga vaqt ketadi. Onlayn — o'z tezligingizda, istalgan joydan, arzonroq yoki bepul; lekin o'z-o'zini boshqarish talab qiladi. Ko'pchilik uchun optimal yo'l: onlayn video kurslar + muntazam amaliyot + savol so'rash uchun hamjamiyat." },
      { type: 'h2', text: '4. Narx haqida to\'g\'ri fikrlash' },
      { type: 'p', text: "Qimmat kurs har doim yaxshi degani emas, bepul kurs har doim sifatsiz degani ham emas. Asosiy formula: kontent sifati × sizning amaliyotingiz = natija. Millionlab so'm to'lab video ko'rmagan odamdan, bepul kursda har kuni kod yozgan odam kuchliroq chiqadi." },
      { type: 'h2', text: '5. Qizil bayroqlar — bunday kurslardan qoching' },
      { type: 'ul', items: [
        "\"3 oyda kafolatlangan 1000$ maosh\" kabi va'dalar",
        "Amaliyot va loyihasiz, faqat nazariy videolar",
        "Eskirgan texnologiyalar (jQuery asosiy sifatida, eski PHP)",
        "O'qituvchining o'zi haqida ma'lumot yo'q — portfolio, tajriba noma'lum",
      ] },
      { type: 'cta', text: "Aidevix'da kurslar amaliyot, kviz va XP tizimi bilan — o'zbek tilida, bepul boshlang", href: '/courses', label: 'Kurslarni ko\'rish' },
    ],
    faq: [
      { q: 'Bepul kurslar bilan dasturchi bo\'lish mumkinmi?', a: "Ha, mumkin. Internetdagi bepul manbalar yetarli — asosiy hal qiluvchi omil sizning muntazam amaliyotingiz. Pullik kurslar tizimlilik va tejamkor vaqt beradi." },
      { q: 'Sertifikat muhimmi?', a: "IT'da sertifikatdan ko'ra portfolio va amaliy bilim muhimroq. Sertifikat — qo'shimcha plyus, lekin intervyuda kod yoza olishingiz hal qiladi." },
    ],
    related: [
      { label: 'Dasturlashni qayerdan boshlash', href: '/blog/dasturlashni-qayerdan-boshlash' },
      { label: 'IT kasblari va maoshlari', href: '/blog/it-kasblari-va-maoshlari' },
    ],
  },

  {
    slug: 'freelance-dasturchi-qanday-boshlash',
    title: 'Freelance dasturchi bo\'lish: birinchi buyurtmagacha yo\'l',
    description:
      "Freelance dasturlashni qanday boshlash kerak: qaysi platformalar, portfolio, birinchi mijoz topish va narx belgilash. O'zbekistonlik dasturchilar uchun amaliy qo'llanma.",
    keywords: [
      'freelance', 'frilanser bo\'lish', 'freelance dasturchi', 'freelance qanday boshlash',
      'upwork o\'zbekiston', 'masofaviy ish', 'freelance ish topish', 'uydan turib ishlash it',
    ],
    category: 'career',
    date: '2026-07-04',
    readMinutes: 9,
    excerpt:
      "Freelance — o'z vaqtingizga o'zingiz xo'jayin bo'lish va xorijiy mijozlar bilan ishlash imkoni. Qayerdan boshlashni aniq aytamiz.",
    blocks: [
      { type: 'p', text: "Freelance — kompaniyaga bog'lanmasdan, buyurtma asosida ishlash. Dasturchilar uchun bu ayniqsa qulay: kerak bo'ladigani — noutbuk va internet. O'zbekistonlik dasturchilar Upwork va boshqa platformalarda xorijiy mijozlar bilan ishlab, mahalliy bozordan ancha yuqori daromad qilmoqda. Lekin birinchi buyurtmagacha yo'l sabr talab qiladi." },
      { type: 'h2', text: 'Freelance boshlashdan oldin nima bilish kerak?' },
      { type: 'p', text: "Freelance — bilim darajangizni oshiradigan joy emas, bilimingizni pulga aylantiradigan joy. Kamida bitta yo'nalishda (masalan, sayt yaratish, Telegram bot, frontend) mustaqil loyiha qila oladigan darajada bo'lishingiz kerak. Hali unday bo'lmasa — avval o'rganing va portfolio yig'ing." },
      { type: 'h2', text: 'Qaysi platformalarda ishlash mumkin?' },
      { type: 'ul', items: [
        "Upwork — eng katta xalqaro platforma, dollar daromad, raqobat yuqori",
        "Fiverr — xizmatlaringizni \"gig\" sifatida joylaysiz, mijoz o'zi topadi",
        "Kwork — rusiyzabon bozor, kirish osonroq",
        "Mahalliy kanallar — Telegram guruhlar va tanish-bilish orqali buyurtmalar",
      ] },
      { type: 'h2', text: 'Birinchi buyurtmani qanday olish mumkin?' },
      { type: 'p', text: "Yangi profilga hech kim ishonmaydi — bu normal. Strategiya: kichik va aniq buyurtmalardan boshlang, narxni boshida past qo'ying (reyting yig'ish uchun), har bir taklifingizni (proposal) mijoz muammosiga moslab yozing — shablon yubormang. Birinchi 3-5 ta ijobiy sharh eng qiyin qism; keyin buyurtmalar o'zi kela boshlaydi." },
      { type: 'h2', text: "Portfolio — sizning asosiy qurolingiz" },
      { type: 'p', text: "Mijoz diplom so'ramaydi — ishlaringizni ko'rsatadi. 3-5 ta tugallangan, jonli ko'rsa bo'ladigan loyiha kifoya: deploy qilingan sayt, ishlayotgan bot, GitHub'dagi toza kod. Har biriga qisqa tavsif yozing: qanday muammoni qanday hal qilgansiz." },
      { type: 'h2', text: "Narx va muloqot" },
      { type: 'p', text: "Boshida soatlik yoki loyiha asosida past narx normaldir — bu investitsiya. Reyting o'sgani sari narxni oshirib boring. Mijoz bilan yozma kelishuv qiling: ish hajmi, muddat, to'lov sharti. Ingliz tili — xalqaro freelance'ning kaliti; yozma muloqot uchun o'rta daraja ham yetarli, AI tarjimonlar yordam beradi." },
      { type: 'cta', text: "Freelance'ga tayyorlanish uchun amaliy dasturlash kurslarini ko'ring", href: '/courses/category/career', label: 'Karyera kurslari' },
    ],
    faq: [
      { q: 'Freelance uchun qancha bilim kerak?', a: "Bitta yo'nalishda mustaqil loyihani boshidan oxirigacha qila olishingiz kerak. Odatda bu 6-12 oylik jiddiy o'rganishdan keyin keladi." },
      { q: 'O\'zbekistondan Upwork\'da ishlash mumkinmi?', a: "Ha, O'zbekistonlik minglab freelancerlar Upwork'da ishlaydi. To'lovlarni olish uchun Payoneer kabi xizmatlardan foydalaniladi." },
      { q: 'Freelance yoki kompaniyada ish — qaysi biri yaxshi?', a: "Boshlovchiga kompaniya tavsiya qilinadi — mentorlik va tizimli o'sish bor. Freelance mustaqillik beradi, lekin barqarorlik va o'sish tezligi o'zingizga bog'liq." },
    ],
    related: [
      { label: 'IT kasblari va maoshlari', href: '/blog/it-kasblari-va-maoshlari' },
      { label: 'Git va GitHub asoslari', href: '/blog/git-github-asoslari' },
    ],
  },

  {
    slug: 'vibe-coding-nima',
    title: 'Vibe coding nima? AI bilan dasturlashning yangi davri',
    description:
      "Vibe coding — AI'ga tavsif berib dastur yaratish usuli. U qanday ishlaydi, qaysi vositalar kerak va dasturchilar uchun nimani anglatadi — o'zbek tilida.",
    keywords: [
      'vibe coding', 'vibe coding nima', 'ai bilan dastur yaratish', 'ai bilan kod yozish',
      'cursor vibe coding', 'claude vibe coding', 'kod yozmasdan dastur yaratish', 'ai dasturlash',
    ],
    category: 'ai',
    date: '2026-07-04',
    readMinutes: 6,
    excerpt:
      "\"Vibe coding\" — kod yozish o'rniga AI'ga nima xohlashingizni aytib, natijani birga sayqallash. Yangi davr ko'nikmasini tushuntiramiz.",
    blocks: [
      { type: 'p', text: "Vibe coding — dasturni qatorma-qator yozish o'rniga, AI agentga (Claude Code, Cursor kabi) maqsadni tavsiflab berish va natijani iteratsiya bilan sayqallash usuli. Atama 2025-yilda mashhur bo'ldi va hozir dasturlash madaniyatining bir qismiga aylandi: g'oyadan ishlaydigan prototipgacha bo'lgan vaqt soatlarga qisqardi." },
      { type: 'h2', text: 'Vibe coding qanday ishlaydi?' },
      { type: 'ul', items: [
        "Maqsadni tavsiflaysiz: \"Kirim-chiqimni kuzatadigan ilova qil, grafik bilan\"",
        "AI kod yozadi, siz natijani ko'rasiz",
        "Aniqlashtirasiz: \"grafikni oylik qilib ber\", \"dizaynni qorong'i qil\"",
        "Xato chiqsa — xatoni AI'ga ko'rsatasiz, u tuzatadi",
        "Shu tarzda mahsulot bosqichma-bosqich \"o'sadi\"",
      ] },
      { type: 'h2', text: 'Qaysi vositalar kerak?' },
      { type: 'p', text: "Eng mashhurlari: Claude Code (terminal agent, katta loyihalarda kuchli), Cursor (AI muharrir, vizual ishlash uchun), v0 (UI komponentlar uchun) va Replit (brauzerda, o'rnatishsiz). Boshlovchi uchun Cursor yoki Replit qulay boshlanish nuqtasi." },
      { type: 'h2', text: "Vibe coding'ning kuchli tomonlari" },
      { type: 'p', text: "Prototiplash tezligi misli ko'rilmagan darajada oshdi — g'oyani bir kechada sinab ko'rish mumkin. Kirish to'sig'i pasaydi: dasturlashni endi boshlayotganlar ham ishlaydigan mahsulot yarata oladi. Tajribali dasturchilar esa rutina ishlarni AI'ga topshirib, arxitektura va mahsulotga e'tibor qaratadi." },
      { type: 'h2', text: 'Xavfli tomoni — asossiz ishonch' },
      { type: 'p', text: "AI yozgan kodni tushunmasdan production'ga chiqarish — xavfsizlik teshiklari, yashirin xatolar va boshqarib bo'lmaydigan loyihaga olib boradi. Vibe coding asoslarni bilishning o'rnini bosmaydi: kod nima qilayotganini tushunadigan odam AI'dan 10 barobar ko'proq foyda oladi. Formula oddiy: asoslar + AI = superkuch; faqat AI = shisha oyoqli minora." },
      { type: 'cta', text: "AI bilan kod yozishni sinab ko'ring — AI Code Playground'da kodingizni AI tekshiradi", href: '/playground', label: 'Playground\'ni ochish' },
    ],
    faq: [
      { q: 'Vibe coding bilan dasturlash o\'rganmasa ham bo\'ladimi?', a: "Kichik shaxsiy loyihalar uchun ha. Lekin jiddiy mahsulot va karyera uchun asoslar shart — AI xato qilganda uni faqat tushunadigan odam to'g'irlay oladi." },
      { q: 'Vibe coding uchun qaysi vosita eng yaxshi?', a: "Katta loyiha va avtomatlashtirish — Claude Code, vizual tahrirlash — Cursor, tez UI — v0, o'rnatishsiz boshlash — Replit." },
    ],
    related: [
      { label: 'Claude Code qo\'llanmasi', href: '/blog/claude-code-nima-qollanma' },
      { label: 'Cursor AI qo\'llanmasi', href: '/blog/cursor-ai-qollanma' },
      { label: 'Prompt engineering asoslari', href: '/blog/prompt-engineering-asoslari' },
    ],
  },
];

export const getArticle = (slug: string): BlogArticle | undefined =>
  BLOG_ARTICLES.find((a) => a.slug === slug);

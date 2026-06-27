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
      { label: 'React kurslari', href: '/courses/category/react' },
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
];

export const getArticle = (slug: string): BlogArticle | undefined =>
  BLOG_ARTICLES.find((a) => a.slug === slug);

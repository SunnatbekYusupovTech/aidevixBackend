// Kurs kategoriya landing sahifalari uchun SEO ma'lumotlar.
// Har bir kategoriya /courses/category/[slug] da alohida indekslanadigan sahifa
// bo'ladi — o'z title/description/keywords/intro bilan. Maqsad: "react kurslari",
// "python kurslari" kabi aniq so'rovlar bo'yicha Google'da chiqish.

export type CourseCategoryMeta = {
  slug: string; // CATEGORIES dagi id bilan mos
  label: string; // ko'rsatiladigan nom
  title: string; // <h1> + meta title (brandsiz)
  description: string; // meta description
  keywords: string[];
  intro: string; // sahifa kirish matni
};

export const COURSE_CATEGORIES: CourseCategoryMeta[] = [
  {
    slug: 'ai',
    label: 'AI va Agentlar',
    title: 'AI va sun\'iy intellekt kurslari',
    description:
      "Sun'iy intellekt, AI agentlar, prompt engineering va AI vositalari bo'yicha o'zbek tilidagi kurslar. Claude, Cursor, Copilot bilan ishlashni o'rganing.",
    keywords: ['ai kurslari', 'sun\'iy intellekt kurslari', 'ai o\'rganish o\'zbek', 'prompt engineering kurs', 'ai agentlar', 'machine learning o\'zbek'],
    intro:
      "Sun'iy intellekt dunyosiga o'zbek tilida kiring. AI agentlar, prompt engineering va zamonaviy AI dasturlash vositalari bo'yicha amaliy kurslar.",
  },
  {
    slug: 'react',
    label: 'React',
    title: 'React kurslari — o\'zbek tilida',
    description:
      "React.js bo'yicha o'zbek tilidagi onlayn kurslar: komponentlar, hooks, state boshqaruvi va amaliy loyihalar. Boshlang'ichdan professional darajagacha.",
    keywords: ['react kurslari', 'react o\'rganish', 'react o\'zbek tilida', 'reactjs kurs', 'react hooks', 'frontend kurslari'],
    intro:
      "Zamonaviy veb-ilovalar yaratishning eng mashhur kutubxonasi — React'ni o'zbek tilida o'rganing. Komponentlar, hooks va real loyihalar.",
  },
  {
    slug: 'javascript',
    label: 'JavaScript',
    title: 'JavaScript kurslari — o\'zbek tilida',
    description:
      "JavaScript bo'yicha o'zbek tilidagi kurslar: asoslardan ES6+, DOM, async va amaliy loyihalargacha. Veb-dasturlashni JavaScript bilan boshlang.",
    keywords: ['javascript kurslari', 'javascript o\'rganish', 'js o\'zbek tilida', 'javascript kurs', 'es6', 'veb dasturlash'],
    intro:
      "Veb-dasturlashning poydevori — JavaScript'ni noldan o'rganing. O'zbek tilidagi tushunarli darslar va amaliy mashqlar.",
  },
  {
    slug: 'nodejs',
    label: 'Node.js',
    title: 'Node.js va backend kurslari',
    description:
      "Node.js bo'yicha o'zbek tilidagi backend kurslari: Express, REST API, ma'lumotlar bazasi va server dasturlash. Backend dasturchi bo'ling.",
    keywords: ['node.js kurslari', 'backend kurslari', 'nodejs o\'zbek', 'express kurs', 'rest api o\'rganish', 'server dasturlash'],
    intro:
      "Server tomonidagi dasturlashni Node.js bilan o'rganing. Express, API yaratish va ma'lumotlar bazasi bilan ishlash — o'zbek tilida.",
  },
  {
    slug: 'typescript',
    label: 'TypeScript',
    title: 'TypeScript kurslari — o\'zbek tilida',
    description:
      "TypeScript bo'yicha o'zbek tilidagi kurslar: tiplar, interfeyslar, generiklar va katta loyihalarda xavfsiz kod yozish. JavaScript'ni keyingi bosqichga olib chiqing.",
    keywords: ['typescript kurslari', 'typescript o\'rganish', 'typescript o\'zbek', 'ts kurs', 'tiplangan javascript'],
    intro:
      "Katta va xavfsiz loyihalar uchun TypeScript'ni o'rganing. Tiplar va interfeyslar bilan xatosiz kod yozishni egallang.",
  },
  {
    slug: 'html',
    label: 'HTML',
    title: 'HTML kurslari — veb-saytning asosi',
    description:
      "HTML bo'yicha o'zbek tilidagi kurslar: teglar, semantik markup, formalar va sahifa tuzilishi. Veb-saytlar yaratishni shu yerdan boshlang.",
    keywords: ['html kurslari', 'html o\'rganish', 'html o\'zbek tilida', 'veb sayt yaratish', 'html asoslari'],
    intro:
      "Har bir veb-sahifaning asosi — HTML'ni o'rganing. Semantik teglar va to'g'ri tuzilishni o'zbek tilida o'zlashtiring.",
  },
  {
    slug: 'css',
    label: 'CSS',
    title: 'CSS kurslari — chiroyli veb dizayn',
    description:
      "CSS bo'yicha o'zbek tilidagi kurslar: Flexbox, Grid, animatsiyalar va responsive dizayn. Saytlaringizni chiroyli va moslashuvchan qiling.",
    keywords: ['css kurslari', 'css o\'rganish', 'css o\'zbek tilida', 'flexbox', 'css grid', 'responsive dizayn', 'tailwind'],
    intro:
      "Veb-saytlarni chiroyli va moslashuvchan qilishni CSS bilan o'rganing. Flexbox, Grid va animatsiyalar — o'zbek tilida.",
  },
  {
    slug: 'security',
    label: 'Kiberxavfsizlik',
    title: 'Kiberxavfsizlik kurslari — o\'zbek tilida',
    description:
      "Kiberxavfsizlik bo'yicha o'zbek tilidagi kurslar: veb-xavfsizlik, etik xakerlik asoslari va himoya usullari. Talab yuqori sohani o'rganing.",
    keywords: ['kiberxavfsizlik kurslari', 'cyber security o\'zbek', 'etik xakerlik', 'veb xavfsizlik', 'axborot xavfsizligi kurs'],
    intro:
      "Eng talab yuqori sohalardan biri — kiberxavfsizlikni o'zbek tilida o'rganing. Himoya usullari va xavfsiz dasturlash.",
  },
  {
    slug: 'telegram',
    label: 'Telegram TMA',
    title: 'Telegram bot va Mini App kurslari',
    description:
      "Telegram bot va Mini App (TMA) yaratishni o'zbek tilida o'rganing: Bot API, web ilovalar va to'lov integratsiyasi. Telegram uchun mahsulot yarating.",
    keywords: ['telegram bot yaratish', 'telegram bot kurs', 'telegram mini app', 'tma o\'rganish', 'bot dasturlash o\'zbek'],
    intro:
      "Telegram bot va Mini App yaratishni o'rganing. Bot API'dan to'liq web ilovalargacha — o'zbek tilida amaliy kurslar.",
  },
  {
    slug: 'career',
    label: 'Karyera va Freelance',
    title: 'IT karyera va freelance kurslari',
    description:
      "IT sohasida karyera qurish va freelance ishlashni o'zbek tilida o'rganing: portfolio, ish topish, mijoz bilan ishlash va daromad qilish yo'llari.",
    keywords: ['it karyera', 'freelance o\'zbek', 'freelance qanday boshlash', 'dasturchi ishi', 'portfolio yaratish', 'it ish topish'],
    intro:
      "IT sohasida ishga kirish va freelance qilishni o'rganing. Portfolio, ish topish va mijozlar bilan ishlash bo'yicha amaliy maslahatlar.",
  },
  {
    slug: 'nocode',
    label: 'No-Code',
    title: 'No-Code kurslari — kodsiz mahsulot yaratish',
    description:
      "No-Code vositalar bilan kod yozmasdan veb-sayt va ilovalar yaratishni o'zbek tilida o'rganing. G'oyangizni tez ishga tushiring.",
    keywords: ['no-code kurslari', 'nocode o\'zbek', 'kodsiz sayt yaratish', 'no code vositalar', 'tez prototip'],
    intro:
      "Kod yozmasdan ham mahsulot yaratish mumkin. No-Code vositalar bilan g'oyangizni tez ishga tushirishni o'rganing.",
  },
  {
    slug: 'web3',
    label: 'Web3 va Kripto',
    title: 'Web3 va blockchain kurslari',
    description:
      "Web3, blockchain va kripto bo'yicha o'zbek tilidagi kurslar: smart kontraktlar, DApp'lar va markazlashmagan texnologiyalar. Kelajak texnologiyasini o'rganing.",
    keywords: ['web3 kurslari', 'blockchain o\'rganish', 'kripto o\'zbek', 'smart kontrakt', 'solidity kurs', 'dapp'],
    intro:
      "Markazlashmagan internetning kelajagi — Web3'ni o'rganing. Blockchain, smart kontraktlar va DApp'lar bo'yicha kurslar.",
  },
];

export const getCategory = (slug: string): CourseCategoryMeta | undefined =>
  COURSE_CATEGORIES.find((c) => c.slug === slug);

// Har kategoriya sahifasi uchun FAQ — savol-javob o'sha yo'nalishga xos (label bilan),
// shuning uchun har sahifa o'ziga xos kontent oladi (thin/duplicate emas). Ham UI'da,
// ham FAQPage JSON-LD sifatida ishlatiladi.
export const buildCategoryFaq = (cat: CourseCategoryMeta): { q: string; a: string }[] => [
  {
    q: `${cat.label} kurslari o'zbek tilidami?`,
    a: `Ha, ${cat.label} bo'yicha barcha darslar, amaliy topshiriqlar va izohlar to'liq o'zbek tilida. ${cat.intro}`,
  },
  {
    q: `${cat.label}ni noldan o'rgansam bo'ladimi?`,
    a: `Ha. ${cat.label} kurslari boshlang'ich darajadan boshlab, bosqichma-bosqich murakkablashib boradi. Oldindan tajriba shart emas — asoslardan boshlab amaliy loyihalargacha olib boramiz.`,
  },
  {
    q: `${cat.label} kursini tugatgach sertifikat beriladimi?`,
    a: `Ha, kursni yakunlab, topshiriq va testlardan o'tganingizdan so'ng tekshiriladigan raqamli sertifikat olasiz va uni portfolio yoki rezyumeda ishlatishingiz mumkin.`,
  },
  {
    q: `${cat.label}ni o'rganish nimaga kerak?`,
    a: `${cat.description}`,
  },
];

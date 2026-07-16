// "Dasturlash kurslari" landing (/courses) uchun SEO FAQ — ham UI'da ko'rsatiladi,
// ham FAQPage JSON-LD sifatida beriladi (Google'da rich "savol-javob" natijasi).
// Yagona manba: matn o'zgarsa schema ham avtomatik yangilanadi.

export type Faq = { q: string; a: string };

export const COURSES_FAQ: Faq[] = [
  {
    q: 'Aidevix dasturlash kurslari o\'zbek tilidami?',
    a: "Ha, barcha kurslar to'liq o'zbek tilida. React, Python, JavaScript, Node.js, TypeScript, AI va kiberxavfsizlik yo'nalishlari bo'yicha darslar, amaliy topshiriqlar va izohlar o'zbek tilida tayyorlangan.",
  },
  {
    q: 'Aidevix IT kurslari qaysi yo\'nalishlarni o\'z ichiga oladi?',
    a: "Aidevix IT kurslari keng qamrovli: veb-dasturlash (frontend va backend), mobil dasturlash, kiberxavfsizlik, sun'iy intellekt va AI vositalari, Telegram bot va Mini App, No-Code hamda Web3. Har bir IT yo'nalish alohida kurslar to'plamiga va o'z landing sahifasiga ega — o'zingizga mos yo'nalishni noldan boshlab o'rganishingiz mumkin.",
  },
  {
    q: 'Kurslar boshlang\'ich (0 dan) o\'rganuvchilar uchun mosmi?',
    a: "Ha. Kurslar boshlang'ich darajadan senior darajagacha bosqichma-bosqich tuzilgan. Dasturlashni umuman bilmasangiz ham asoslardan boshlaysiz va amaliy loyihalar orqali darajangizni oshirasiz.",
  },
  {
    q: 'Qaysi dasturlash tillari va texnologiyalarni o\'rgansam bo\'ladi?',
    a: "React, JavaScript, TypeScript, Node.js, Python, HTML/CSS, kiberxavfsizlik va zamonaviy AI vositalari (Claude, Cursor, Copilot). Har bir yo'nalish alohida kurslar to'plamiga ega.",
  },
  {
    q: 'Kurslarni tugatgach sertifikat beriladimi?',
    a: "Ha, kursni yakunlab, kerakli topshiriq va testlardan o'tganingizdan so'ng tekshiriladigan raqamli sertifikat olasiz. Sertifikatni portfolio yoki rezyumeda ishlatishingiz mumkin.",
  },
  {
    q: 'Kurslarni qanday boshlash mumkin?',
    a: "Ro'yxatdan o'ting, kerakli yo'nalishni tanlang va darhol o'rganishni boshlang. Platforma XP, daraja va kunlik challenge tizimi bilan motivatsiyani ushlab turadi.",
  },
  {
    q: 'Aidevix nima bilan boshqa kurslardan farq qiladi?',
    a: "Aidevix — AI davri uchun mo'ljallangan platforma: an'anaviy dasturlash bilan bir qatorda Claude Code, Cursor, Copilot kabi AI vositalar bilan ishlashni o'rgatadi. AI Code Playground, prompt kutubxonasi va geymifikatsiya bilan amaliy ko'nikma beradi.",
  },
];

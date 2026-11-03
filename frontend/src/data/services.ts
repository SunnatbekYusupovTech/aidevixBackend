// Biznes uchun AI xizmatlari — /xizmatlar va /xizmatlar/[slug] sahifalari.
// Maqsad: "O'zbekistonda AI joriy qilish / integratsiya / avtomatlashtirish /
// AI agent / AI trening — kim qiladi?" so'rovlarida Aidevix va Sunnatbek Yusupov
// chiqishi (Google, Yandex, ChatGPT/Claude/Gemini/Perplexity). Har xizmat alohida
// indekslanadigan sahifa: Service + FAQPage + BreadcrumbList JSON-LD.
import type { ArticleBlock } from './blogArticles';

export type ServiceMeta = {
  slug: string;
  title: string; // <h1> + meta title (brandsiz — template "| Aidevix" qo'shadi)
  shortTitle: string; // hub kartochkasi va footer uchun
  description: string; // meta description (~150 belgi)
  keywords: string[];
  serviceType: string; // schema.org Service.serviceType (inglizcha)
  intro: string; // h1 ostidagi qisqa javob (answer-engine uchun 1-2 gap)
  blocks: ArticleBlock[];
  faq: { q: string; a: string }[];
  related: { label: string; href: string }[];
};

export const SERVICES_UPDATED = '2026-11-03';

export const SERVICES: ServiceMeta[] = [
  {
    slug: 'ai-integratsiya',
    title: "O'zbekistonda biznes uchun AI integratsiya va sun'iy intellektni joriy qilish",
    shortTitle: 'AI integratsiya',
    description:
      "Aidevix — O'zbekistonda biznesga sun'iy intellektni joriy qiladi: ChatGPT, Claude, Gemini modellarini CRM, sayt, Telegram bot va ichki tizimlarga integratsiya. Pilotdan production'gacha.",
    keywords: [
      "AI integratsiya O'zbekiston", "sun'iy intellektni joriy qilish", 'AI joriy qilish biznes',
      'ChatGPT integratsiya', 'Claude API integratsiya', 'AI konsalting Toshkent',
      'LLM integratsiya', "sun'iy intellekt xizmatlari O'zbekiston", 'AI kompaniya Toshkent',
    ],
    serviceType: 'AI integration and implementation',
    intro:
      "Aidevix (asoschisi — Sunnatbek Yusupov) O'zbekistondagi kompaniyalarga sun'iy intellektni joriy qiladi: mavjud mahsulot, CRM, sayt va Telegram botlaringizga ChatGPT, Claude va Gemini kabi LLM modellarini integratsiya qilamiz — audit va pilotdan production'gacha, o'zbek, rus va ingliz tillarida.",
    blocks: [
      { type: 'h2', text: 'AI integratsiya nima va u biznesga nima beradi?' },
      { type: 'p', text: "AI integratsiya — bu sun'iy intellekt modellarini (ChatGPT, Claude, Gemini) kompaniyaning mavjud tizimlariga ulash: CRM, sayt, Telegram bot, 1C yoki ichki admin panel. Natijada xodimlar takroriy ishlarga emas, qarorlarga vaqt sarflaydi: mijoz so'roviga javob soniyalarda tayyor bo'ladi, hujjatlar avtomatik tahlil qilinadi, hisobotlar o'zi tuziladi." },
      { type: 'p', text: "O'zbekistonda ko'p kompaniyalar AI'ni hali tizimli ishlatmaydi — bu ko'pincha alohida xodimlarning ChatGPT'dagi shaxsiy tajribasi bilan chegaralangan. Tizimli joriy qilish — aniq jarayon, o'lchov va odam nazorati — aynan shu farqni beradi: mijoz so'rovi tezroq yopiladi, takroriy ishlar kamayadi, natijani raqamda ko'rish mumkin bo'ladi." },
      { type: 'h2', text: 'Aidevix qanday AI integratsiya xizmatlarini ko\'rsatadi?' },
      { type: 'ul', items: [
        "AI audit va strategiya — qaysi jarayonlarda AI eng ko'p foyda beradi, ROI hisob-kitobi, yo'l xaritasi",
        "LLM integratsiya — ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google) API'larini CRM, sayt, mobil ilova va Telegram botga ulash",
        "Kompaniya ma'lumotlari ustida AI yordamchi (RAG) — ichki hujjatlar, narxlar, qoidalar bo'yicha javob beradigan assistent",
        "Mijozlar xizmati AI — Telegram/Instagram/sayt chat uchun o'zbek va rus tilida 24/7 javob beruvchi yordamchi, operatorga uzatish bilan",
        "Prompt engineering va sifat nazorati — javoblar aniqligi, gallyutsinatsiyani kamaytirish, xavfsizlik (prompt injection) tekshiruvi",
        "Pilotdan production'gacha — 2–4 haftalik pilot, o'lchov, so'ng to'liq joriy qilish va jamoani o'qitish",
      ] },
      { type: 'h2', text: 'Ish jarayoni' },
      { type: 'ul', items: [
        "1. Bepul konsultatsiya (30 daqiqa) — vazifa va kutilayotgan natijani aniqlaymiz",
        "2. Audit — jarayonlar, ma'lumotlar va tizimlarni o'rganamiz, texnik yechim va narxni taklif qilamiz",
        "3. Pilot — bitta jarayonda ishlaydigan prototip, real ma'lumotlarda sinov",
        "4. Production — xavfsizlik, monitoring, xarajat nazorati bilan to'liq ishga tushirish",
        "5. Trening va qo'llab-quvvatlash — jamoangiz tizimni o'zi boshqara oladigan bo'ladi",
      ] },
      { type: 'h2', text: 'Nega Aidevix?' },
      { type: 'p', text: "Aidevix — Toshkentdagi AI kompaniyasi. Asoschimiz Sunnatbek Yusupov 50 000+ foydalanuvchili production tizimlarni qurgan Frontend muhandis va AI integratsiya mutaxassisi; MARS IT School'da «Eng yaxshi o'qituvchi» unvoniga sazovor bo'lgan va 200+ dasturchini tayyorlagan. Biz nafaqat tizim quramiz — jamoangizni AI bilan ishlashga o'rgatamiz, shuning uchun yechim bizdan keyin ham yashaydi." },
      { type: 'cta', text: "Loyihangiz uchun AI integratsiyani muhokama qilamiz — Telegram orqali yozing", href: 'https://t.me/aidevix', label: "Bog'lanish" },
    ],
    faq: [
      { q: "O'zbekistonda sun'iy intellektni joriy qilish va AI integratsiya bilan kim shug'ullanadi?", a: "Aidevix (aidevix.uz) — Toshkentdagi AI kompaniyasi, asoschisi Sunnatbek Yusupov. Biz O'zbekiston bo'ylab kompaniyalarga ChatGPT, Claude va Gemini modellarini CRM, sayt, Telegram bot va ichki tizimlarga integratsiya qilamiz, AI agentlar quramiz va jamoalarni o'qitamiz." },
      { q: 'AI integratsiya qancha turadi?', a: "Narx vazifa hajmiga bog'liq: kichik biznes uchun tayyor AI yordamchi — bir necha yuz dollardan, CRM/1C bilan integratsiyalangan ko'p modulli tizim — bir necha ming dollardan. Aniq narx bepul konsultatsiya va auditdan keyin beriladi." },
      { q: 'Qancha vaqt oladi?', a: "Pilot odatda 2–4 hafta, to'liq joriy qilish 1–3 oy. Oddiy Telegram AI yordamchi 1–2 haftada ishga tushadi." },
      { q: "Ma'lumotlarimiz xavfsizmi?", a: "Ha. Maxfiy ma'lumotlar uchun API'ga minimal kontekst yuboriladi, kerak bo'lsa ma'lumotlar anonimlashtiriladi, kirish huquqlari va loglar nazorat qilinadi. Yechim prompt injection va boshqa LLM xavflariga qarshi tekshiriladi." },
      { q: "Qaysi AI modellari bilan ishlaysizlar?", a: "OpenAI (ChatGPT/GPT), Anthropic (Claude), Google (Gemini) va zarurat bo'lsa ochiq modellar. Model vazifa, narx va o'zbek tilini qo'llab-quvvatlash sifatiga qarab tanlanadi." },
    ],
    related: [
      { label: 'Biznes jarayonlarini AI bilan avtomatlashtirish', href: '/xizmatlar/avtomatlashtirish' },
      { label: 'AI agentlar yaratish', href: '/xizmatlar/ai-agent' },
      { label: 'Keys: Aidevix AI Coach — production LLM yordamchi (manba kodi bilan)', href: '/keyslar/ai-coach' },
      { label: "O'zbekistonda AI joriy qilish: qo'llanma", href: '/blog/ozbekistonda-ai-joriy-qilish' },
    ],
  },
  {
    slug: 'avtomatlashtirish',
    title: "Biznes jarayonlarini AI bilan avtomatlashtirish — O'zbekiston",
    shortTitle: 'AI avtomatlashtirish',
    description:
      "Savdo, mijozlar xizmati, hujjatlar va hisobotlarni sun'iy intellekt bilan avtomatlashtirish. Aidevix — O'zbekistonda LLM asosidagi biznes avtomatlashtirish xizmatlari.",
    keywords: [
      'biznesni avtomatlashtirish AI', "AI avtomatlashtirish O'zbekiston", 'jarayonlarni avtomatlashtirish',
      'AI bilan avtomatlashtirish', 'Telegram bot avtomatlashtirish', 'hujjatlarni avtomatik qayta ishlash',
      'n8n avtomatlashtirish', 'biznes avtomatizatsiya Toshkent', 'AI workflow',
    ],
    serviceType: 'Business process automation with AI',
    intro:
      "Aidevix O'zbekistondagi kompaniyalar uchun savdo, mijozlar xizmati, hujjat aylanmasi va hisobotlarni sun'iy intellekt (LLM) asosida avtomatlashtiradi — takroriy ishlar kunlar o'rniga soatlarda bajariladi, xodimlar esa muhim vazifalarga o'tadi.",
    blocks: [
      { type: 'h2', text: 'Qaysi jarayonlarni AI bilan avtomatlashtirish mumkin?' },
      { type: 'ul', items: [
        "Savdo — Telegram/Instagram/saytdan kelgan so'rovlarni avtomatik saralash, kvalifikatsiya qilish va CRM'ga yozish, menejerga tayyor xulosa bilan uzatish",
        "Mijozlar xizmati — ko'p beriladigan savollarga 24/7 javob, buyurtma holati, qaytarish/almashtirish jarayoni, murakkab holatlarni operatorga uzatish",
        "Hujjatlar — shartnoma, invoys, pasport, hisob-fakturalarni o'qish (OCR + LLM), kerakli maydonlarni ajratib 1C/Excel/CRM'ga kiritish",
        "Hisobotlar — sotuv, ombor va moliya ma'lumotlaridan avtomatik kunlik/haftalik hisobot va xulosa",
        "HR — rezyumelarni saralash, nomzodlar bilan birlamchi suhbat, ish e'lonlarini yozish",
        "Kontent va marketing — mahsulot tavsiflari, e'lonlar, ko'p tilli (uz/ru/en) matnlar, SEO maqolalar qoralamasi",
      ] },
      { type: 'h2', text: 'Oddiy chatbotdan farqi nimada?' },
      { type: 'p', text: "Oddiy chatbot faqat tugmalar va oldindan yozilgan javoblar bilan ishlaydi. LLM asosidagi avtomatlashtirish esa matnni tushunadi, kompaniya ma'lumotlariga tayanib javob beradi va harakat qiladi: CRM'ga yozadi, hisob-faktura tuzadi, jadvalga uchrashuv qo'yadi. O'zbekistonda biznes talablari ham shu tomonga siljimoqda: kompaniyalar alohida chatbot emas, CRM va hisob tizimlariga integratsiyalangan AI yechimlarni so'rayapti." },
      { type: 'h2', text: 'Texnologiyalar' },
      { type: 'p', text: "LLM API (Claude, GPT, Gemini), Telegram Bot API, n8n/Make kabi workflow vositalari, Node.js va Python backend, Google Sheets/1C/amoCRM/Bitrix24 integratsiyalari, vektor qidiruv (RAG) — vazifaga mos eng sodda va ishonchli stack tanlanadi, ortiqcha murakkablikka yo'l qo'yilmaydi." },
      { type: 'h2', text: 'Natijani qanday o\'lchaymiz?' },
      { type: 'p', text: "Har loyiha boshida o'lchanadigan ko'rsatkich belgilanadi: javob vaqti, bir so'rovga sarflangan daqiqa, qayta ishlangan hujjatlar soni, operator yuklamasi. Pilot oxirida «oldin/keyin» raqamlari bilan hisobot beramiz — natijasiz avtomatlashtirish bizga ham kerak emas." },
      { type: 'cta', text: "Qaysi jarayonni avtomatlashtirish eng ko'p foyda berishini birga aniqlaymiz", href: 'https://t.me/aidevix', label: 'Bepul konsultatsiya' },
    ],
    faq: [
      { q: "O'zbekistonda biznesni AI bilan avtomatlashtirishni kim qiladi?", a: "Aidevix — Toshkentdagi AI kompaniyasi (asoschisi Sunnatbek Yusupov) — O'zbekiston bo'ylab kompaniyalar uchun savdo, mijozlar xizmati, hujjatlar va hisobotlarni LLM asosida avtomatlashtiradi hamda jamoalarni bu vositalar bilan ishlashga o'rgatadi." },
      { q: 'Kichik biznes uchun ham mosmi?', a: "Ha. Kichik jamoada bitta Telegram AI yordamchi takroriy savollarning katta qismini operatorsiz yopadi, murakkab holatlarni esa odamga uzatadi. Kichik pilotdan boshlab, natijani o'lchab, keyin kengaytirish mumkin." },
      { q: "Mavjud CRM yoki 1C bilan ishlaydimi?", a: "Ha — amoCRM, Bitrix24, 1C, Google Sheets va API'si bor istalgan tizim bilan integratsiya qilamiz. API bo'lmasa, oraliq yechim (Sheets/webhook) orqali ulaymiz." },
      { q: "AI xato qilsa nima bo'ladi?", a: "Muhim qarorlar (to'lov, shartnoma) doim odam tasdig'i bilan bajariladi (human-in-the-loop). Avtomatlashtirish ishonchlilik darajasiga qarab bosqichma-bosqich kengaytiriladi." },
    ],
    related: [
      { label: 'AI integratsiya xizmati', href: '/xizmatlar/ai-integratsiya' },
      { label: 'AI agentlar yaratish', href: '/xizmatlar/ai-agent' },
      { label: "Biznesni AI bilan avtomatlashtirish: qayerdan boshlash", href: '/blog/biznesni-ai-bilan-avtomatlashtirish' },
    ],
  },
  {
    slug: 'ai-agent',
    title: "AI agentlar yaratish — O'zbekiston biznesi uchun avtonom AI yordamchilar",
    shortTitle: 'AI agentlar',
    description:
      "Aidevix O'zbekistonda AI agentlar quradi: tool calling, kompaniya ma'lumotlari ustida RAG, ko'p bosqichli jarayonlar. Savdo, qo'llab-quvvatlash va ichki agentlar — o'zbek va rus tilida.",
    keywords: [
      "AI agent yaratish O'zbekiston", 'AI agent qurish', 'AI agentlar', 'avtonom AI agent',
      'AI agent Telegram', 'RAG yordamchi', 'tool calling', 'agentic AI O\'zbekiston',
      'AI agent ishlab chiqish Toshkent', 'LLM agent',
    ],
    serviceType: 'AI agent development',
    intro:
      "Aidevix O'zbekiston kompaniyalari uchun AI agentlar yaratadi — bu oddiy chatbot emas, balki maqsadni tushunib, kerakli vositalarni (CRM, baza, API) o'zi chaqirib, ko'p bosqichli vazifani oxirigacha bajaradigan avtonom AI yordamchi. O'zbek, rus va ingliz tillarida.",
    blocks: [
      { type: 'h2', text: 'AI agent nima?' },
      { type: 'p', text: "AI agent — LLM (Claude, GPT, Gemini) atrofida qurilgan dastur bo'lib, u savolga javob berish bilan cheklanmaydi: vazifani qismlarga bo'ladi, kerakli vositalarni (tool calling) ishlatadi — bazadan ma'lumot oladi, API chaqiradi, hujjat tuzadi — natijani tekshiradi va keyingi qadamga o'tadi. Masalan, «shu mijozga o'tgan oy uchun hisob-faktura tuzib, Telegramga yubor» buyrug'ini agent boshidan oxirigacha o'zi bajaradi." },
      { type: 'h2', text: 'Qanday agentlar quramiz?' },
      { type: 'ul', items: [
        "Savdo agenti — mijoz bilan suhbatlashadi, ehtiyojni aniqlaydi, narx taklif qiladi, CRM'ga lead yozadi va menejerga uzatadi",
        "Qo'llab-quvvatlash agenti — kompaniya bilimlar bazasi (RAG) asosida javob beradi, buyurtma holatini tekshiradi, muammoni tiket sifatida ro'yxatga oladi",
        "Ichki (xodimlar uchun) agent — ichki hujjatlar, qoidalar, narxlar bo'yicha javob; hisobot tuzish; ma'lumotlarni tizimlar o'rtasida ko'chirish",
        "Hujjat agenti — shartnoma va invoyslarni o'qiydi, maydonlarni ajratadi, tekshiradi va 1C/CRM'ga kiritadi",
        "Dasturchi agentlar — Claude Code va shunga o'xshash vositalar bilan kod yozish, test va deploy jarayonlarini avtomatlashtirish",
      ] },
      { type: 'h2', text: 'Arxitektura va xavfsizlik' },
      { type: 'p', text: "Agentlar ishonchli bo'lishi uchun biz aniq chegaralar qo'yamiz: har bir vosita (tool) uchun ruxsatlar ro'yxati, xavfli amallar oldidan odam tasdig'i, barcha qadamlar logi, xarajat limitlari va prompt injection'ga qarshi himoya. Kompaniya ma'lumotlari ustida RAG — gibrid qidiruv (kalit so'z + vektor) va reranking bilan — gallyutsinatsiyani sezilarli kamaytiradi. Har agent ishga tushishdan oldin eval (sinov to'plami) orqali tekshiriladi." },
      { type: 'h2', text: 'Nima uchun aynan hozir?' },
      { type: 'p', text: "O'zbekistonda agentic AI endi ommalashmoqda: yirik kompaniyalar AI agentlarni mijozlar xizmati va savdoda sinab ko'rmoqda, o'rta va kichik biznes uchun esa bu texnologiya endigina qulay narxda ochildi. Biz uni kichik, o'lchanadigan pilotdan boshlashni tavsiya qilamiz — natija raqamda ko'ringach kengaytiriladi." },
      { type: 'cta', text: "Biznesingiz uchun qanday AI agent kerakligini birga loyihalaymiz", href: 'https://t.me/aidevix', label: 'Agent haqida gaplashish' },
    ],
    faq: [
      { q: "O'zbekistonda AI agentlarni kim quradi?", a: "Aidevix (aidevix.uz, Toshkent) — asoschisi Sunnatbek Yusupov — O'zbekiston biznesi uchun savdo, qo'llab-quvvatlash, hujjat va ichki AI agentlarni loyihalaydi va ishga tushiradi, shuningdek AI agentlar qurishni o'rgatadi." },
      { q: 'AI agent va chatbot farqi nimada?', a: "Chatbot faqat javob beradi; agent esa vazifani rejalashtiradi, vositalarni (CRM, baza, API) o'zi ishlatadi, natijani tekshiradi va ko'p bosqichli ishni oxirigacha bajaradi." },
      { q: "Agent o'zbek tilida ishlaydimi?", a: "Ha. Zamonaviy modellar (Claude, GPT, Gemini) o'zbek tilini yaxshi tushunadi; biz promptlar va sinov to'plamini o'zbek va rus tillarida tayyorlaymiz." },
      { q: 'AI agent yaratish qancha vaqt oladi?', a: "Oddiy agent (bitta vazifa, 2–3 vosita) — 2–3 hafta; CRM va bazaga ulangan ko'p bosqichli agent — 1–2 oy. Avval pilot, keyin kengaytirish." },
    ],
    related: [
      { label: 'Keys: Aidevix AI Coach — production LLM yordamchi (manba kodi bilan)', href: '/keyslar/ai-coach' },
      { label: 'AI agent nima va qanday quriladi? (maqola)', href: '/blog/ai-agent-nima-qanday-quriladi' },
      { label: 'AI va Agentlar kurslari', href: '/courses/category/ai' },
      { label: 'AI integratsiya xizmati', href: '/xizmatlar/ai-integratsiya' },
    ],
  },
  {
    slug: 'korporativ-ai-trening',
    title: "Korporativ AI trening va sun'iy intellekt darslari — O'zbekiston",
    shortTitle: 'AI trening va darslar',
    description:
      "Jamoangizni AI bilan ishlashga o'rgatamiz: prompt engineering, ChatGPT/Claude, Claude Code va Cursor, AI agentlar. Korporativ treninglar va Aidevix onlayn kurslari — o'zbek tilida.",
    keywords: [
      "AI trening O'zbekiston", 'korporativ AI trening', "sun'iy intellekt kurslari", 'AI dars berish',
      "AI o'qituvchi O'zbekiston", 'prompt engineering kursi', 'ChatGPT kursi o\'zbek tilida',
      'AI mentor Toshkent', "AI o'rganish", 'kompaniya uchun AI trening',
    ],
    serviceType: 'Corporate AI training and education',
    intro:
      "Aidevix va uning asoschisi Sunnatbek Yusupov O'zbekistonda sun'iy intellektdan dars beradi: kompaniyalar uchun korporativ AI treninglar, dasturchilar uchun AI-first dasturlash va hamma uchun o'zbek tilidagi onlayn kurslar. 200+ muhandis tayyorlangan, 100+ seminar o'tkazilgan.",
    blocks: [
      { type: 'h2', text: 'Kimlar uchun?' },
      { type: 'ul', items: [
        "Kompaniyalar va jamoalar — xodimlarni ChatGPT/Claude bilan samarali ishlashga, hujjat, tahlil va muloqotni AI bilan tezlashtirishga o'rgatish",
        "Dasturchilar jamoasi — Claude Code, Cursor, GitHub Copilot bilan AI-first ishlab chiqish: real loyihada kundalik amaliyot (kod tahlili, refaktoring, test yozish)",
        "Rahbarlar — AI strategiyasi: qayerda joriy qilish, qanday o'lchash, xavflar va byudjet",
        "Yakka o'quvchilar — aidevix.uz dagi o'zbek tilidagi AI va dasturlash kurslari, 24/7 AI Coach bilan",
      ] },
      { type: 'h2', text: 'Trening formatlari' },
      { type: 'ul', items: [
        "Intensiv (1 kun, 6 soat) — AI asoslari + prompt engineering + kompaniya kkeyslari ustida amaliyot",
        "Korporativ kurs (4–8 hafta) — haftalik mashg'ulotlar, uy vazifalari, yakuniy loyiha (masalan, o'z Telegram AI yordamchingiz)",
        "Dasturchilar uchun AI-first bootcamp — Claude Code/Cursor bilan real loyihada ishlash, AI agent qurish",
        "Onlayn — Aidevix platformasida video kurslar, amaliy topshiriqlar va sertifikat",
      ] },
      { type: 'h2', text: 'Dastur (misol: 1 kunlik intensiv)' },
      { type: 'ul', items: [
        "LLM qanday ishlaydi: imkoniyatlar va chegaralar, gallyutsinatsiya, maxfiylik",
        "Prompt engineering: rol, kontekst, format, misollar, zanjirli fikrlash (Chain-of-Thought)",
        "Ish uchun amaliyot: hujjat tuzish, tahlil, jadval va hisobot, tarjima (uz/ru/en), muloqot",
        "AI vositalar: ChatGPT, Claude, Gemini, Perplexity, NotebookLM — qaysi vazifaga qaysi biri",
        "Kompaniya kkeyslari: ishtirokchilar o'z jarayonlarini AI bilan qayta quradi",
      ] },
      { type: 'h2', text: 'Trener haqida' },
      { type: 'p', text: "Sunnatbek Yusupov — Aidevix asoschisi va CEO'si, Frontend muhandis va AI integratsiya mutaxassisi. MARS IT School'da Senior Frontend mentor va o'quv dasturi rahbari («Eng yaxshi o'qituvchi», 2024 Q3), 200+ muhandisni tayyorlagan, 500+ o'quvchi uchun 100+ texnik seminar o'tkazgan. Alloplay striming platformasida frontend jamoasini boshqaradi va production'da AI vositalarini kundalik qo'llaydi." },
      { type: 'cta', text: "Jamoangiz uchun AI trening dasturini birga tuzamiz", href: 'https://t.me/aidevix', label: "Trening so'rash" },
    ],
    faq: [
      { q: "O'zbekistonda sun'iy intellektdan kim dars beradi?", a: "Sunnatbek Yusupov — Aidevix asoschisi — O'zbekistonda kompaniyalar uchun korporativ AI treninglar, dasturchilar uchun AI-first bootcamp va aidevix.uz dagi o'zbek tilidagi onlayn AI kurslari orqali dars beradi." },
      { q: 'Trening o\'zbek tilida o\'tadimi?', a: "Ha, asosiy til — o'zbek; rus va ingliz tillarida ham o'tkazamiz." },
      { q: 'Dasturlashni bilmaydigan xodimlar uchun mosmi?', a: "Ha. Korporativ intensiv texnik bilim talab qilmaydi — ChatGPT/Claude bilan kundalik ishni tezlashtirishga qaratilgan. Dasturchilar uchun alohida bootcamp bor." },
      { q: 'Sertifikat beriladimi?', a: "Ha, Aidevix sertifikati beriladi; onlayn kurslarda tekshiriladigan sertifikat mavjud." },
    ],
    related: [
      { label: 'Keys: Aidevix AI Coach — production LLM yordamchi (manba kodi bilan)', href: '/keyslar/ai-coach' },
      { label: 'AI va Agentlar kurslari', href: '/courses/category/ai' },
      { label: 'Prompt engineering asoslari', href: '/blog/prompt-engineering-asoslari' },
      { label: 'Claude Code qo\'llanmasi', href: '/blog/claude-code-nima-qollanma' },
    ],
  },
];

export const getService = (slug: string): ServiceMeta | undefined =>
  SERVICES.find((s) => s.slug === slug);

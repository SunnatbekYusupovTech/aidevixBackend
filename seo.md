# 📊 Aidevix.uz — Umumiy SEO Audit Hisoboti va Harakatlar Rejasi

**Hisobot sanasi:** 31-iyul, 2026-yil
**Sayt yoshi (GSC bo'yicha):** 3 oy (17-aprel, 2026-yildan beri)

## 📑 Qisqacha Xulosa (Executive Summary)

Sayt o'zining ilk oylaridayoq Google qidiruv tizimida juda yaxshi boshlang'ich natijalarni qayd etmoqda. Texnik SEO va xavfsizlik (HTTPS, sitemap, robots.txt) a'lo darajada sozlangan. Saytga IT (xususan, ChatGPT va Kiberxavfsizlik) mavzularida organik qidiruvlar orqali kunlik taassurotlar (impressions) keskin oshgan. 
**Asosiy muammo:** Ko'rinishlar soni ko'p bo'lsa-da, ularning klikka aylanish ko'rsatkichi (CTR) va tashqi havolalar (Backlinks) soni o'ta past darajada. Asosiy e'tibor kontentni jozibador qilishga va link-building'ga qaratilishi shart.

---

## 🛠 1. Texnik SEO va Xavfsizlik (Technical Health)

Saytning texnik poydevori mustahkam. Google botlari saytni muammosiz o'qiy olyapti.

* **Skanerlash (Crawling):** `robots.txt` fayli to'g'ri sozlangan. Oxirgi 90 kunda Google botlari saytga **1440 marta** murojaat qilgan. Bu qidiruv tizimi saytingizni faol kuzatayotganini bildiradi.
* **Indekslash (Indexing):** 31 ta sahifa muvaffaqiyatli indekslangan. 
  * *Muammo:* 9 ta sahifa indekslanmagan (asosan 8 ta "Redirect error").
* **Sayt xaritasi (Sitemap):** `/sitemap.xml` muvaffaqiyatli (Success) o'qilgan va undan 99 ta sahifa topilgan.
* **Xavfsizlik (HTTPS):** 100% xavfsiz. 13 ta asosiy sahifa HTTPS orqali xatosiz ishlamoqda.
* **Strukturaviy ma'lumotlar:** Breadcrumbs (Non ushoqlari) 8 ta sahifada to'g'ri ishlamoqda. Xatoliklar yo'q.

## 📈 2. Samaradorlik va Trafik (Performance & Traffic)

Oxirgi oylarda o'sish dinamikasi ijobiy. Sayt ma'lum bir kalit so'zlarda qidiruv natijalarida yaxshi o'rinlarni egallamoqda.

* **Asosiy ko'rsatkich (3 oylik):** 4.59K taassurot (impressions) va 236 ta klik (clicks).
* **So'nggi 28 kunlik o'sish:** Taassurotlar **2947% ga** (4.39K gacha), kliklar esa **98% ga** (125 tagacha) oshgan.
* **Eng kuchli so'rovlar:**
  * *Brend bo'yicha:* `aidevix` (Yaxshi CTR).
  * *Organik:* `chatgpt dan foydalanish` (1500+ marta ko'ringan, lekin atigi 18 ta klik), `kiberxavfsizlik kurslari`.
* **Muammoli sahifa:** `/about` (Biz haqimizda) sahifasining ko'rinish ko'rsatkichi 68% ga tushib ketgan.

## 🔗 3. Havolalar Profili (Link Profile)

Saytning obro'sini (Domain Authority) belgilovchi eng muhim omil hozircha e'tiborsiz qoldirilgan.

* **Tashqi havolalar (Backlinks):** **0 ta**. Boshqa saytlardan Aidevix.uz ga umuman havola berilmagan.
* **Ichki havolalar (Internal Links):** Atigi **12 ta**. Bu saytdagi ba'zi maqolalar bir-biriga bog'lanmaganini (yetim sahifalar - orphan pages) ko'rsatadi.

---

## 🎯 Zudlik Bilan Bajarilishi Kerak Bo'lgan Harakatlar Rejasi (Action Plan)

Ushbu audit xulosalariga tayanib, quyidagi ishlarni ustuvorlik darajasi bo'yicha amalga oshirishni qat'iy tavsiya qilaman:

### 🔴 Yuqori Ustuvorlik (Darhol qilinishi kerak)

1. **Sarlavha va Meta-tavsiflarni (CTR) optimallashtirish:**
   * Saytdagi "ChatGPT" va "Kiberxavfsizlik" ga oid maqolalarning Title qismini jozibaliroq qiling. *(Misol: "ChatGPT nima?" o'rniga "ChatGPT'dan qanday to'g'ri foydalanish kerak? | To'liq qo'llanma" deb yozing)*. Maqsad: 1500 ta ko'rgan odamning kamida 10-15% qismi saytga kirishini ta'minlash.

2. **Tashqi havolalar (Backlinks) yig'ish:**
   * Sayt nufuzini oshirish uchun hamkor saytlar, forumlar (masalan, Coder.uz, Uznet forumlari) va ijtimoiy tarmoqlarda o'z maqolalaringizga havolalar qoldiring.

### 🟡 O'rta Ustuvorlik (1-2 hafta ichida)

1. **Indekslash xatolarini tozalash:**
   * "Pages" bo'limidagi 8 ta "Redirect error" berayotgan URL'larni tekshiring. Agar ular muhim sahifalar bo'lsa, yo'naltirish (301 redirect) sozlamalarini to'g'irlang.
   * *Texnik qismda to'g'rilanishi: next.config.js da redirect'larni tekshirish kerak.*

2. **Ichki SEO va Bog'lanish (Internal Linking):**
   * Yangi maqola yozganda saytning boshqa sahifalariga (kurslarga yoki eski maqolalarga) ssilka (hyperlink) bering.
   * Bosh sahifa va Footer orqali asosiy kurslarga va maqolalarga doimiy ssilkalar joylashtirish.

3. **Mualliflar profilini yaratish (E-E-A-T):**
   * Saytda ustozlar (masalan, Sunnatbek Yusupov) uchun to'liq profillar yarating va ularga `Person` schema markup kodini qo'shing. (GSC'dagi Profile page bo'limi ishlashi uchun).

### 🟢 Past Ustuvorlik (Doimiy jarayon)

1. **Yangi kontent strategiyasi:**
   * So'nggi 28 kundagi yutuqli tendensiyani saqlab qolish uchun IT, dasturlash va SI (AI) haqida haftasiga kamida 1-2 ta SEO-maqola yozib boring.

2. **Core Web Vitals kuzatuvi:**
   * Hozircha ma'lumot yo'q, ammo kelajakda sayt tezligini (PageSpeed Insights orqali) va mobil moslashuvchanligini doimiy nazorat qilib boring.

---
## 💻 Texnik Fix Qilinishi Kerak Bo'lgan Kodlar (Frontend/Backend)
- [x] O'qituvchi profil sahifalari uchun Schema.org (Person/ProfilePage) qo'shish
- [x] Barcha maqolalar (blog/kurs) uchun Schema.org (Article/Course) qo'shish
- [x] about sahifasi SEO tags tekshiruvi.
- [x] sitemap.xml da 99 ta page, ortiqchasini tozalash (masalan, keraksiz arxiv page'lar orqali).
- [x] Sarlavhalarni CMS dan to'g'rilash: SEO-friendly title va meta description orqali.

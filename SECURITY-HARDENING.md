# Sayt va Telegram himoyasi — 2026-10-26

Maqsad: DevTools skriptlari va avtomatik klientlar orqali ma'lumot yig'ish,
so'rov limitlarini chetlab o'tish va Telegram hisobiga noto'g'ri kirish yo'llarini
yopish. O'zgarishlar lokal kodda tekshirildi. Foydalanuvchi GitHub push va Railway
production deploy'ga ruxsat berdi; deploy natijasi Obsidian changelog'da yoziladi.
Kalitlarni almashtirish va production bazani o'zgartirish bajarilmadi.

Brauzer yoki ochiq kanalda foydalanuvchiga ko'rsatilgan kontentni nusxalashni
mutlaq to'xtatib bo'lmaydi. Himoya server ruxsatlari, ma'lumotni kamaytirish,
so'rov kvotalari va Telegram sender tekshiruvlariga qo'yildi. DevTools'ni bloklash
yoki User-Agent matniga qarab "AI" deb topish xavfsizlik chegarasi sifatida ishlatilmaydi.

## Tasdiqlangan muammolar va tuzatishlar

| Joy | Oldingi muammo | Natija va isbot |
| --- | --- | --- |
| API IP limitlari | `ipKeyGenerator`ga IP o'rniga request obyekti berilgan. MemoryStore har requestni yangi kalit deb olgan; murakkab kalitlar esa turli IP'larni birlashtirgan. | `req.ip` bilan IPv4/IPv6 limit ishlaydi. Uch regressiya oldin yiqildi, keyin o'tdi: ortiqcha so'rov `429`, boshqa IP ishlaydi, bitta IPv6 /56 ichida IP aylantirish yordam bermaydi. |
| API avtomatlashtirish | Qisqa so'rov oqimi va bir akkauntning turli IP'lardan foydalanishi alohida hisoblanmagan. | IP uchun 120/min va mavjud 500/15 min; imzosi tekshirilgan akkaunt uchun 300/15 min. Tekshiruv body parsing va DB'dan oldin. Akkaunt kaliti auth ruxsati bermaydi; odatiy session/tokenVersion tekshiruvi saqlanadi. |
| Vercel proxy | `src/app` ishlatilgan loyihada middleware root papkada turgan va production build'ga umuman kirmagan. Ikki rewrite alias matcher'da ham bo'lmagan; ayrim yo'llarda resource ID yangi bucket yaratgan. | Middleware `frontend/src/middleware.ts`ga ko'chirildi. `/api/proxy/*`, `/api-proxy/*`, `/api/*` bitta auth/API kvotasiga normallanadi. Edge hisoblagichlari 10 000 ta bilan cheklanadi; faol limitlar o'chirilmaydi. To'rtta frontend testi va alohida build manifest regressiyasi tekshiradi. |
| Ro'yxat API'lari | Manfiy `limit` MongoDB'da mutlaq qiymat sifatida ishlashi mumkin; juda chuqur pagination katta DB ishini keltirgan. | Kurs, reyting, video, prompt, forum, XP va tegishli history/list endpointlarida musbat limit hamda page chuqurligi chegaralandi. To'lov summasi/holati mantiqi o'zgarmadi. |
| Javobdagi ma'lumot | Prompt like va forum/video ovozlari boshqa foydalanuvchilarning ID ro'yxatini qaytargan. Saqlangan promptda obuna read gate bo'lmagan. | Prompt likes faqat o'z ID'sini yoki bo'sh massivni beradi; ovoz soni/score saqlanadi. Saved prompt ham obunani tekshiradi. 27 API regressiyasi o'tadi. |
| Telegram bot va kanallar | Guruhdagi login havolasi guruhga berilgan; istalgan actor bot qo'shilgan kanalni broadcast ro'yxatiga kiritgan; hardcoded admin fallback va sender limitsiz dispatch bo'lgan. | Hisob buyruqlari faqat caller'ning private chatida. Kanal enrollment faqat sozlangan administrator uchun. Sender 20/min, login 3/min, obuna tekshiruvi 6/min. Yangi bot/scheduler xabarlarida `protect_content`. 26 test o'tadi. |
| Telegram auth va sessiyalar | Magic/link kod muddati faqat kechikishi mumkin bo'lgan DB TTL cleanup'ga tayangan; link proof replay va overwrite mumkin bo'lgan. HTTP/socket session hard cap to'liq tekshirilmagan. | Magic kod 15 min, link proof 5 min, atomik bir martalik claim; tasdiqlangan boshqa Telegram ID ustidan yozilmaydi. Session-bound HTTP va yangi socket ulanishlari muddati/revocation tekshiradi. |
| Token va HTTP javoblar | Faqat `X-Client-Type: mobile` headeri secret yo'qligida raw tokenlarni JSON'da chiqargan; API javoblarida umumiy no-store siyosati bo'lmagan. | Raw JSON token faqat sozlangan mobile proof bilan. API javoblari `private, no-store`; Redis'ning ochiq katalog uchun alohida server keshi saqlanadi. Backend va frontend `X-Powered-By`ni bermaydi. |

Payme/Click'ning aynan uchta POST webhook'i umumiy brauzer kvotasidan ajratilgan:
`/api/payments/payme`, `/api/payments/click/prepare`, `/api/payments/click/complete`.
Ular mavjud maxsus 600/15 min webhook limiti va provider autentifikatsiyasidan o'tadi.
Qolgan payment endpointlari umumiy himoyadan o'tadi.

## Production uchun qolgan ishlar

1. **Deploy va smoke test.** Ushbu hujjat deploy oldidan tayyorlandi; joriy deploy
   natijasi Obsidian changelog'da qayd etiladi. Staging/production'da
   Vercel → Railway orqali haqiqiy `req.ip` kelishini tekshirish zarur: noto'g'ri
   proxy hop hammani bir IP kvotasiga birlashtirishi mumkin. `TRUST_PROXY`ni
   taxminan oshirish yoki klient yuborgan IP headeriga ishonish yechim emas.
   Login, refresh, kurs/video, payment callback va admin bot oqimini tekshiring.
2. **Umumiy hisoblagich.** `REDIS_URL` bo'lmasa backend limitlari har processda
   alohida; Edge limiter ham har isolate'da alohida. Ko'p replica bo'lsa Redis kerak.
   Redis sozlanganida store xatosi limitni ochiq qoldirmaydi. Bitta bot polling
   processi ishlasin (`RUN_TELEGRAM_BOT`); Telegram budget restartda yangilanadi.
3. **Botlarga qarshi human challenge.** Mavjud CAPTCHA gate opt-in:
   `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET` va frontend `NEXT_PUBLIC_TURNSTILE_SITE_KEY`ni
   Turnstile va haqiqiy domen bilan moslang. Backend hCaptcha'ni ham qo'llaydi,
   lekin joriy frontend'da faqat Turnstile widgeti ulangan.
   Ushbu ishda production qiymatlari tekshirilmadi va CAPTCHA yoqilmadi.
   Edge WAF/bot challenge distributed trafik uchun zarur; ilova kvotalari tarmoqni
   to'ldiradigan katta hujumni chekka qatlamda to'xtatmaydi.
4. **Oldingi sirlar.** Obsidian'ning oldingi yozuvlari oshkor kalitlar hali
   almashtirilmaganini aytadi. Bu ish kalitlarni rotate qilgani yo'q. Qaysi kalit
   tarqalganini tekshirib, providerda almashtirish va eski kalitni bekor qilish kerak.
   Sir qiymatini chat, hisobot yoki gitga yozmang.
5. **Telegram administrator.** `TELEGRAM_ADMIN_CHAT_ID` haqiqiy individual admin
   ID'si bo'lsin; yo'q/noto'g'ri bo'lsa bot admin amallari yopiladi. Avvalgi
   `BotChannel` yozuvlari avtomatik tozalanmadi: broadcast manzillarini ko'rib chiqing.
   Kanal administrator sozlamalarida Restrict Saving Content va a'zolik ruxsatlarini
   tekshiring. Koddagi protection yangi xabarlarga tegishli; tarixiy postlar o'zgarmadi.
6. **Moslik va DB chegaralari.** Native mobile client raw token uchun
   `MOBILE_API_SECRET`ga mos proof yuborishi kerak; mobile app bu repoda yo'q va
   tekshirilmadi. Faqat legacy social ID'si bor Telegram akkauntlari qayta tasdiqlanadi.
   Avval ulangan socketlar majburan uzilmaydi; sidless legacy tokenlar eski version
   tekshiruvini saqlaydi. `User.telegramUserId`ning nonunique indeksi bo'yicha
   cross-account parallel bog'lanish ehtimoli alohida DB/duplicate tekshiruvini talab
   qiladi; unique indeks migratsiyasi bajarilmadi.

## Tekshiruv va qamrov

Baseline: backend 11 suite / 147 test o'tgan; frontend `tsc --noEmit` o'tgan.
Yangi xavfsizlik holatlari avval yiqiluvchi test bilan isbotlandi, keyin tuzatildi.

Yakuniy tekshiruvlar:

- Backend: **16 suite, 230/230 test**, 0 yiqilish (`--runInBand --silent --json`).
- Frontend middleware xulqi: **4/4** test; build manifest regressiyasi: **1/1** test.
- `npm.cmd run typecheck`: o'tdi.
- `npm.cmd run build`: o'tdi, 81 sahifa yaratildi, `Middleware 34 kB` build'ga kirdi.
- O'zgargan JS fayllarning `node --check` tekshiruvi va `git diff --check`: o'tdi.
- CI endi frontend xulqi va build manifest testlarini ham ishga tushiradi.

Dastlabki build sandbox Google Fonts ulanishini bloklagani uchun yiqildi;
tarmoq ruxsati bilan qayta tekshiruv o'tdi. Middleware'ni ko'chirishdan oldingi
build manifest testi kutilganidek yiqildi (`middleware` bo'sh); keyingi build va
test o'tdi. Bir umumiy backend run diagnostikasiz exit 1 qaytardi; mustaqil,
JSON natijasi saqlangan to'liq takroriy run 230/230 bilan o'tdi.

Takrorlash:

```powershell
# backend papkasida
node node_modules/jest/bin/jest.js --runInBand --silent
node --check index.js

# frontend papkasida
npm.cmd run test:security
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:security:build
```

Dinamik tekshiruvlar lokal Express/Jest, soxta identifikatorlar, mocked DB/provider
va frontend middleware harnessida o'tkazildi. Production/staging integratsiyasi,
real MongoDB concurrency/index xulqi, payment provider va Telegram bilan jonli
oqim, yuklama testi va paket advisory auditi ushbu o'tishda tekshirilmadi.

Bu maqsadli hardening; butun repo xavfsizlik auditi yakunlandi degan xulosa emas.
`.audit/security-2026-10-26/api-surface.json` 200 route deklaratsiyasini inventar
qiladi; API agent 19 tasini regressiya testlariga bog'ladi, 70 tasida binding va
tanlangan projectionni ko'rdi, qolganlari uning doirasida tekshirilmagan deb
belgilangan. Auth agent umumiy auth chegaralari va auth route handlerlarini,
Telegram agent dispatch/admin/channel chegaralarini alohida tekshirdi.
Batafsil lokal dalillar `.audit/security-2026-10-26/` ichida, gitga kiritilmaydi.

Rasmiy manbalar: [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/),
[express-rate-limit helper contract](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/reference/changelog.mdx),
[Telegram content protection](https://core.telegram.org/bots/api#sendmessage).

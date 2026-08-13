# Plan 6 — `Course.videos` drift'i

**Sana:** 2026-08-12
**Holat:** dizayn tasdiqlangan, ijro rejasi kutilmoqda
**Repo:** `AiDeVix/aidevixBackend` (yagona repo)
**Kelib chiqishi:** Plan 5 ning yakuniy butun-branch review'i

---

## 1. Nima uchun

Plan 5 ning 1-tuzatishi `markVideoWatched` ga a'zolik tekshiruvini qo'shdi va shu bilan
`Course.videos` massivini **vakolatli** qildi: u ham guard'ning manbai, ham
`progressPercent` ning maxraji. Yakuniy review shuni ko'rsatdiki, massiv o'zi ishonchli
emas — va ilgari buni ixtiyoriy-ID teshigi yashirib turgan edi.

Bu Plan 5 kiritgan regressiya emas. Bu Plan 5 **fosh qilgan** latent muammo, va bugundan
boshlab jonli.

## 2. Ildiz sabab — ikkita haqiqat manbai

`Course.videos` ga faqat bitta joy yozadi va uni hech kim tuzatmaydi:

| Joy | Nima qiladi |
|---|---|
| `videoController.js:409` + `:422` | `Video.create(...)` so'ng `Course.updateOne({$push})` — **tranzaksiyasiz ikki yozuv** |
| `videoController.js:509` | `video.deleteOne()` — massivdan **`$pull` QILMAYDI** |
| `videoController.js:463` | `updateVideo` `isActive: false` qila oladi — massivga **ta'sir qilmaydi** |

Ayni paytda tizimning qolgan qismi teskari havolani o'qiydi:

| Joy | So'rov |
|---|---|
| `videoController.js:118-124` (`getCourseVideos`) | `Video.find({ course, isActive: true })` |
| `enrollmentController.js:231-235` (`continueLearning`) | `Video.findOne({ course, isActive: true })` |

Kod bo'yicha tekshirildi: `Course.videos` ning **yagona o'quvchisi** —
`markVideoWatched` ning ikkita qatori (`enrollmentController.js:91-92` guard,
`:110` maxraj). Boshqa hech kim. (`videosWatched` — `UserStats` dagi boshqa maydon,
adashtirmang.)

**TUZATISH (final whole-branch review, 2026-08-13): yuqoridagi "yagona o'quvchi"
da'vosi NOTO'G'RI edi.** Kod bo'yicha qayta tekshirildi — uchta o'quvchi bugun ham
tirik:

| Joy | Nima qiladi |
|---|---|
| `courseController.js:58` (`getAllCourses`) | `Course.find(filter)...lean()` — **proyeksiyasiz**, ya'ni xom massiv `GET /api/courses`ning har bir elementida jo'natiladi |
| `courseController.js:155-160` (`getCourse`) | `.populate({ path: 'videos', match: { isActive: true } })` — kurs tafsilot sahifasining dars ro'yxatini shakllantiradi |
| `rankingController.js:46` (`getTopCourses`) | `.select('... instructor videos createdAt')` — xom massiv `GET /api/ranking/courses`da ham jo'natiladi |

Ikkitasi (`getAllCourses` va ranking'ning `getTopCourses`i) xom massivni
**o'zgarishsiz** jo'natadi. Faqat `getCourse`ning `populate`i xavfsiz — Mongoose
`populate` mavjud bo'lmagan `ref`larni tashlab yuboradi va `match: { isActive: true }`
bilan qo'shimcha filtrlaydi, ya'ni eskirgan yoki nofaol ID'lardan zararlanmaydi.

Va bu foydalanuvchiga ko'rinadigan oqibatga olib keladi:
`frontend/src/components/courses/CourseCard.tsx:90` —
`course.videos?.length ?? course.videoCount ?? 0` — dars-soni belgisini shu bilan
hisoblaydi. `getAllCourses` va ranking'ning `getTopCourses`i har doim `videos`ni
ta'minlagani uchun `videoCount` fallback'i hech qachon ishga tushmaydi — ya'ni belgi
bugun xom massiv uzunligining o'zi. Har o'chirilgan yoki nofaol qilingan video bu
belgini abadiy shishiradi.

**Xulosa: pastdagi §5'dagi "massiv saqlanadi, migratsiya kerak emas — chunki hech
kim o'qimaydi" qarori noto'g'ri asosda qabul qilingan va endi hal qilinmagan ochiq
savol, yopilgan qaror emas.**

## 3. Oqibatlari — uchta jonli xato

1. **Sertifikat abadiy bo'g'iladi.** `Course.videos` da jonli `Video` hujjatiga mos
   kelmaydigan bitta ID bo'lsa ham, `watchedVideos.length` hech qachon
   `course.videos.length` ga yetmaydi → `progressPercent` 100 ga chiqmaydi →
   `_issueCertificate` (`:120`, yagona chaqiruv joyi) **hech qachon ishlamaydi**.
2. **Yumshoq o'chirilgan video maxrajni shishiradi.** `isActive: false` qilingan dars
   talabaga ko'rinmaydi (`getCourseVideos` uni filtrlaydi), lekin massivda qolgani
   uchun 100% ga yetishni to'sadi.
3. **Progress 100 dan oshib ketishi mumkin.** Ko'rilgan video keyin o'chirilsa,
   `watchedVideos.length` maxrajdan katta bo'lib qoladi.

## 4. Yechim — massivni o'qishni to'xtatish

`markVideoWatched` da `Course` yuklamasi `Video` so'roviga almashtiriladi:

```js
Video.find({ course: courseId, isActive: true }).select('_id').lean()
```

Shu bitta so'rov uchchalasini beradi:

- **a'zolik** — `videoId` qaytgan to'plamda bormi
- **maxraj** — to'plam o'lchami
- **surat** — `watchedVideos` dan faqat hamon to'plamda bo'lganlari sanaladi

### 4.1 Nima uchun bu to'g'ri shakl

- **So'rovlar soni o'zgarmaydi.** `course` hujjati boshqa hech qayerda ishlatilmaydi —
  `_issueCertificate(req.user, courseId, enrollment._id)` (`:120`) `courseId` **satrini**
  oladi, hujjatni emas. Ya'ni bitta so'rov ikkinchisiga almashadi, qo'shilmaydi.
- **Indeks qoplaydi.** `models/Video.js:81` — `videoSchema.index({ course: 1, isActive: 1 })`.
- **Izchillik.** Progress endi talaba kurs sahifasida haqiqatan ko'radigan to'plam
  bo'yicha hisoblanadi, chunki `getCourseVideos` aynan shu so'rovni ishlatadi.

### 4.2 Ataylab qabul qilinadigan xatti-harakat o'zgarishi

Ko'rilgan video keyin `isActive: false` qilinsa yoki o'chirilsa, foydalanuvchi u uchun
kreditni **yo'qotadi** — surat ham, maxraj ham bir xil to'plam bo'yicha hisoblanadi.
Bu to'g'ri: aks holda progress 100 dan oshib ketadi. Muqobili (surat filtrlanmasa)
3-bandni ochiq qoldiradi.

## 5. `Course.videos` massivi

Foydalanuvchi qarori: **massiv saqlanadi**, lekin `deleteVideo` endi undan `$pull`
qiladi (`videoController.js:509` yonida, `video.deleteOne()` bilan bir joyda).

Sabab (asl, 2026-08-12): shu o'zgarishdan keyin massivni hech kim o'qimaydi, lekin
bazada bilib turib noto'g'ri ma'lumot qoldirish keyingi kishini chalg'itadi — va
agar kimdir ertaga uni o'qisa, jimgina xato qiladi. Ikki qatorlik narx.

**TUZATISH (final whole-branch review, 2026-08-13): yuqoridagi sabab noto'g'ri
asosga qurilgan edi.** §2'da tuzatilganidek, massivni "hech kim" o'qimaydi degani
yolg'on — uni bugun ham uchta joy o'qiydi, ikkitasi xom holda jo'natadi, va
`CourseCard`ning dars-soni belgisi shu orqali shishadi. `$pull` qo'shish (Task 2)
hamon o'zi to'g'ri qadam edi — eskirgan massivni tozalash hech qachon zarar
qilmaydi — lekin "migratsiya kerak emas, chunki o'qilmaydi" degan asoslama endi
ushlab turmaydi.

**Bu endi yopilgan qaror emas, ochiq savol: foydalanuvchi ikkalasidan birini
tanlashi kerak** — (a) migratsiya: mavjud kurslardagi eskirgan massiv yozuvlarini
`Video.find({course, isActive:true})` to'plamiga moslab tozalash, yoki (b) uchta
o'quvchini proyeksiya/populate bilan tuzatish (masalan `getAllCourses` va
ranking'ning `getTopCourses`iga `getRecommendedCourses`dagidek `.select('-videos')`
qo'shish). Bu tanlov shu review qamrovidan tashqarida — faqat hujjatlashtirildi.

**Schema'dan olib tashlanmaydi** — bu hamon amal qiladi, chunki `getCourse`ning
`.populate({ path: 'videos', ... })`i schema'dagi array `ref`ga tayanadi.
**Migratsiya qilinmaydi** — bu endi ATAYLAB QARORI EMAS, yuqoridagi ochiq savolning
javobi kutilmoqda. Mavjud kurslardagi eskirgan massiv yozuvlari o'z joyida qoladi;
`markVideoWatched`ga ular ta'sir qilmaydi (Task 1 buni yopdi), lekin
`getAllCourses` va ranking'ning `getTopCourses`i orqali hamon foydalanuvchiga xato
ma'lumot ko'rsatadi.

## 6. Testlar

Mavjud `backend/__tests__/integration/enrollment.routes.test.js` `Course.findById` ni
mock qiladi — u `Video.find` ga o'tishi kerak. Plan 5 qo'shgan ikkita test (begona ID
rad etiladi, tegishli ID qabul qilinadi) **saqlanadi va ishlashda davom etishi shart**.

Qo'shiladigan holatlar, har biri bandiga mos:

| Test | Nimani isbotlaydi |
|---|---|
| Massivda ID bor, lekin `Video` yo'q → sertifikat CHIQADI | 3.1 yopildi |
| Kursda `isActive:false` video bor → maxrajga kirmaydi, 100% ga yetiladi | 3.2 yopildi |
| Ko'rilgan video keyin nofaol → `progressPercent` ≤ 100 | 3.3 yopildi |
| `deleteVideo` `Course.videos` dan `$pull` qiladi | §5 |

Har birida TDD: test avval qizil bo'lishi SHART. 3.1 uchun bu ayniqsa muhim — hozirgi
kod bilan sertifikat chiqmasligi kerak, ya'ni test qizil bo'ladi.

## 7. Qamrovdan tashqari — ataylab

- **DB migratsiyasi.** Mavjud eskirgan massiv yozuvlari tozalanmaydi (§5).
- **`Course.videos` ni schema'dan olib tashlash** (§5).
- **`createVideo` ning tranzaksiyasiz ikki yozuvi** (`videoController.js:409`, `:422`).
  Shu tuzatishdan keyin uning oqibati yo'qoladi: `$push` muvaffaqiyatsiz bo'lsa ham
  `markVideoWatched` massivni o'qimaydi, ya'ni dars baribir hisobga olinadi. Massiv
  vaqtincha to'liq bo'lmasligi mumkin, lekin bu endi hech narsani buzmaydi.
- **`updateVideo` ning `isActive` yo'li** — o'zgarmaydi; yangi hisob-kitob uni to'g'ri
  qamrab oladi.

## 8. Xavflar

| Xavf | Yumshatish |
|---|---|
| Yangi hisob-kitob mavjud foydalanuvchilarning progressini o'zgartirishi | Ataylab (§4.2), va yo'nalish deyarli har doim foydaga: bo'g'ilgan kurslar endi tugallanadi |
| `Video.find` katta kursda qimmat bo'lishi | Faqat `_id` proyeksiyasi, `{course:1,isActive:1}` indeksi bilan; kurslar o'nlab darslar tartibida |
| Mavjud ikkita test mock almashuvida jimgina buzilishi | Ular SAQLANADI va reja ularning hamon o'tishini majbur qiladi |
| `$pull` ning `deleteVideo` da xato tashlashi | `deleteOne()` bilan bir tranzaksiyada emas; xato bo'lsa video o'chadi-yu massivda qoladi — bu bugungi holat, ya'ni yomonlashtirmaydi |

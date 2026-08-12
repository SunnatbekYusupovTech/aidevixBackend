# Plan 4 — mkhls §15.2: deploy oldidan hal qilinishi shart bo'lgan uchta band

**Sana:** 2026-08-12
**Holat:** dizayn tasdiqlangan, ijro rejasi kutilmoqda
**Repo:** `AiDeVix/mkhls-streamer` (Go), branch `feat/vod-local-pipeline`, `bc97f80`
**Oldingi kontekst:** `docs/superpowers/HANDOFF.md`, `specs/2026-08-05-video-streaming-mkhls-design.md` §15.2, §16

---

## 1. Nima uchun

Spec §15.2 uchta bandni "bosqich 9 (deploy) dan oldin hal qilinishi SHART" deb belgilagan.
Ularning hech biri bu ish yaratgan emas — hammasi oldindan mavjud mkhls xatti-harakati,
mkhls'ga ko'chish ularni faqat **ko'rinadigan** qildi.

Bu spec ularni kod bo'yicha qayta o'qishdan keyin yozildi, va o'qish ikkita narsani
o'zgartirdi: 1-bandning haqiqiy ta'siri spec'da yozilganidan **jiddiyroq**, 2-bandniki
esa **torroq**.

## 2. Muhit qarori — bu spec shunga tayanadi

Foydalanuvchi tasdiqladi: **production `source_type: local`**, dev'dagi kabi — videolar
serverning o'z diskida, S3 ishlatilmaydi. Dev stack allaqachon shunday ishlaydi
(`aidevixBackend/docker-compose.dev.yml:11-14`: `MKHLS_VOD_SOURCE_TYPE: "local"`,
`MKHLS_VOD_ROOT_PATH: "/media"`, `MKHLS_VOD_CACHE_PATH: "/cache"`).

Bu qaror 2-bandni keskin toraytiradi (S3 placeholder'lari Aidevix uchun ahamiyatsiz)
va 1-bandni to'g'ridan-to'g'ri kritik yo'lga qo'yadi (`local` manba aynan buzuq bo'lgani).

## 3. Band 1 — `LocalVideoSource.findVideoFile` kengaytma bug'i

### 3.1 Bug

`pkg/storage/video_source.go:108-116`:

```go
func (s *LocalVideoSource) findVideoFile(streamID string) (string, error) {
	for _, ext := range s.extensions {
		path := filepath.Join(s.rootPath, streamID+ext)
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("video not found: %s", streamID)
}
```

Kengaytmani **oldin tekshirmasdan** qo'shadi. Aidevix'ning `streamPath`i
`aidevix/<id>.mp4` — kengaytma bilan. Natija: `aidevix/<id>.mp4.mp4` qidiriladi,
topilmaydi.

Xuddi shu faylda `S3VideoSource.findS3Video:253-275` **to'g'ri** ishlaydi: avval
`filepath.Ext(streamID)` ni oladi, u qo'llab-quvvatlanadigan ro'yxatda bo'lsa
ID'ni **o'zgartirmasdan** sinaydi, faqat keyin kengaytma qo'shib ko'radi.

### 3.2 Haqiqiy ta'sir — spec §15.2 da yozilganidan jiddiyroq

`findVideoFile` faqat JIT yo'lidan chaqiriladi
(`internal/streaming/jit/transcoder.go:176, 283, 322` → `videoSource.GetVideoPath` /
`GetVideoInfo`). Aidevix'ning normal oqimi JIT'ga tegmaydi, shuning uchun Plan 3
Task 8 dagi jonli stack sinovi muvaffaqiyatli o'tgan — bu **yolg'on tinchlik** edi.

`internal/interfaces/http/handler/vod_handler.go` da tartib:

| Qator | Nima |
|---|---|
| 234-239 | Cache'dagi `master.m3u8` o'qiladi; bor bo'lsa xizmat qilinadi va **qaytadi** |
| 242-244 | **Faqat cache fayli yo'q bo'lsa** JIT'ga tushadi |
| 254 | `triggerPreTranscode(videoID)` — **faqat JIT muvaffaqiyatli bo'lsa** |

Ya'ni cache fayli yo'qolgan har qanday holatda (`cache_max_size` bo'yicha eviction,
cache volume tozalanishi, DB'da yozuv bor-u cache yo'q yangi server, transcode
tugamagan video) so'rov JIT'ga tushadi → `findVideoFile` topa olmaydi → **404**.
Va 254-qator ishlamagani uchun **o'z-o'zini tuzatuvchi qayta transcode ham
ishga tushmaydi** — video qo'lda aralashuvsiz **doimiy 404** bo'lib qoladi.

Bu latent xavf emas: cache eviction odatiy ish rejimi.

### 3.3 Yechim

`findVideoFile` `findS3Video` bilan bir xil mantiqqa keltiriladi: kengaytma bor va
qo'llab-quvvatlanadigan bo'lsa — ID'ni o'zgartirmasdan tekshirish, aks holda
kengaytma qo'shib ko'rish. Yangi funksiya yozilmaydi, mavjud naqsh takrorlanadi.

**Qasddan qilinmaydi:** ikkala manba uchun umumiy helper ajratish. Ular boshgacha
turli I/O qiladi (`os.Stat` va `s3Client.ObjectExists`); umumiylashtirish shu
tuzatish uchun kerak emas (YAGNI).

## 4. Band 2 — prod config `${VAR}` tuzog'i

### 4.1 Bug — aniq shakli

`internal/infrastructure/config/config.go:508-551` dagi `expandEnvVars` yo'l
maydonlarini, `auth.*` ni **va `s3.endpoint`/`access_key`/`secret_key`/`bucket`**
ni `os.ExpandEnv` bilan kengaytiradi (oxirgi to'rttasi `:537-549`, har biri
`strings.HasPrefix(x, "${")` qorovuli bilan). Qamrab OLINMAGANLARI:
`vod.source_type`, `vod.cache_max_size`, va `s3.region`.

> **Tuzatish (Task 2 review'i, kod bilan tasdiqlangan).** Bu spec'ning avvalgi
> tahriri "`s3.*` qamrab olinmagan" degan edi — bu NOTO'G'RI. Farqning oqibati
> katta: `os.ExpandEnv("${S3_ENDPOINT}")` env qo'yilmaganda `""` qaytaradi, ya'ni
> qamrab olingan maydonlar strukturaga **bo'sh satr** bo'lib yetadi, literal
> `${...}` bo'lib emas. Shuning uchun "qiymatda `${` yo'q" degan tekshiruv ular
> uchun **trivial o'tadi** va regressiyani ushlamaydi. Faqat yuqoridagi uchta
> qamrab olinmagan maydon literal placeholder bo'lib ko'rinadi — `s3.region`
> ning boshqa `s3.*` lardan farq qilishi ham aynan shundan.

Bundan tashqari Go'da `${VAR:-default}` sintaksisi **umuman yo'q** —
`os.ExpandEnv` uni yaroqsiz o'zgaruvchi nomi deb bo'sh satrga aylantiradi.
`configs/production/config.yaml` esa aynan shu shaklni ishlatadi: `:28`
(`source_type`), `:34` (`cache_max_size`), `:80-81` (`s3.bucket`, `s3.region`).

Config `:63-72` da bu haqda **izoh allaqachon bor** va to'g'ri mexanizmni
ko'rsatadi: viper env binding, `MKHLS_` + nuqtali kalit yo'li katta harfda.
Izoh bor, lekin qiymatlar hamon yolg'on shaklda yozilgan.

### 4.2 Aniqlashtirish — bug env override emas, fallback

`vod.source_type` prod config faylida **mavjud**, shuning uchun
`MKHLS_VOD_SOURCE_TYPE` bugun ham ishlaydi. Bug — env qo'yilmasa fallback qiymat
literal `"${VOD_SOURCE_TYPE:-s3}"` satri bo'lib qolishi: u na `"s3"`, na `"local"`,
ya'ni jimgina `local`ga tushadi va 1-band tufayli hech narsa topilmaydi. Spec
§15.2 "birinchi ikkitasi birga ishlaydi" degani aynan shu.

### 4.3 Qattiq cheklov — kalitni o'chirish mumkin emas

`config.go:270-278` izohi: `AutomaticEnv` faqat viper "biladigan" kalitlarni
override qiladi, va kalit config faylida turgani uchun biladigan bo'ladi. Config'dan
o'chirilgan kalitning `MKHLS_*` env o'zgaruvchisi **jimgina tashlab yuboriladi**.

Shuning uchun bu tuzatishda **hech qanday kalit o'chirilmaydi** — faqat qiymatlar
o'zgaradi. Bu qoida spec'ning eng oson buziladigan bandi: "ishlatilmaydigan `s3.*`
ni olib tashlaymiz" degan tabiiy istak aynan shu tuzoqqa olib boradi.

### 4.4 Yechim

Prod config dev'da ishlayotgan naqshga keltiriladi: **YAML'da aniq qiymat,
override `MKHLS_*` orqali**.

- `vod.source_type` → `"local"` (Aidevix qarori, §2)
- `vod.cache_max_size` → aniq qiymat (`"100GB"`, hozirgi `:-100GB` defaultiga mos)
- `auth.secret_key`, `auth.admin_username`, `auth.admin_password` → bo'sh satr,
  ustidan `MKHLS_AUTH_SECRET_KEY` va h.k. Foydalanuvchi tanlovi bo'yicha bir
  xillik uchun `${VAR}` shakli tashlanadi, garchi u hozir ishlasa ham.
- `s3.*` → kalitlar **qoladi** (§4.3), qiymatlar bo'sh satr, `enabled: false`.
- `:63-72` dagi izoh yangilanadi: endi u ikki xil mexanizmni emas, **bittasini**
  tushuntiradi, va `MKHLS_*` nomlarining aniq misollarini beradi.

**Go kodiga tegilmaydi.** `expandEnvVars` kengaytirilmaydi, `${VAR:-default}`
qo'llab-quvvatlash yozilmaydi — push bloklangan fork'ga upstream bilan
sinxronlashni qiyinlashtiradigan yangi funksiya qo'shmaslik uchun.

## 5. Band 3 — `App.New` qattiq validatsiyasi

**Bu bug emas va kod o'zgartirilmaydi.** `internal/application/app.go:146`
`config.ValidateConfig` ni sovuq startda chaqiradi va xato bo'lsa to'xtaydi. Bu
ataylab qilingan va to'g'ri: ilgari "ishga tushadi-yu buzuq" deployment bo'lardi.

Yetishmayotgani — deploy oldidan nima to'g'ri bo'lishi kerakligining yozma ro'yxati.
Validator kodidan (`internal/infrastructure/config/validator.go`) olingan, prod'da
konteyner ko'tarilmasligiga olib keladigan shartlar:

| Tekshiruv | Qator | Talab |
|---|---|---|
| `auth.secret_key` | `:180-195` | bo'sh emas, **≥32 belgi**, "weak" ro'yxatidagi satrlarni o'z ichiga olmaydi |
| `ffmpeg.binary_path` | `:226-231` | `exec.LookPath` topishi kerak |
| `ffmpeg.ffprobe_path` | `:237` | xuddi shunday |
| `vod.root_path` | `:119` | katalog mavjud bo'lishi kerak |
| `app.env` | `:76-84` | `development` / `production` / `testing` / `staging` dan biri |

Deliverable — shu ro'yxat repo'da hujjat sifatida, deploy qiluvchi odam
konteyner qulaganda sababni topa oladigan joyda.

## 6. Testlar

- **Band 1:** `pkg/storage/` da hozir test fayli yo'q — yangi yaratiladi. Qamrov:
  kengaytmali ID (`x.mp4` → `x.mp4` topiladi, `x.mp4.mp4` emas), kengaytmasiz ID
  (`x` → `x.mp4` topiladi), qo'llab-quvvatlanmaydigan kengaytmali ID
  (`x.txt` → `x.txt.mp4` sinaladi), va topilmagan holat. Tuzatishdan oldin
  birinchi holat qizil bo'lishi SHART — aks holda test hech narsa isbotlamaydi.
- **Band 2:** `internal/infrastructure/config/config_test.go` da `MKHLS_*` binding
  testlari naqshi allaqachon bor (`os.Setenv` → `Load` → maydonni tekshirish).
  Shundan foydalanib prod config yuklanishi va `source_type` `"local"` bo'lishi,
  hamda `MKHLS_VOD_SOURCE_TYPE` uni override qilishi tasdiqlanadi.
- **Band 3:** test yo'q — hujjat.

## 7. Qamrovdan tashqari — ataylab

- **CORS placeholder** (`configs/production/config.yaml:217-218`,
  `"https://your-domain.com"`, `"https://admin.your-domain.com"`). Foydalanuvchi qarori: **keyinga qoldiriladi**,
  `stream.aidevix.uz` ga ulangandan keyin qaytiladi. Domen shu yerda yozib
  qo'yildi, o'shanda qidirib yurilmasin. Bu hamon bosqich 9 ni bloklaydi.
- **mkhls push.** `origin` push URL hamon
  `PUSH-DISABLED--fork-qiling-spec-5-bolim` sentineli. Barcha ish lokal commit
  bo'lib qoladi; fork masalasi alohida hal qilinadi (spec §5).
- **Spec §15.3 dagi kechiktirilgan bandlar** (1080p `-maxrate`, `parseBitrate`
  kasrli qiymatlar, `DeleteVideo` cache qoldig'i) — bu planga kirmaydi.
- **§15.2 ning 4-bandi** (JIT birinchi tomosha to'liq ladder ishlab chiqaradi,
  CPU/disk yuki) — to'g'ri xatti-harakat deb belgilangan, o'zgartirilmaydi.

## 8. Xavflar

| Xavf | Yumshatish |
|---|---|
| `s3.*` kalitlari "ishlatilmaydi" deb o'chiriladi → `MKHLS_S3_*` jimgina o'lik bo'ladi | §4.3 qoidasi rejada har bir tegishli taskda takrorlanadi |
| Band 1 testi tuzatishdan keyin yozilsa hech narsa isbotlamaydi | Reja RED qadamini majburiy qiladi va kutilgan xato matnini yozadi |
| `auth.*` ni `MKHLS_AUTH_*` ga o'tkazish ishlayotgan narsani buzishi | Config testi ikkala kalitni ham yuklab tekshiradi; dev stack `.env` i o'zgartirilmaydi |
| Prod config o'zgarishi lokal dev stack'ni buzishi | Dev `configs/development/config.yaml` dan yuklanadi — boshqa fayl, tegilmaydi |

# Handoff — video streaming, Plan 2 dan davom etish

**Sana:** 2026-08-09
**Holat:** 1-2 bosqich tugadi. Keyingisi — Plan 2 (Aidevix backend, 3-5 bosqich).

---

## Avval nimani o'qish kerak

| Fayl | Nima uchun |
|---|---|
| `docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md` | **rev. 3.** Yagona haqiqat manbai. Boshidagi rev.3 blokini va **15-bo'limni** albatta o'qing. |
| `docs/superpowers/plans/2026-08-09-mkhls-vod-pipeline.md` | Tugagan reja (1-2 bosqich). Plan 2 uchun namuna sifatida foydali. |
| `.superpowers/sdd/2026-08-09-mkhls-vod-pipeline/progress.md` | Ijro ledgeri — har bir qaror, topilma va kechiktirilgan band. Batafsil kontekst kerak bo'lsa. |

Ledger'dagi muhim narsalar spec rev.3 ga ko'chirilgan, shuning uchun **spec yetarli**.
Ledger faqat "nima uchun shunday qaror qilingan" kerak bo'lganda.

---

## Ikkita repo

| Repo | Branch | Holat |
|---|---|---|
| `AiDeVix/mkhls-streamer` | `feat/vod-local-pipeline` | 11 commit, **push bloklangan** (URL sentinel). Yangi repo ochilgach push qilinadi. Zaxira tag: `backup/pre-squash-f0eec62` |
| `AiDeVix/aidevixBackend` | `docs/spec-video-streaming-rev2` | Spec + rejalar + `docker-compose.dev.yml`. `main` ga hali merge qilinmagan. |

mkhls Aidevix repo'sining **ichida emas, yonida** — spec'ning "mijoz, klonuvchi emas"
qoidasi. Bu qoida saqlanishi kerak.

---

## Lokal muhit

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml up -d --build
# http://localhost:8080   admin / admin123
```

- Config override: viper `MKHLS_` prefiksi, `a.b.c` → `MKHLS_A_B_C`
- Konteyner `configs/development/config.yaml` ni mount qiladi (**prod config yuklanmaydi** — 15.2)
- `MKHLS_VOD_TRANSCODE_ON_UPLOAD=true` ishlaydi
- Media: `.data/media/`, cache: `.data/cache/`
- Ma'lum shovqin: stub runner har ishga tushishda zararsiz `ERROR` yozadi

---

## Plan 2 boshlashdan oldin bilish shart

Bular ijroda topildi va spec'dagi taxminlarni rad etdi:

1. **`POST /admin/videos/{id}/transcode` javobi `ID` qaytaradi, `job_id` emas.**
   Bu JSON tegsiz Go struct. Spec'ning A2 misoli noto'g'ri edi.
   → **Plan 2 boshida qaror qiling:** Node tomonda Go maydon nomlarini o'qish,
   yoki mkhls'ga json teglari qo'shish (~6 qator; upstream'ga foydali, chunki
   `InputPath`/`OutputPath` kabi ichki yo'llarni javobdan yashiradi).

2. **`transcode.progress_percent` hech qachon o'smaydi** — 0, keyin 100.
   `presets_done` / `presets_total` haqiqiy. Admin panel (Plan 3) faqat shularni ishlatsin.

3. **Disk sig'imi shiftdan hisoblanadi**, o'rtachadan emas: ~1.4 GB/soat.

---

## Plan 2 qamrovi (spec 3-5 bosqich, 6-bo'lim)

- `backend/utils/mkhls.js` — yangi client (`bunny.js` o'rniga)
- `backend/models/Video.js` — `streamPath`, `streamStatus`; `bunny*` deprecated
- `backend/controllers/videoController.js` (784 qator) — create/upload/status/get/delete
- Bug fixlar: progress delta (`enrollmentController.js:89` kumulyativ qo'shadi),
  `viewCount` (har refresh'da oshadi), `video.rating` (mavjud emas),
  `getCourseVideos` provayder ID sizib chiqishi

---

## Ishlash uslubi (o'tgan safar yaxshi ishladi)

`superpowers` skill'lari: brainstorming → writing-plans → subagent-driven-development.

Ikkita narsa aynan qimmat bo'ldi, saqlang:

- **Har taskda qo'lda uchdan-uchgacha tekshirish.** Sakkizta jiddiy bug topildi;
  ularning yarmini hech qanday unit test yoki code review tutmagan bo'lardi —
  faqat konteynerda haqiqiy fayl bilan ishlatish ochdi.
- **Butun-branch review oxirida.** U ma'lumot yo'qolishi bug'ini topdi, uni
  to'qqizta alohida task review'i o'tkazib yuborgan edi — chunki har bir task
  alohida to'g'ri edi, muammo ularning o'zaro ta'sirida edi.

---

## Yangi suhbatni shu bilan boshlang

> `aidevixBackend/docs/superpowers/HANDOFF.md` ni o'qing va Plan 2 ga o'ting.

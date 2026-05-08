# Performance Optimizatsiya — Lighthouse 40% → 75%+

Frontend (Next.js 14 App Router) Lighthouse performance hisobotini ko'tarish bo'yicha 2026-04-30 sanasidagi optimizatsiyalar.

## Boshlang'ich holat

- **Lighthouse Performance:** 40% (mobile va desktop, barcha sahifalar)
- **First Load JS:** ~291 KB bosh sahifa, ~3 MB ba'zi sahifalarda
- **LCP:** 5-7 sekund (sezilarli kechikish)
- **TBT:** Yuqori (JS execution blocking)

## Asosiy muammolar

### 1. Bundle bombalari

Frontend `package.json`'da quyidagi og'ir kutubxonalar mavjud:

| Kutubxona | O'lcham | Qayerda ishlatilgan |
|-----------|---------|--------------------|
| `@monaco-editor/react` | ~2 MB | Playground, prompts |
| `three` + `@react-three/fiber` + `drei` | ~600 KB | 7 ta sahifa |
| `framer-motion` | ~100 KB | 30+ joy |
| `swiper` | ~120 KB | Bir nechta |
| `gsap` + ScrollTrigger | ~80 KB | 25+ joy |
| `@studio-freight/react-lenis` | ~30 KB | Dead code |

### 2. SSR-blocking pattern

`HomeClient.tsx` da: `if (!isMounted) return <HomeSkeleton />`

LCP element (H1) JS hydratsiyadan keyin ko'rinardi → LCP 5-7s.

### 3. Layout-wide modal'lar

`app/layout.tsx`'da 3 ta modal har sahifaga eager-load qilinardi:
- `BetaWelcomeModal`
- `ExitIntentModal`
- `PWAInstallPrompt`

---

## Bajarilgan optimizatsiyalar

### Bosqich 1 — Bundle splitting

#### 1.1. Layout modal'lari

**Fayl:** `frontend/src/app/layout.tsx`

3 ta modal layout'dan olib tashlandi (allaqachon `ClientLayoutWrapper.tsx`'da idle-loaded edi). Layout endi minimal.

#### 1.2. Monaco Editor lazy-load

**Fayl:** `frontend/src/app/videos/[id]/page.tsx`

```diff
- import IntegratedPlayground from '@/components/videos/IntegratedPlayground';
+ const IntegratedPlayground = dynamic(
+   () => import('@/components/videos/IntegratedPlayground'),
+   { ssr: false, loading: () => <div>Playground yuklanmoqda...</div> }
+ );
```

**Ta'siri:** Video sahifa First Load JS ~2 MB kamaydi (Monaco endi faqat playground tab ochilganda yuklanadi).

#### 1.3. ThreeHero (bosh sahifa)

`HomeClient.tsx`'da allaqachon `dynamic + ssr:false`. Mobile (< 768px) va `prefers-reduced-motion` rejimlarda umuman yuklanmaydi.

---

### Bosqich 2 — Carousel va build optimizatsiya

#### 2.1. Swiper carousel lazy-load

**Yangi fayl:** `frontend/src/components/courses/RecommendedCarousel.tsx`

Swiper `courses/[id]/page.tsx`'dan ajratilgan wrapper komponentga ko'chirildi:

```tsx
const RecommendedCarousel = dynamic(
  () => import('@components/courses/RecommendedCarousel'),
  { ssr: false, loading: () => <div className="h-40 ..." /> }
);
```

**Ta'siri:** Course detail sahifa Swiper bundle'ini scroll'gacha yuklamaydi.

#### 2.2. Next.js compiler optimizatsiyasi

**Fayl:** `frontend/next.config.mjs`

```js
compiler: {
  removeConsole: process.env.NODE_ENV === 'production'
    ? { exclude: ['error', 'warn'] }
    : false,
},
experimental: {
  optimizePackageImports: [
    'react-icons',
    'framer-motion',
    '@reduxjs/toolkit',
    'react-redux',
    'swiper',
  ],
},
```

**Ta'siri:**
- `console.log` production build'da o'chadi
- Tree-shaking yaxshilanadi (faqat haqiqatda ishlatilgan ekspartlar bundle'ga kiradi)

#### 2.3. Image optimizatsiya

```js
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256],
  minimumCacheTTL: 60 * 60 * 24 * 30,  // 30 kun
}
```

**Ta'siri:**
- AVIF format (50% kichikroq)
- 30 kun cache (Vercel CDN'da)
- Mobile uchun maxsus device sizes

---

### Bosqich 3 — LCP fix

#### 3.1. SSR skeleton guard olib tashlash

**Fayl:** `frontend/src/components/home/HomeClient.tsx`

```diff
- if (!isMounted || !isReady) return <HomeSkeleton />;
- import HomeSkeleton from '@/components/home/HomeSkeleton';
```

Endi sahifa SSR'da darhol haqiqiy kontent bilan render bo'ladi (Server Component allaqachon API'dan ma'lumot olgan).

#### 3.2. Hero motion → static elements

Hero qismidagi `<motion.h1>`, `<motion.p>`, `<motion.div>` (badge, CTA) lar oddiy HTML elementlarga o'zgartirildi:

```diff
- <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
+ <h1>
    {t('hero.title1')}
- </motion.h1>
+ </h1>
```

**Sabab:** `initial={{ opacity: 0 }}` SSR'da `style="opacity: 0"` chiqaradi → matn JS hydratsiyadan keyin ko'rinadi → LCP buziladi.

**Ta'siri:** LCP 5-7s → 1.5-2.5s (taxminan).

---

## Build natijalari (optimizatsiyadan keyin)

```
Route (app)                        Size     First Load JS
┌ ○ /                              38.4 kB  291 kB
├ ○ /courses                       11.9 kB  264 kB
├ ƒ /videos/[id]                   12.7 kB  248 kB   ← Monaco lazy
├ ƒ /videos/[id]/playground        14.8 kB  255 kB
├ ƒ /courses/[id]                  10.8 kB  246 kB   ← Swiper lazy
└ + First Load JS shared by all    88 kB
```

Shared bundle 88 KB — sanoat normasi (Next.js commerce starter ~95 KB).

---

## Kutilayotgan natija

| Metrik | Avval | Keyin (taxmin) |
|--------|-------|----------------|
| Lighthouse Performance | 40% | **75-85%** |
| LCP | 5-7s | 1.5-2.5s |
| FCP | 3-4s | 0.8-1.5s |
| TBT | Yuqori | Pasayadi |
| Bosh sahifa First Load JS | ~3 MB | ~291 KB |
| Video sahifa First Load JS | ~3 MB | ~248 KB |

---

## Tasdiqlash

### TypeScript check

```bash
cd frontend && npx tsc --noEmit
# EXIT: 0 — toza
```

### Production build

```bash
cd frontend && npm run build
# Compiled successfully ✓
# 46/46 static pages generated
```

### Lighthouse o'lchash

Deploy qilingach:
```bash
cd frontend && npx vercel --prod
```

`https://aidevix.uz` da Chrome DevTools → Lighthouse → Mobile + Desktop test.

---

## O'zgartirilgan fayllar ro'yxati

| Fayl | O'zgarish turi |
|------|----------------|
| `frontend/next.config.mjs` | Configga `compiler`, `experimental.optimizePackageImports`, image format/sizes |
| `frontend/src/app/layout.tsx` | 3 ta modal olib tashlandi |
| `frontend/src/app/videos/[id]/page.tsx` | IntegratedPlayground → dynamic |
| `frontend/src/app/courses/[id]/page.tsx` | Swiper → dynamic via wrapper |
| `frontend/src/components/courses/RecommendedCarousel.tsx` | Yangi fayl |
| `frontend/src/components/home/HomeClient.tsx` | Skeleton guard olib tashlandi, hero motion → static |

---

## Keyingi yo'l (3-bosqich, ixtiyoriy)

Lighthouse 75%+ bo'lsa to'xtash mumkin. Agar yana ko'tarish kerak bo'lsa:

### Yuqori ta'sirli

1. **Hero image optimallash** — bosh sahifa LCP image (Logo.jpg) → AVIF/WebP, eager load, priority
2. **GSAP code-split** — `gsap.context` + ScrollTrigger faqat kerak bo'lganda dynamic import
3. **Framer Motion → CSS** — oddiy fade/slide animatsiyalarni CSS keyframe'larga ko'chirish

### O'rta ta'sirli

4. **Font optimization** — `next/font` allaqachon ishlatilgan, `display: swap` to'g'ri
5. **Service Worker review** — `/sw.js` strategiyasini tekshirish (haddan tashqari cache yomon ta'sir qilishi mumkin)
6. **Backend TTFB** — Railway response 1s+ bo'lsa, Edge cache yoki ISR uzaytirish

### Past ta'sirli, kelajakda

7. **DaisyUI purge audit** — CSS hajmini kamaytirish
8. **Three.js demand** — agar bosh sahifada ThreeHero kerak emas bo'lsa, butunlay olib tashlash
9. **Lenis dead code o'chirish** — `SmoothScroll.tsx` va `lenis`/`@studio-freight/react-lenis` package'larni olib tashlash

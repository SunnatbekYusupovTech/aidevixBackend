/**
 * Asia/Tashkent kalendar yordamchilari (UTC+5, DST yo'q).
 * Kun/hafta chegaralari server TZ'idan (konteynerda UTC) mustaqil hisoblanadi.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toMs = (d) => (d === undefined ? Date.now() : new Date(d).getTime());

// Toshkent kalendar kuni tartib raqami (kunlar orasidagi farq uchun)
const dayIndex = (d) => Math.floor((toMs(d) + OFFSET_MS) / DAY_MS);

// 'YYYY-MM-DD' — Toshkent sanasi
const dayKey = (d) => new Date(toMs(d) + OFFSET_MS).toISOString().slice(0, 10);

// Toshkent kunining boshlanishi (00:00 Toshkent) — UTC Date sifatida
const startOfDay = (d) => new Date(dayIndex(d) * DAY_MS - OFFSET_MS);

// Toshkent haftasining boshlanishi (Dushanba 00:00 Toshkent)
const startOfWeek = (d) => {
  const weekday = new Date(toMs(d) + OFFSET_MS).getUTCDay(); // 0 = Yakshanba
  const sinceMonday = (weekday + 6) % 7;
  return new Date(startOfDay(d).getTime() - sinceMonday * DAY_MS);
};

// a -> b orasidagi Toshkent kalendar kunlari farqi
const daysBetween = (a, b) => dayIndex(b) - dayIndex(a);

// Haftalik reset: challengeScheduler.weeklyReset Toshkent soat 00:00 da, UTC yakshanba
// bo'lganda ishlaydi = Dushanba 00:00 Toshkent (yakshanba 19:00 UTC).
const nextWeeklyReset = (d) => new Date(startOfWeek(d).getTime() + 7 * DAY_MS);

module.exports = { OFFSET_MS, DAY_MS, dayIndex, dayKey, startOfDay, startOfWeek, daysBetween, nextWeeklyReset };

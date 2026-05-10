/**
 * AI Code Playground — Foydalanuvchi yozgan kodni Groq AI bilan tahlil qiladi.
 *
 * Maqsad: video tagida embedded editor — user kod yozadi, "Tekshirish" tugmasini bosadi,
 * AI Coach real-time javob beradi (XP berilmaydi, bu o'rganish maydoni).
 *
 * Rate limit: 10/15min per user (playgroundReviewLimiter routes'da)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const MAX_CODE_LEN = 8000;

const SUPPORTED_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp',
  'html', 'css', 'sql', 'bash', 'tsx', 'jsx', 'php', 'ruby', 'kotlin', 'swift',
]);

/**
 * @desc  Foydalanuvchi kodini AI bilan tahlil qilish
 * @route POST /api/playground/review
 * @access Private
 * Body: { code: string, language: string, prompt?: string }
 */
const reviewCode = async (req, res) => {
  try {
    const { code, language, prompt: userPrompt } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Kod yuborilishi shart' });
    }
    if (code.length > MAX_CODE_LEN) {
      return res.status(400).json({
        success: false,
        message: `Kod juda uzun (max ${MAX_CODE_LEN} belgilar)`,
      });
    }
    const lang = String(language || 'javascript').toLowerCase();
    if (!SUPPORTED_LANGUAGES.has(lang)) {
      return res.status(400).json({
        success: false,
        message: `Til qo'llab-quvvatlanmaydi. Mavjud: ${[...SUPPORTED_LANGUAGES].slice(0, 10).join(', ')}...`,
      });
    }

    if (!GROQ_API_KEY) {
      // Fallback — AI bo'lmasa heuristic javob (graceful degradation)
      return res.json({
        success: true,
        data: buildFallbackReview(code, lang),
      });
    }

    const focus = String(userPrompt || '').slice(0, 500);

    const systemMsg = `Sen Aidevix AI Coach — kod tahlilchisi.
Foydalanuvchi yozgan kodni qisqa va aniq tahlil qil. Javob ${lang} tilida bo'lsin.
Asosiy fokus: xato, optimallashtirish, best practice, security.
Konkret bo'l — "yaxshi" yoki "yomon" emas, balki AYNAN nimani o'zgartirish kerakligini ko'rsat.
Faqat JSON qaytar.`;

    const userMsg = `Til: ${lang}
${focus ? `Foydalanuvchi savoli: ${focus}\n` : ''}
Kod:
\`\`\`${lang}
${code}
\`\`\`

JSON format:
{
  "score": 0-100,
  "summary": "1-2 jumla: koddagi umumiy holat",
  "issues": [{"severity":"critical|high|medium|low","line":N|null,"message":"...","fix":"..."}],
  "improvements": ["..."],
  "rewrite": "tuzatilgan kod (faqat zarur qism, max 80 qator)"
}`;

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
      }),
      // Node 18+ fetch — AbortController bilan timeout
      signal: AbortSignal.timeout(25_000),
    });

    if (!aiRes.ok) {
      console.error('[Playground] Groq HTTP', aiRes.status);
      return res.json({ success: true, data: buildFallbackReview(code, lang), degraded: true });
    }

    const data = await aiRes.json();
    let parsed;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    } catch (_) {
      return res.json({ success: true, data: buildFallbackReview(code, lang), degraded: true });
    }

    const review = {
      score: clampScore(parsed.score),
      summary: String(parsed.summary || '').slice(0, 600),
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.slice(0, 10).map(sanitizeIssue)
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.slice(0, 8).map((s) => String(s).slice(0, 300))
        : [],
      rewrite: typeof parsed.rewrite === 'string' ? parsed.rewrite.slice(0, 4000) : '',
      model: MODEL,
      language: lang,
      createdAt: new Date().toISOString(),
    };

    return res.json({ success: true, data: review });
  } catch (err) {
    console.error('[Playground] reviewCode xatosi:', err.message);
    return res.status(500).json({ success: false, message: 'AI review amalga oshmadi' });
  }
};

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 60;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function sanitizeIssue(it) {
  return {
    severity: ['critical', 'high', 'medium', 'low'].includes(it.severity) ? it.severity : 'low',
    line: Number.isFinite(it.line) ? Math.max(1, Math.min(10000, it.line)) : null,
    message: String(it.message || '').slice(0, 400),
    fix: String(it.fix || '').slice(0, 500),
  };
}

function buildFallbackReview(code, lang) {
  const lines = code.split('\n').length;
  const score = Math.max(40, Math.min(85, 70 - Math.floor(Math.abs(lines - 30) / 5)));
  return {
    score,
    summary: 'AI hozircha mavjud emas — heuristic javob beriladi. Keyinroq qayta urinib ko\'ring.',
    issues: [],
    improvements: [
      'Konsol log\'larini olib tashlang yoki logger\'ga o\'tkazing',
      'Funksiyalar uchun aniq nomlar va kichik scope tanlang',
      'Error handling: try/catch yoki Promise.catch qo\'shing',
    ],
    rewrite: '',
    model: 'fallback',
    language: lang,
    createdAt: new Date().toISOString(),
    degraded: true,
  };
}

module.exports = { reviewCode };

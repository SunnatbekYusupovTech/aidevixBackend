const axios = require('axios');

// Google Gemini REST API uchun proxy.
// Bepul tier: gemini-2.0-flash — 15 RPM, 1500 RPD.
// API kalit Google AI Studio'dan: https://aistudio.google.com/apikey

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_TIMEOUT_MS = 60000;

const SYSTEM_PROMPT = `Sen Aidevix mobil ilovasidagi AI yordamchisi sifatida ishlaysan.
Foydalanuvchi HTML, CSS va JavaScript o'rganmoqda — Code Playground oynasida kod yozayapti.
Javoblaringni HAR DOIM o'zbek tilida ber.
Sodda, aniq va o'qishga qulay yoz. Texnik atamalar ishlatganda ularni qisqacha tushuntir.
Kod misol kerak bo'lsa, markdown code block ichida ko'rsat (\`\`\`html, \`\`\`css yoki \`\`\`javascript).
Javoblar uzunligi: 100-300 so'z atrofida — to'liq lekin asossiz emas.`;

exports.chat = async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'message maydoni majburiy' });
    }
    if (message.length > 20000) {
      return res.status(400).json({ message: 'Xabar juda uzun (20000 belgidan ko\'p)' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[ai] GEMINI_API_KEY .env da o\'rnatilmagan');
      return res.status(503).json({ message: 'AI servis sozlanmagan (server admin .env\'ga GEMINI_API_KEY qo\'shishi kerak)' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const response = await axios.post(url, body, {
      timeout: GEMINI_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });

    const candidates = response.data?.candidates;
    const parts = candidates?.[0]?.content?.parts;
    const text = parts?.map((p) => p?.text || '').join('').trim();

    if (!text) {
      // Ba'zan Gemini xavfsizlik filterlari javobni bloklaydi
      const blockReason = response.data?.promptFeedback?.blockReason;
      const finishReason = candidates?.[0]?.finishReason;
      console.warn('[ai] bo\'sh javob:', { blockReason, finishReason });
      return res.status(502).json({
        message: blockReason
          ? `Javob xavfsizlik filtrlari tomonidan bloklandi (${blockReason})`
          : `Javob bo'sh keldi${finishReason ? ' (' + finishReason + ')' : ''}`,
      });
    }

    res.json({ reply: text });
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const apiError = data?.error?.message;

    console.error('[ai] xato:', status, apiError || error.message);

    if (status === 400 && apiError) {
      return res.status(400).json({ message: 'Gemini xatosi: ' + apiError });
    }
    if (status === 401 || status === 403) {
      return res.status(503).json({ message: 'AI servis: API kalit noto\'g\'ri yoki ruxsat berilmagan' });
    }
    if (status === 429) {
      return res.status(429).json({ message: 'Juda ko\'p so\'rov yuborildi. Bir oz kutib qayta urinib ko\'ring' });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ message: 'AI servis javob bermadi (timeout). Qayta urinib ko\'ring' });
    }

    res.status(500).json({ message: 'AI yordam vaqtincha ishlamayapti. Keyinroq urinib ko\'ring' });
  }
};

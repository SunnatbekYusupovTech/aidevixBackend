import { NextResponse } from 'next/server';
import { generateCoachReply } from '@/utils/coachAssistant';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL;
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_KEY;
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// ------- Video & Course search helpers -------

type VideoResult = {
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  course?: { _id: string; title: string; category?: string };
};

type CourseResult = {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  level?: string;
  price?: number;
  isFree?: boolean;
  thumbnail?: string;
};

async function searchVideos(query: string): Promise<VideoResult[]> {
  try {
    const url = `${BACKEND_URL}/videos/search?q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.videos ?? [];
  } catch {
    return [];
  }
}

async function searchCourses(query: string): Promise<CourseResult[]> {
  try {
    const url = `${BACKEND_URL}/courses?search=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.courses ?? [];
  } catch {
    return [];
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildVideoCards(videos: VideoResult[]): string {
  if (!videos.length) return '';
  let text = '\n\n📹 **Topilgan videolar:**\n';
  for (const v of videos) {
    const dur = formatDuration(v.duration);
    const courseTitle = v.course?.title ?? '';
    text += `\n• **${v.title}**${dur ? ` (${dur})` : ''}`;
    if (courseTitle) text += ` — _${courseTitle}_`;
    text += `\n  [▶️ Ko'rish](/courses/${v.course?._id || ''}#video-${v._id})`;
  }
  return text;
}

function buildCourseCards(courses: CourseResult[]): string {
  if (!courses.length) return '';
  let text = '\n\n📚 **Tegishli kurslar:**\n';
  for (const c of courses) {
    const price = c.isFree ? 'Bepul' : c.price ? `${c.price.toLocaleString()} so'm` : '';
    const level = c.level ? ` | ${c.level}` : '';
    text += `\n• **${c.title}**${price ? ` (${price}${level})` : ''}`;
    if (c.description) text += `\n  ${c.description.slice(0, 80)}...`;
    text += `\n  [📖 Kursga o'tish](/courses/${c._id})`;
  }
  return text;
}

// ------- Intent detection -------

type UserIntent = 'search_video' | 'search_course' | 'learn_topic' | 'general';

function detectIntent(message: string): { intent: UserIntent; searchQuery: string } {
  const text = message.toLowerCase();

  // Video qidiruv
  const videoPatterns = [
    /(?:video|dars|lesson|tutorial|mavzu)[\s:]*(.+)/i,
    /(.+?)(?:\s+haqida\s+video|\s+dars|\s+tutorial)/i,
    /(?:qidir|izla|top|kor).*?(?:video|dars).*?(.+)/i,
    /(.+?)\s+(?:video|darslik)(?:lar)?(?:ini|ni|i)?\s*(?:ber|kor|top|qidir)/i,
  ];
  for (const pat of videoPatterns) {
    const match = text.match(pat);
    if (match?.[1]?.trim()) {
      return { intent: 'search_video', searchQuery: match[1].trim() };
    }
  }

  // Kurs qidiruv
  const coursePatterns = [
    /(?:kurs|course)[\s:]*(.+)/i,
    /(.+?)(?:\s+haqida\s+kurs|\s+kursi|\s+course)/i,
    /(?:qidir|izla|top|kor).*?(?:kurs|course).*?(.+)/i,
    /(.+?)\s+(?:kurs|course)(?:lar)?(?:ini|ni|i)?\s*(?:ber|kor|top|qidir)/i,
    /(?:o'rgan|uqit|orgat|ornat).*?(.+)/i,
  ];
  for (const pat of coursePatterns) {
    const match = text.match(pat);
    if (match?.[1]?.trim()) {
      return { intent: 'search_course', searchQuery: match[1].trim() };
    }
  }

  // Mavzu bo'yicha o'rganish (ham video ham kurs)
  const learnPatterns = [
    /(?:react|node|javascript|typescript|python|next\.?js|express|mongodb|tailwind|css|html|ai|machine.?learning|web|mobile|flutter|git)/i,
  ];
  for (const pat of learnPatterns) {
    const match = text.match(pat);
    if (match?.[0]) {
      return { intent: 'learn_topic', searchQuery: match[0].trim() };
    }
  }

  return { intent: 'general', searchQuery: '' };
}

// ------- AI reply generation -------

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type AIProvider = 'openai' | 'anthropic' | 'groq';
type AIReplyResult = { reply: string; provider: AIProvider } | null;

async function tryAnthropic(messages: ChatMessage[], signal: AbortSignal): Promise<AIReplyResult> {
  if (!ANTHROPIC_API_KEY) return null;

  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      system,
      messages: chatMessages,
      temperature: 0.65,
      max_tokens: 1200,
    }),
    signal,
  });

  if (!response.ok) {
    console.error('anthropic API Error:', response.status);
    return null;
  }

  const data = await response.json();
  const reply = data?.content?.find((item: { type?: string; text?: string }) => item?.type === 'text')?.text;
  return reply ? { reply, provider: 'anthropic' } : null;
}

async function tryOpenAI(messages: ChatMessage[], signal: AbortSignal): Promise<AIReplyResult> {
  if (!OPENAI_API_KEY) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.65,
      max_tokens: 1200,
    }),
    signal,
  });

  if (!response.ok) {
    console.error('openai API Error:', response.status);
    return null;
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  return reply ? { reply, provider: 'openai' } : null;
}

async function tryGroq(messages: ChatMessage[], signal: AbortSignal): Promise<AIReplyResult> {
  if (!GROQ_API_KEY) return null;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.65,
      max_tokens: 1200,
    }),
    signal,
  });

  if (!response.ok) {
    console.error('groq API Error:', response.status);
    return null;
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  return reply ? { reply, provider: 'groq' } : null;
}

async function generateAIReply(message: string, history: ChatMessage[]) {
  if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY && !GROQ_API_KEY && !AI_GATEWAY_URL) return null;

  const systemInstruction = `Sen Aidevix IT-ta'lim platformasining senior dasturchi-mentorisan. 10+ yillik tajribaga ega full-stack muhandis sifatida o'quvchilarga professional maslahat berasan.

KIMSAN:
- Senior Software Engineer — React, Node.js, TypeScript, Python, AI/ML bo'yicha chuqur bilim
- O'quvchilarga kod arxitekturasi, best practices va real-world yechimlar o'rgatasan
- Aidevix platformasining barcha kurs va videolarini bilasan
- Haqiqiy mentor: shoshmasdan, aniq, amaliy — nazariya emas, natija

JAVOB USLUBI:
- O'zbek tilida, lekin texnik terminlar (React, hook, API, async/await va h.k.) inglizcha qoladi
- Professional va samimiy ton — na rasmiy sovuq, na yengiltak
- Tuzilgan javob: asosiy fikr → tushuntirish → kod misol (agar kerak) → keyingi qadam
- Kod bloklar \`\`\`js ... \`\`\` formatida, har bir muhim qator izohli
- Agar savol noaniq bo'lsa — bitta aniqlashtiruvchi savol ber, keyin javob ber
- Har bir javobda kamida bitta amaliy qadam bo'lsin
- Uzunlik: 80–300 so'z. Murakkab texnik savollarda 400 so'zgacha

QATTIQ QOIDALAR:
- Hech qachon "men AI" yoki "men ChatGPT/Claude" dema
- Hech qachon "afsuski bilmayman" dema — bilmasang eng yaqin foydali ma'lumotni ber
- Emoji maksimum 1 ta, faqat juda zarur bo'lsa
- "Albatta!", "Zo'r savol!", "Hech shubhasiz!" kabi bo'sh iboralarni ishlatma
- Javobni to'g'ridan-to'g'ri boshla — kirish gapi shart emas

PLATFORMA:
- Kurslar: React, Node.js, JavaScript/TypeScript, Python, AI, Web dev
- Har kursda video darslar, quiz, sertifikat mavjud
- XP tizimi va leaderboard bor
- Telegram: @aidevix — obuna shart
- Savol platformaga tegishli bo'lsa, tegishli kurs yoki videoga yo'naltir`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    if (AI_GATEWAY_URL && AI_GATEWAY_KEY) {
      const gateway = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_GATEWAY_KEY}`,
        },
        body: JSON.stringify({
          messages,
          preferredModels: ['claude', 'gpt-4o', 'llama-3.3-70b'],
          temperature: 0.65,
        }),
        signal: controller.signal,
      });
      if (gateway.ok) {
        const payload = await gateway.json();
        const text = payload?.reply || payload?.content;
        if (text) return { reply: text, provider: 'openai' };
      }
    }

    // Anthropic birinchi (eng sifatli), keyin OpenAI, Groq fallback
    const providers: Array<(msgs: ChatMessage[], signal: AbortSignal) => Promise<AIReplyResult>> = [
      tryAnthropic,
      tryOpenAI,
      tryGroq,
    ];

    for (const providerCall of providers) {
      const result = await providerCall(messages, controller.signal);
      if (result?.reply) {
        return result;
      }
    }

    return null;
  } catch (error) {
    console.error('AI provider xatosi:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ------- Main POST handler -------

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  const history: ChatMessage[] = Array.isArray(payload?.history) ? payload.history : [];

  if (!message) {
    return NextResponse.json(
      { success: false, message: 'Message is required' },
      { status: 400 },
    );
  }

  // 1. Intent aniqlash
  const { intent, searchQuery } = detectIntent(message);

  // 2. Parallel: AI javob + content qidiruv
  const tasks: [Promise<AIReplyResult>, Promise<VideoResult[]>, Promise<CourseResult[]>] = [
    generateAIReply(message, history),
    (intent === 'search_video' || intent === 'learn_topic') && searchQuery
      ? searchVideos(searchQuery)
      : Promise.resolve([]),
    (intent === 'search_course' || intent === 'learn_topic') && searchQuery
      ? searchCourses(searchQuery)
      : Promise.resolve([]),
  ];

  const [aiReply, videos, courses] = await Promise.all(tasks);

  // 3. Javobni yig'ish
  let reply = '';
  let mode = 'fallback';
  const suggestions: string[] = [];

  if (aiReply?.reply) {
    reply = aiReply.reply;
    mode = `ai_${aiReply.provider}`;
  } else {
    // Fallback
    const fallback = generateCoachReply(message);
    reply = fallback.reply;
    mode = 'fallback';
    suggestions.push(...fallback.suggestions);
  }

  // Video/kurs natijalarini qo'shish
  const videoCards = buildVideoCards(videos);
  const courseCards = buildCourseCards(courses);

  if (videoCards || courseCards) {
    reply += videoCards + courseCards;
  }

  // Smart suggestions
  if (suggestions.length === 0) {
    if (videos.length > 0) {
      suggestions.push('Boshqa videolarni ko\'rsat');
    }
    if (courses.length > 0) {
      suggestions.push('Kurs haqida batafsil');
    }

    if (intent === 'learn_topic') {
      suggestions.push(`${searchQuery} bo'yicha darslar`);
      suggestions.push('Qaysi kursdan boshlashim kerak?');
    } else if (intent === 'general') {
      suggestions.push('React o\'rganmoqchiman');
      suggestions.push('Qanday kurslar bor?');
      suggestions.push('Kod yozishda yordam ber');
    }

    // Har doim 1-2 ta umumiy taklif
    if (suggestions.length < 3) {
      suggestions.push('Misol kod yozib bering');
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      reply,
      suggestions: suggestions.slice(0, 4),
      mode,
      hasVideos: videos.length > 0,
      hasCourses: courses.length > 0,
      videos: videos.slice(0, 3).map(v => ({
        _id: v._id,
        title: v.title,
        duration: v.duration,
        courseId: v.course?._id,
        courseTitle: v.course?.title,
      })),
      courses: courses.slice(0, 3).map(c => ({
        _id: c._id,
        title: c.title,
        category: c.category,
        level: c.level,
        isFree: c.isFree,
        price: c.price,
      })),
    },
  });
}

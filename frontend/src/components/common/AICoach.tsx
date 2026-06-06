'use client';

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { IoClose, IoSend, IoSparkles, IoPlay, IoBook, IoSearch } from 'react-icons/io5';
import { gsap } from 'gsap';
import { generateCoachReply, type CoachMessage } from '@/utils/coachAssistant';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';

const makeMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type VideoCard = {
  _id: string;
  title: string;
  duration?: number;
  courseId?: string;
  courseTitle?: string;
};

type CourseCard = {
  _id: string;
  title: string;
  category?: string;
  level?: string;
  isFree?: boolean;
  price?: number;
};

type ExtendedMessage = CoachMessage & {
  videos?: VideoCard[];
  courses?: CourseCard[];
};

type ChatHistory = { role: 'user' | 'assistant'; content: string }[];

const getInitialMessages = (t: (key: string) => string): ExtendedMessage[] => [
  {
    id: 'welcome',
    role: 'assistant',
    content: t('coach.welcome'),
    timestamp: Date.now(),
    suggestions: [t('coach.suggestion1'), t('coach.suggestion2'), t('coach.suggestion3')],
  },
];

function renderBoldSegments(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    const isBold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
    if (!isBold) return <span key={`plain-${idx}`}>{part}</span>;
    return (
      <strong key={`bold-${idx}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    );
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ------- Video Card Component -------
function VideoCardItem({ video }: { video: VideoCard }) {
  const href = video.courseId ? `/courses/${video.courseId}` : '#';
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 transition-colors group-hover:bg-indigo-600/30">
        <IoPlay className="text-sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white/90">{video.title}</p>
        <p className="text-[10px] text-white/40">
          {video.courseTitle && <span>{video.courseTitle}</span>}
          {video.duration ? <span> · {formatDuration(video.duration)}</span> : null}
        </p>
      </div>
    </Link>
  );
}

// ------- Course Card Component -------
function CourseCardItem({ course }: { course: CourseCard }) {
  return (
    <Link
      href={`/courses/${course._id}`}
      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 transition-colors group-hover:bg-emerald-600/30">
        <IoBook className="text-sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white/90">{course.title}</p>
        <p className="text-[10px] text-white/40">
          {course.category && <span>{course.category}</span>}
          {course.level && <span> · {course.level}</span>}
          <span> · {course.isFree ? 'Bepul' : course.price ? `${course.price.toLocaleString()} so'm` : ''}</span>
        </p>
      </div>
    </Link>
  );
}

// ------- Main Component -------
export default function AICoach({ visible = true }: { visible?: boolean }) {
  const { t, lang } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExtendedMessage[]>(() => getInitialMessages(t));
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const toggleCoach = () => setIsOpen((c) => !c);

  // Build conversation history for context
  const buildHistory = useCallback((): ChatHistory => {
    return messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  }, [messages]);

  // GSAP animations
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tween = gsap.to(button, {
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
      repeat: -1,
      yoyo: true,
      duration: 1.5,
    });
    return () => { tween.kill(); };
  }, []);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { scale: 0.92, opacity: 0, y: 24 },
      { scale: 1, opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' },
    );
    // Focus input when panel opens
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    setMessages((current) => {
      if (!current.length || current[0]?.id !== 'welcome') return current;
      const welcome = getInitialMessages(t)[0];
      return [{ ...current[0], content: welcome.content, suggestions: welcome.suggestions }, ...current.slice(1)];
    });
  }, [lang, t]);

  const sendMessage = async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || isTyping) return;
    if (trimmed.length > 1000) return;

    const userMessage: ExtendedMessage = {
      id: makeMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsTyping(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: buildHistory(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Coach API error: ${response.status}`);

      const payload = await response.json();
      const data = payload?.data;
      const assistantReply = data?.reply || '';
      const assistantSuggestions = data?.suggestions || [];
      const videos: VideoCard[] = data?.videos || [];
      const courses: CourseCard[] = data?.courses || [];

      if (assistantReply) {
        setMessages((current) => [
          ...current,
          {
            id: makeMessageId(),
            role: 'assistant',
            content: assistantReply,
            timestamp: Date.now(),
            suggestions: assistantSuggestions,
            videos: videos.length > 0 ? videos : undefined,
            courses: courses.length > 0 ? courses : undefined,
          },
        ]);
      } else {
        throw new Error('Empty reply');
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('AICoach fetch:', err);
      }
      const fallback = generateCoachReply(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: makeMessageId(),
          role: 'assistant',
          content: fallback.reply,
          timestamp: Date.now(),
          suggestions: fallback.suggestions,
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage(suggestion);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans sm:bottom-8 sm:right-8">
      <button
        ref={buttonRef}
        onClick={toggleCoach}
        className="coach-btn group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Open coach assistant"
      >
        {isOpen ? (
          <IoClose className="text-2xl" />
        ) : (
          <IoSparkles className="text-2xl transition-transform group-hover:rotate-12" />
        )}
        {!isOpen && (
          <div className="absolute -right-1 -top-1 h-4 w-4 animate-bounce rounded-full border-2 border-[#0a0a0c] bg-red-500" />
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="coach-window absolute bottom-20 right-0 flex h-[min(520px,72vh)] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#12141c]/95 shadow-2xl backdrop-blur-2xl max-sm:fixed max-sm:bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] max-sm:left-2 max-sm:right-2 max-sm:h-[70vh] max-sm:w-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-indigo-600/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
                <IoSparkles className="text-lg" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight text-white">{t('coach.title')}</h4>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <span className="mt-0.5 text-[10px] font-black uppercase tracking-widest leading-none text-white/40">
                    {t('coach.smartAssistant')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold text-indigo-400">
                {t('coach.aiVideoSearch')}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id}>
                {/* Message bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'assistant'
                      ? 'self-start rounded-tl-none border-white/5 bg-indigo-600/10 text-white/85'
                      : 'ml-auto rounded-tr-none border-indigo-500/20 bg-white/10 text-white'
                  }`}
                >
                  {/* Render message with basic markdown-like formatting (safe, no raw HTML). */}
                  <div className="whitespace-pre-wrap break-words">
                    {message.content.split('\n').map((line, i) => {
                      return (
                        <span key={i}>
                          {i > 0 && <br />}
                          {renderBoldSegments(line)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Video cards */}
                {message.role === 'assistant' && message.videos && message.videos.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-1">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                      <IoPlay className="text-xs" /> {t('coach.foundVideos')}
                    </p>
                    {message.videos.map((v) => (
                      <VideoCardItem key={v._id} video={v} />
                    ))}
                  </div>
                )}

                {/* Course cards */}
                {message.role === 'assistant' && message.courses && message.courses.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-1">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      <IoBook className="text-xs" /> {t('coach.relatedCourses')}
                    </p>
                    {message.courses.map((c) => (
                      <CourseCardItem key={c._id} course={c} />
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.role === 'assistant' && message.suggestions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/75 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-2">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-white/30">{t('coach.typing')}</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-white/5 bg-black/40 p-3">
            <div className="relative flex-1">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/20" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('coach.inputPlaceholder')}
                value={input}
                maxLength={1000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-8 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/20 focus:border-indigo-500/50"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={() => void sendMessage()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isTyping || !input.trim()}
              aria-label="Send message"
            >
              <IoSend className="text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

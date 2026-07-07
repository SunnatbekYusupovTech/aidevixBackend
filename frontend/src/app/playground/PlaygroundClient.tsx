'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoSparkles, IoCheckmarkCircle, IoWarning, IoAlertCircle,
  IoBulb, IoCopyOutline, IoTrash, IoArrowDown, IoCodeSlash,
} from 'react-icons/io5';
import { playgroundApi, type PlaygroundReview } from '@/api/playgroundApi';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// Monaco is ~450KB minified. Defer it until the user actually intends to edit
// (click / focus / keyboard) so bounce visitors and slow-network users get
// instant first paint with a read-only preview.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGS: { value: string; label: string; sample: string }[] = [
  {
    value: 'javascript',
    label: 'JavaScript',
    sample: `// Salom! Bu yerga kodingizni yozing.\nfunction sum(a, b) {\n  return a + b;\n}\n\nconsole.log(sum(2, 3));\n`,
  },
  {
    value: 'typescript',
    label: 'TypeScript',
    sample: `function sum(a: number, b: number): number {\n  return a + b;\n}\n\nconsole.log(sum(2, 3));\n`,
  },
  {
    value: 'python',
    label: 'Python',
    sample: `def sum(a, b):\n    return a + b\n\nprint(sum(2, 3))\n`,
  },
  {
    value: 'tsx',
    label: 'React TSX',
    sample: `import { useState } from 'react';\n\nexport default function Counter() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>{n}</button>;\n}\n`,
  },
  { value: 'go', label: 'Go', sample: `package main\nimport "fmt"\nfunc main() {\n\tfmt.Println("hello")\n}\n` },
  { value: 'rust', label: 'Rust', sample: `fn main() {\n    println!("hello");\n}\n` },
  { value: 'sql', label: 'SQL', sample: `SELECT id, name FROM users WHERE active = true LIMIT 10;\n` },
];

const SEVERITY = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: <IoAlertCircle /> },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: <IoWarning /> },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: <IoWarning /> },
  low:      { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: <IoBulb /> },
};

export default function PlaygroundClient() {
  const { isDark } = useTheme();
  const { isLoggedIn } = useAuth();

  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState(LANGS[0].sample);
  const [prompt, setPrompt] = useState('');
  const [review, setReview] = useState<PlaygroundReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monaco is only mounted after user signals intent to edit. Saves ~450KB
  // for unauth visitors, bounce traffic, and slow-network users on first paint.
  const [editorReady, setEditorReady] = useState(false);
  const activateEditor = useCallback(() => setEditorReady(true), []);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    const sample = LANGS.find((l) => l.value === newLang)?.sample || '';
    if (!code.trim() || code === LANGS.find((l) => l.value === lang)?.sample) {
      setCode(sample);
    }
  };

  const handleReview = async () => {
    if (!isLoggedIn) {
      setError('AI tahlil olish uchun avval ro\'yxatdan o\'ting yoki login qiling.');
      return;
    }
    if (!code.trim()) {
      setError('Kod kiriting');
      return;
    }
    setLoading(true);
    setError(null);
    setReview(null);
    try {
      const res: any = await playgroundApi.review({ code, language: lang, prompt: prompt || undefined });
      setReview(res.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'AI tahlil amalga oshmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setReview(null);
    setError(null);
  };

  const handleApplyRewrite = () => {
    if (review?.rewrite) {
      setCode(review.rewrite);
      setReview(null);
    }
  };

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200';

  const scoreColor = useMemo(() => {
    if (!review) return '';
    if (review.score >= 80) return 'text-emerald-400';
    if (review.score >= 60) return 'text-yellow-400';
    if (review.score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }, [review]);

  return (
    <div className={`min-h-screen pt-20 pb-12 ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Beta</div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <IoSparkles className="text-indigo-400" /> AI Code Playground
            </h1>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Kod yozing → "AI Tekshirish" → real-time sharhlar va tuzatishlar.
            </p>
          </div>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
            >
              Login →
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          {/* Editor panel */}
          <div className={`rounded-3xl border overflow-hidden ${cardBg}`}>
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/5">
              <select
                value={lang}
                onChange={(e) => handleLangChange(e.target.value)}
                className={`text-sm font-bold rounded-lg px-3 py-1.5 border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={handleClear}
                className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border ${
                  isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <IoTrash /> Tozalash
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(code).catch(() => {})}
                className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border ${
                  isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <IoCopyOutline /> Nusxalash
              </button>
            </div>

            <div className="h-[60vh] min-h-[480px]">
              {editorReady ? (
                <MonacoEditor
                  height="100%"
                  language={lang === 'tsx' ? 'typescript' : lang}
                  theme={isDark ? 'vs-dark' : 'light'}
                  value={code}
                  onChange={(v) => setCode(v || '')}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontLigatures: true,
                    smoothScrolling: true,
                    tabSize: 2,
                    automaticLayout: true,
                    wordWrap: 'on',
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={activateEditor}
                  onFocus={activateEditor}
                  className={`group relative h-full w-full overflow-auto text-left font-mono text-[13px] leading-6 p-5 ${
                    isDark ? 'bg-[#0A0E1A] text-slate-300' : 'bg-slate-50 text-slate-700'
                  }`}
                  aria-label="Editor'ni faollashtirish"
                >
                  <pre className="whitespace-pre-wrap pr-12">{code}</pre>
                  <span
                    className={`pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-opacity group-hover:opacity-100 ${
                      isDark
                        ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-300'
                        : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <IoCodeSlash /> Tahrirlash uchun bosing
                  </span>
                </button>
              )}
            </div>

            <div className="p-3 border-t border-white/5 flex flex-col sm:flex-row gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                placeholder="Aniq savol bering (ixtiyoriy): masalan, 'performance qanday yaxshilanadi?'"
                className={`flex-1 px-3 py-2 rounded-xl border text-sm ${
                  isDark ? 'bg-white/5 border-white/10 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 placeholder:text-slate-400'
                }`}
              />
              <button
                onClick={handleReview}
                disabled={loading || !code.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 transition-shadow flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Tahlil...
                  </>
                ) : (
                  <>
                    <IoSparkles /> AI Tekshirish
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Review panel */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-3">
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300 p-4 text-sm">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {!review && !loading && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-3xl border p-6 text-center ${cardBg}`}
                >
                  <div className="text-4xl mb-3">🤖</div>
                  <h3 className="font-bold text-base mb-1">AI Coach kutmoqda</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Kodingizni yozing va "AI Tekshirish" tugmasini bosing.
                  </p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-3xl border p-6 ${cardBg}`}
                >
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                    <div className="h-20 bg-white/10 rounded" />
                  </div>
                </motion.div>
              )}

              {review && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* Score */}
                  <div className={`rounded-3xl border p-5 ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ball</div>
                      {review.degraded && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-bold">FALLBACK</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className={`text-4xl font-black ${scoreColor}`}>{review.score}</div>
                      <div className="text-sm text-slate-500">/100</div>
                    </div>
                    <p className={`mt-3 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {review.summary}
                    </p>
                  </div>

                  {/* Issues */}
                  {review.issues.length > 0 && (
                    <div className={`rounded-3xl border p-4 ${cardBg}`}>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                        Topilgan masalalar ({review.issues.length})
                      </h3>
                      <div className="space-y-2">
                        {review.issues.map((iss, i) => {
                          const s = SEVERITY[iss.severity] || SEVERITY.low;
                          return (
                            <div key={i} className={`rounded-xl border p-3 text-sm ${s.bg}`}>
                              <div className={`flex items-center gap-2 font-bold ${s.color} mb-1`}>
                                {s.icon}
                                <span className="uppercase text-[10px] tracking-wider">{iss.severity}</span>
                                {iss.line ? <span className="text-[10px] text-slate-500">qator {iss.line}</span> : null}
                              </div>
                              <div className={isDark ? 'text-slate-200' : 'text-slate-800'}>{iss.message}</div>
                              {iss.fix && (
                                <div className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  💡 {iss.fix}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {review.improvements.length > 0 && (
                    <div className={`rounded-3xl border p-4 ${cardBg}`}>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <IoCheckmarkCircle className="text-emerald-400" /> Yaxshilanishlar
                      </h3>
                      <ul className={`space-y-1.5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {review.improvements.map((im, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-emerald-400 flex-shrink-0">→</span>
                            <span>{im}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rewrite */}
                  {review.rewrite && (
                    <div className={`rounded-3xl border p-4 ${cardBg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Tavsiya etilgan kod</h3>
                        <button
                          onClick={handleApplyRewrite}
                          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
                        >
                          <IoArrowDown /> Qo'llash
                        </button>
                      </div>
                      <pre className={`text-xs font-mono p-3 rounded-xl overflow-x-auto max-h-64 ${
                        isDark ? 'bg-black/40 text-slate-200' : 'bg-slate-100 text-slate-800'
                      }`}>
                        <code>{review.rewrite}</code>
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

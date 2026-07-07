'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn, selectUser } from '@store/slices/authSlice';
import api from '@api/axiosInstance';
import { toast } from 'react-hot-toast';
import { IoSend, IoChatbubbleEllipses, IoCheckmarkCircle, IoTime } from 'react-icons/io5';
import { useLang } from '@/context/LangContext';

interface Question {
  _id: string;
  userId: { _id: string; username: string; avatar?: string };
  question: string;
  answer?: string;
  answeredBy?: { username: string };
  isAnswered: boolean;
  createdAt: string;
}

export default function VideoComments({ videoId }: { videoId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);
  const { t } = useLang();

  const fetchQuestions = async (p = 1, replace = true) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/videos/${videoId}/questions`, { params: { page: p, limit: 10 } });
      const list: Question[] = data?.data?.questions || [];
      if (replace) setQuestions(list);
      else setQuestions(prev => [...prev, ...list]);
      setHasMore(list.length === 10);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('VideoComments fetch xato:', err);
      }
      if (replace) toast.error('Savol-javoblarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(1, true);
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    if (!isLoggedIn) { toast.error('Savol berish uchun tizimga kiring'); return; }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/videos/${videoId}/questions`, { question: newQuestion.trim() });
      const created: Question = data?.data;
      if (created) setQuestions(prev => [created, ...prev]);
      setNewQuestion('');
      toast.success('Savol yuborildi!');
    } catch {
      toast.error('Xato yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchQuestions(next, false);
  };

  return (
    <div className="mt-12 bg-[#111726]/60 border border-white/5 rounded-3xl p-6 sm:p-10">
      <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
        <IoChatbubbleEllipses className="text-indigo-400 text-2xl" />
        Savol-Javoblar
        {questions.length > 0 && (
          <span className="ml-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            {questions.length}
          </span>
        )}
      </h2>

      {/* Ask form */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 relative">
              <textarea
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="Dars haqida savol bering..."
                rows={3}
                maxLength={1000}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-all text-sm"
              />
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-slate-600">{newQuestion.length}/1000</span>
                <button
                  type="submit"
                  disabled={submitting || !newQuestion.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-semibold rounded-full transition-all active:scale-95"
                >
                  <IoSend className="text-base" />
                  {submitting ? 'Yuborilmoqda...' : 'Savol berish'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-10 p-5 rounded-2xl border border-white/5 bg-white/3 text-center text-slate-400 text-sm">
          Savol berish uchun{' '}
          <a href="/login" className="text-indigo-400 font-semibold hover:underline">tizimga kiring</a>
        </div>
      )}

      {/* Questions list */}
      {loading && questions.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-1/4" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <IoChatbubbleEllipses className="text-4xl mx-auto mb-3 opacity-30" />
          <p>Hali savol yo'q. Birinchi bo'lib savol bering!</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-6">
            {questions.map((q, i) => (
              <motion.div
                key={q._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-2xl border p-6 ${
                  q.isAnswered
                    ? 'border-indigo-500/20 bg-indigo-500/5'
                    : 'border-white/5 bg-white/3'
                }`}
              >
                {/* Question */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {q.userId?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">
                        {q.userId?.username || 'Foydalanuvchi'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <IoTime className="text-[11px]" />
                        {new Date(q.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                      {q.isAnswered && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <IoCheckmarkCircle /> Javob berildi
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{q.question}</p>
                  </div>
                </div>

                {/* Answer */}
                {q.isAnswered && q.answer && (
                  <div className="mt-4 ml-13 pl-4 border-l-2 border-indigo-500/40">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <span className="text-[10px] font-black text-indigo-400">A</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">
                        {q.answeredBy?.username || 'Mentor'} • Javob
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{q.answer}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {hasMore && questions.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 rounded-full border border-white/10 bg-white/3 hover:bg-white/8 text-slate-300 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Yuklanmoqda...' : 'Ko\'proq ko\'rsatish'}
          </button>
        </div>
      )}
    </div>
  );
}

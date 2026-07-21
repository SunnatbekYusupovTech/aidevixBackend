'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { HiOutlineLightningBolt, HiOutlineRefresh } from 'react-icons/hi';
import { reviewApi, type ReviewCard, type ReviewGrade } from '@api/reviewApi';
import { selectIsLoggedIn } from '@store/slices/authSlice';

const GRADE_BUTTONS: { result: ReviewGrade; label: string; classes: string }[] = [
  { result: 'again', label: 'Qayta', classes: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' },
  { result: 'hard', label: 'Qiyin', classes: 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
  { result: 'good', label: 'Yaxshi', classes: 'border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20' },
  { result: 'easy', label: 'Oson', classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' },
];

export default function ReviewPage() {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grading, setGrading] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const loadDueCards = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await reviewApi.getDueCards();
      setCards(data?.data?.cards || []);
      setIndex(0);
      setRevealed(false);
      setReviewedCount(0);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Kartalarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadDueCards();
  }, [loadDueCards]);

  const currentCard = cards[index];
  const total = cards.length;

  const handleGrade = async (result: ReviewGrade) => {
    if (!currentCard || grading) return;
    setGrading(true);
    try {
      const { data } = await reviewApi.gradeCard(currentCard._id, result);
      const xpEarned = data?.data?.xpEarned || 0;
      if (xpEarned > 0) {
        toast.success(`+${xpEarned} XP`, { icon: '⚡' });
      }
      setReviewedCount((c) => c + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Baholashda xatolik yuz berdi.');
    } finally {
      setGrading(false);
    }
  };

  // --- Not logged in ---
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[80vh] w-full min-w-0 items-center justify-center overflow-x-clip px-3">
        <div className="w-full max-w-md min-w-0 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-400/20 bg-indigo-400/10">
            <HiOutlineRefresh className="text-4xl text-indigo-400" />
          </div>
          <h1 className="mb-3 max-w-full text-balance text-2xl font-black sm:mb-4 sm:text-3xl">Takrorlash</h1>
          <p className="text-base-content/60 mb-8">Kartalarni ko&apos;rish uchun tizimga kiring.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
          >
            <HiOutlineLightningBolt />
            Kirish
          </Link>
        </div>
      </div>
    );
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="flex min-h-[80vh] w-full min-w-0 items-center justify-center overflow-x-clip px-3">
        <div className="w-full max-w-md min-w-0 text-center">
          <h1 className="mb-3 text-2xl font-black">Takrorlash</h1>
          <p className="text-error mb-6 text-sm">{error}</p>
          <button
            onClick={loadDueCards}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
          >
            <HiOutlineRefresh />
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  // --- Empty state (no due cards at all) ---
  if (total === 0) {
    return (
      <div className="flex min-h-[80vh] w-full min-w-0 items-center justify-center overflow-x-clip px-3">
        <div className="w-full max-w-md min-w-0 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="mb-3 max-w-full text-balance text-2xl font-black sm:mb-4 sm:text-3xl">
            Bugun takrorlash uchun karta yo&apos;q 🎉
          </h1>
          <p className="text-base-content/60 mb-8">
            Quizlarni yechganingizda xato javoblardan kartalar paydo bo&apos;ladi.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
          >
            <HiOutlineLightningBolt />
            Kurslarga o&apos;tish
          </Link>
        </div>
      </div>
    );
  }

  // --- Completion state (deck finished) ---
  if (index >= total) {
    return (
      <div className="flex min-h-[80vh] w-full min-w-0 items-center justify-center overflow-x-clip px-3">
        <div className="w-full max-w-md min-w-0 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10"
          >
            <span className="text-4xl">🏆</span>
          </motion.div>
          <h1 className="mb-3 max-w-full text-balance text-2xl font-black sm:mb-4 sm:text-3xl">Ajoyib ish!</h1>
          <p className="text-base-content/60 mb-8">
            {reviewedCount} ta karta takrorlandi. Ertaga yangi kartalar bilan qaytib keling.
          </p>
          <button
            onClick={loadDueCards}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
          >
            <HiOutlineRefresh />
            Yangilash
          </button>
        </div>
      </div>
    );
  }

  // --- Active flashcard ---
  return (
    <div className="flex min-h-[80vh] w-full min-w-0 items-start justify-center overflow-x-clip px-3 pt-8 sm:pt-12">
      <div className="w-full max-w-xl min-w-0">
        {/* Progress indicator */}
        <div className="mb-4 flex items-center justify-between text-sm text-base-content/60">
          <span className="inline-flex items-center gap-2 font-bold">
            <HiOutlineRefresh className="text-indigo-400" />
            Takrorlash
          </span>
          <span className="font-mono font-semibold">
            {index + 1} / {total}
          </span>
        </div>
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-base-300">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${Math.round((index / total) * 100)}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard._id}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-base-content/10 bg-base-200/40 p-5 shadow-lg sm:p-7"
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400/80">
              {currentCard.quizTitle}
            </div>
            <h2 className="mb-6 text-lg font-bold leading-snug sm:text-xl">{currentCard.question}</h2>

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99]"
              >
                Javobni ko&apos;rsatish
              </button>
            ) : (
              <>
                <ul className="mb-6 space-y-2">
                  {currentCard.options.map((option, i) => {
                    const isCorrect = i === currentCard.correctAnswer;
                    return (
                      <li
                        key={i}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                          isCorrect
                            ? 'border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-300'
                            : 'border-base-content/10 bg-base-100/40 text-base-content/70'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCorrect ? 'bg-emerald-500 text-white' : 'bg-base-content/10 text-base-content/60'
                          }`}
                        >
                          {isCorrect ? '✓' : String.fromCharCode(65 + i)}
                        </span>
                        <span>{option}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mb-3 text-center text-xs text-base-content/50">
                  Bu savolni qanchalik yaxshi eslay oldingiz?
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADE_BUTTONS.map((btn) => (
                    <button
                      key={btn.result}
                      onClick={() => handleGrade(btn.result)}
                      disabled={grading}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${btn.classes}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

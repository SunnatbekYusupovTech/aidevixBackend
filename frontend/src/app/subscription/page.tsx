'use client';

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoLockClosed, IoCheckmarkCircle, IoArrowForward, IoRefreshOutline } from 'react-icons/io5';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '@hooks/useSubscription';
import TelegramVerify from '@components/subscription/TelegramVerify';
import InstagramVerify from '@components/subscription/InstagramVerify';
import { useLang } from '@/context/LangContext';

function SubscriptionContent() {
  const { allVerified, telegram, instagram, refetch } = useSubscription();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/courses';
  const { t } = useLang();

  // Sequential flow: Telegram first, then Instagram
  const showTelegram = !telegram?.subscribed
  const showInstagram = !!telegram?.subscribed && !instagram?.subscribed

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/5">
            <IoLockClosed size={48} className="text-indigo-400" />
          </div>
          <h1 className="mb-3 max-w-full text-balance text-2xl font-black leading-tight tracking-tight text-white sm:mb-4 sm:text-3xl md:text-4xl">
            {t('sub.title')}
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
            {t('sub.desc')}
          </p>
        </motion.div>

        <div className="mb-16">
          <ul className="steps w-full">
            <li className={`step ${telegram?.subscribed ? 'step-primary font-bold text-white' : 'text-slate-500'}`}>Telegram</li>
            <li className={`step ${telegram?.subscribed && instagram?.subscribed ? 'step-primary font-bold text-white' : 'text-slate-500'}`}>Instagram</li>
            <li className={`step ${allVerified ? 'step-primary font-bold text-white' : 'text-slate-500'}`}>{t('nav.ready')}</li>
          </ul>
        </div>

        <div className="bg-[#111726]/60 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -z-10"></div>

          <AnimatePresence mode="wait">
            {!allVerified ? (
              <motion.div
                key="subscription-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                {showTelegram && <TelegramVerify onTelegramVerified={() => refetch()} />}
                {showInstagram && <InstagramVerify onVerified={() => refetch()} />}
              </motion.div>
            ) : (
              <motion.div
                key="success-message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                  <IoCheckmarkCircle size={64} className="text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 italic">{t('sub.successTitle')}</h2>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                  {t('sub.successDesc')}
                </p>
                <Link
                  href={returnUrl}
                  className="btn btn-primary bg-indigo-500 hover:bg-indigo-600 border-none w-full rounded-2xl h-14 font-black normal-case text-lg shadow-2xl shadow-indigo-500/30"
                >
                  {returnUrl.startsWith('/videos/')
                    ? <>Videoga o&apos;tish <IoArrowForward className="ml-2" /></>
                    : <>{t('footer.fCourses')} <IoArrowForward className="ml-2" /></>
                  }
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between gap-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
              {t('sub.hint')}
            </p>
            <button
              onClick={() => refetch()}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:rotate-180 duration-500"
            >
              <IoRefreshOutline size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams Suspense boundary talab qiladi — aks holda statik prerender
// butun sahifani CSR'ga bailout qiladi (Next 14 build ogohlantirishi/xatosi).
export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0E1A]" />}>
      <SubscriptionContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoDownload, IoShareOutline, IoAddOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import SiteLogoMark from '@components/common/SiteLogoMark';
import { usePwaInstall } from '@/hooks/usePwaInstall';

// Bu sessiyada yopilgan bo'lsa qayta ko'rsatmaymiz (keyingi tashrifda yana chiqadi).
const SESSION_DISMISS_KEY = 'aidevix_install_fab_dismissed';

export default function InstallAppFab() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'
  );
  const [iosOpen, setIosOpen] = useState(false);

  // Allaqachon o'rnatilgan, yoki o'rnatib bo'lmaydi (Android prompt yo'q va iOS emas), yoki yopilgan
  const showFab = !isInstalled && !dismissed && (canInstall || isIOS);

  const handleClick = async () => {
    if (isIOS && !canInstall) {
      setIosOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      /* sessionStorage mavjud emas */
    }
  };

  return (
    <>
      <AnimatePresence>
        {showFab && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed bottom-4 left-4 z-[900] flex items-center"
          >
            <button
              onClick={handleClick}
              aria-label="Aidevix ilovasini o'rnatish"
              className="group flex items-center gap-2 rounded-full bg-indigo-500 py-2.5 pl-2.5 pr-4 text-white shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 hover:bg-indigo-400 active:scale-95"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <IoDownload className="text-lg" />
              </span>
              <span className="text-xs font-bold whitespace-nowrap">Ilovani o'rnatish</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Yopish"
              className="-ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#111726] text-slate-400 shadow-lg transition-colors hover:text-white"
            >
              <IoClose size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS uchun qo'lda o'rnatish yo'riqnomasi (Safari beforeinstallprompt'ni qo'llamaydi) */}
      <AnimatePresence>
        {iosOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="iPhone'da o'rnatish yo'riqnomasi"
            onClick={() => setIosOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111726] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <SiteLogoMark size={44} className="flex-shrink-0 border border-indigo-500/20" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Aidevix'ni bosh ekranga qo'shing</p>
                  <p className="mt-0.5 text-xs text-slate-400">iPhone uchun 3 ta oddiy qadam</p>
                </div>
                <button
                  onClick={() => setIosOpen(false)}
                  aria-label="Yopish"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10"
                >
                  <IoClose size={16} />
                </button>
              </div>

              <ol className="mt-5 space-y-3">
                <li className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">1</span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-200">
                    Pastdagi <IoShareOutline className="text-base text-indigo-300" /> <b>Ulashish</b> tugmasini bosing
                  </span>
                </li>
                <li className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">2</span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-200">
                    <IoAddOutline className="text-base text-indigo-300" /> <b>"Bosh ekranga qo'shish"</b>ni tanlang
                  </span>
                </li>
                <li className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">3</span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-200">
                    <IoPhonePortraitOutline className="text-base text-indigo-300" /> <b>"Qo'shish"</b>ni bosing — tayyor!
                  </span>
                </li>
              </ol>

              <button
                onClick={() => setIosOpen(false)}
                className="mt-5 w-full rounded-2xl bg-indigo-500 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-400"
              >
                Tushunarli
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoDownload, IoSparkles } from 'react-icons/io5';
import SiteLogoMark from '@components/common/SiteLogoMark';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const STORAGE_KEY = 'aidevix_pwa_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun keyin yana so'raymiz

export default function PWAInstallPrompt() {
  // Install event'ni umumiy singleton hook ushlaydi (suzuvchi knopka bilan
  // bir eventni ikki marta `.prompt()` qilib yubormaslik uchun).
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled) return;
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const timer = setTimeout(() => setIsVisible(true), 8000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  // SW update detector — `register-sw.js` `aidevix:sw-update` event yuboradi
  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener('aidevix:sw-update', onUpdate as EventListener);
    return () => window.removeEventListener('aidevix:sw-update', onUpdate as EventListener);
  }, []);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'dismissed') {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleUpdate = () => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* SW update banner */}
      <AnimatePresence>
        {updateReady && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            role="alert"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[1100] bg-indigo-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md text-sm"
          >
            <IoSparkles className="text-yellow-300 text-lg flex-shrink-0" />
            <span className="font-semibold">Yangi versiya tayyor</span>
            <button
              onClick={handleUpdate}
              className="ml-2 bg-white text-indigo-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              Yangilash
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install banner */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] w-full max-w-sm px-4"
            role="dialog"
            aria-label="Aidevix ilovasini o'rnatish"
          >
            <div className="bg-[#111726] border border-white/10 rounded-3xl p-5 shadow-2xl flex items-center gap-4">
              <SiteLogoMark size={48} className="flex-shrink-0 border border-indigo-500/20 shadow-md shadow-indigo-500/10" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Aidevix ilovasi</p>
                <p className="text-slate-400 text-xs mt-0.5">Internetsiz ham ishlaydi, tezroq ochiladi</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleInstall}
                  aria-label="Ilovani o'rnatish"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <IoDownload className="text-sm" /> O'rnatish
                </button>
                <button
                  onClick={handleDismiss}
                  aria-label="Yopish"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <IoClose size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

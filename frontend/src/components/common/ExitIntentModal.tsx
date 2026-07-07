'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { IoClose, IoGift, IoFlash } from 'react-icons/io5';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '@store/slices/authSlice';

const SESSION_KEY = 'aidevix_exit_intent_shown';

export default function ExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  useEffect(() => {
    // Sessionda 1 marta + login bo'lganda ko'rsatmaslik
    if (isLoggedIn || sessionStorage.getItem(SESSION_KEY)) return;

    let triggered = false;
    const onMouseLeave = (e: MouseEvent) => {
      if (triggered || e.clientY > 20) return;
      triggered = true;
      sessionStorage.setItem(SESSION_KEY, '1');
      // Kichik kechikish: page load bo'lgandan keyin 3s o'tib ishlaydi
      setIsOpen(true);
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', onMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [isLoggedIn]);

  if (isLoggedIn) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative w-full max-w-md bg-[#111726] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            {/* Decorative glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_50%)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/10 blur-3xl pointer-events-none" />

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <IoClose size={18} />
            </button>

            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-indigo-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <IoGift className="text-3xl text-amber-400" />
              </div>

              <h2 className="text-2xl font-black text-white mb-2 leading-tight">
                Kuting, sovg'a bor! 🎁
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Ro'yxatdan o'ting va darhol{' '}
                <span className="text-amber-400 font-bold">+100 XP</span> bonus oling.
                O'zbek tilida eng yaxshi dasturlash platformasida o'rganishni boshlang!
              </p>

              <div className="space-y-3">
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full h-13 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/30"
                >
                  <IoFlash />
                  Bepul Ro'yxatdan O'tish
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  Yo'q, rahmat
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

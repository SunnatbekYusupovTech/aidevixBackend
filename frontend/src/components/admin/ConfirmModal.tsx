'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantCfg: Record<ConfirmVariant, { icon: React.ReactNode; iconWrap: string; btn: string }> = {
  danger: {
    icon: <FiAlertTriangle className="h-5 w-5" />,
    iconWrap: 'border-red-500/30 bg-red-500/10 text-red-400',
    btn: 'bg-red-600 hover:bg-red-500 shadow-red-600/20',
  },
  warning: {
    icon: <FiAlertCircle className="h-5 w-5" />,
    iconWrap: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
  },
  info: {
    icon: <FiInfo className="h-5 w-5" />,
    iconWrap: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    btn: 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20',
  },
};

export default function ConfirmModal({
  open,
  title,
  message,
  variant = 'danger',
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cfg = variantCfg[variant];

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111726] p-7 shadow-2xl"
          >
            <button
              type="button"
              onClick={onCancel}
              aria-label="Yopish"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
            >
              <FiX className="h-4 w-4" />
            </button>

            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${cfg.iconWrap}`}>
              {cfg.icon}
            </div>

            <h3 id="confirm-modal-title" className="mb-2 text-base font-bold text-white">{title}</h3>
            {message && (
              <p className="text-sm leading-relaxed text-slate-400">{message}</p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                disabled={loading}
                onClick={onCancel}
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 ${cfg.btn}`}
              >
                {loading && <span className="loading loading-spinner loading-xs" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

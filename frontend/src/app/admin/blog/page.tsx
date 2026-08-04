'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';

export default function BlogPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Maqolalar (Blog)</h2>
          <p className="text-slate-400">Sayt blogidagi maqola va xabarlarni boshqarish</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#111726]/50 p-8 text-center backdrop-blur-sm"
      >
        <div className="mb-4 rounded-full bg-amber-500/10 p-4 text-amber-500">
          <FiClock className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Tez kunda...</h3>
        <p className="mt-2 max-w-md text-slate-400">
          Blog tizimi hozirda ishlab chiqilmoqda. Yaqin orada to'liq ishga tushiriladi.
        </p>
      </motion.div>
    </div>
  );
}

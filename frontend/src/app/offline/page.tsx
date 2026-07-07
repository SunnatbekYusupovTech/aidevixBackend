'use client';

import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

export default function OfflinePage() {
  const { t } = useLang();
  const { isDark } = useTheme();

  const bg = isDark ? 'bg-[#0A0E1A]' : 'bg-slate-50';
  const titleCls = isDark ? 'text-white' : 'text-slate-900';
  const descCls = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${bg}`}>
      <div className="text-6xl mb-6">📡</div>
      <h1 className={`text-3xl font-black mb-3 ${titleCls}`}>{t('offline.title')}</h1>
      <p className={`max-w-md mb-8 ${descCls}`}>
        {t('offline.desc')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-colors"
      >
        {t('offline.retry')}
      </button>
    </div>
  );
}

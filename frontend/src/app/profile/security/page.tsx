'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@utils/constants';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

export default function ProfileSecurityRedirect() {
  const { t } = useLang();
  const { isDark } = useTheme();
  const router = useRouter();
  useEffect(() => {
    router.replace(ROUTES.SETTINGS_SECURITY);
  }, [router]);
  const bg = isDark ? 'bg-[#0A0E1A] text-slate-400' : 'bg-slate-50 text-slate-500';
  return (
    <div className={`min-h-screen flex items-center justify-center text-sm ${bg}`}>
      {t('security.redirecting')}
    </div>
  );
}

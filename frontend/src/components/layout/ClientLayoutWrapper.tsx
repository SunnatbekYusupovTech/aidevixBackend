'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollToTop from '@/components/layout/ScrollToTop';

const DailyRewardModal = dynamic(() => import('@components/common/DailyRewardModal'), { ssr: false });
const LiveActivityTicker = dynamic(() => import('@components/common/LiveActivityTicker'), { ssr: false });
const AICoach = dynamic(() => import('@components/common/AICoach'), { ssr: false });
const ExitIntentModal = dynamic(() => import('@components/common/ExitIntentModal'), { ssr: false });
const BetaWelcomeModal = dynamic(() => import('@components/common/BetaWelcomeModal'), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('@components/common/PwaInstallPrompt'), { ssr: false });
const CookieConsent = dynamic(() => import('@components/common/CookieConsent'), { ssr: false });
const TelegramMiniAppBridge = dynamic(() => import('@components/common/TelegramMiniAppBridge'), { ssr: false });
const SecurityHardening = dynamic(() => import('@components/security/SecurityHardening'), { ssr: false });

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [showEnhancements, setShowEnhancements] = useState(false);
  const [showDeferredPrompts, setShowDeferredPrompts] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // List of paths where we DON'T want the global Navbar and Footer
  const isPlayground = (pathname || '').includes('/playground');
  const hideLayout = [
    '/login',
    '/register',
    '/forgot-password',
    '/verify-code',
    '/reset-password',
  ].includes(pathname || '') || 
  (pathname || '').startsWith('/admin') || 
  isPlayground;
  
  const showAmbientWidgets = (pathname === '/' || pathname?.startsWith('/courses')) && !isPlayground;
  
  useEffect(() => {
    if (!isMounted || hideLayout) {
      setShowEnhancements(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const enable = () => setShowEnhancements(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1500 });
    } else {
      timeoutId = setTimeout(enable, 900);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isMounted, hideLayout, pathname]);

  useEffect(() => {
    if (!isMounted || hideLayout) {
      setShowDeferredPrompts(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const enableDeferredPrompts = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const shouldDeferForPerf = window.innerWidth < 768 || Boolean(connection?.saveData);
      if (!shouldDeferForPerf) {
        setShowDeferredPrompts(true);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enableDeferredPrompts, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(enableDeferredPrompts, 1800);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isMounted, hideLayout, pathname]);

  return (
    <>
      {isMounted && !hideLayout && <Navbar />}
      {showEnhancements && <DailyRewardModal />}
      
      <main className="relative w-full min-w-0 max-w-full overflow-x-clip">
        {children}
      </main>

      {showEnhancements && showAmbientWidgets && <LiveActivityTicker />}
      {showEnhancements && showAmbientWidgets && <AICoach />}
      {showDeferredPrompts && <BetaWelcomeModal />}
      {showDeferredPrompts && <ExitIntentModal />}
      {showDeferredPrompts && <PWAInstallPrompt />}
      {isMounted && !hideLayout && <Footer />}
      {isMounted && <ScrollToTop />}
      {isMounted && <CookieConsent />}
      {isMounted && <TelegramMiniAppBridge />}
      {isMounted && <SecurityHardening />}
    </>
  );
}

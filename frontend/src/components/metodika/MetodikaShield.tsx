'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FiEyeOff } from 'react-icons/fi';
import { metodikaApi } from '@/api/metodikaApi';

/**
 * Brauzer tomonidagi himoya qatlami (asosiy himoya — backend'da: ikki bosqichli ruxsat,
 * rate limit, jurnal). Bu yerda:
 *  - matnni belgilash, nusxalash, o'ng tugma, sudrab olish, chop etish, saqlash bloklanadi;
 *  - oyna fokusni yo'qotsa yoki DevTools ochilsa kontent DOM'dan OLIB TASHLANADI;
 *  - butun sahifa ustida tomoshabin ismi/ID/vaqti yozilgan watermark turadi.
 *
 * Halol cheklov: skrinshot yoki telefon bilan suratga olishni brauzer to'liq to'sa olmaydi.
 * Watermark shuning uchun: sizib chiqqan suratda kimniki ekani ko'rinib turadi.
 */

type Viewer = { id: string; username: string; name: string };

const BLOCKED_CTRL_KEYS = new Set(['c', 'x', 'a', 's', 'p', 'u']);
const BLOCKED_DEVTOOLS_KEYS = new Set(['i', 'j', 'c', 'k']);

function Watermark({ viewer }: { viewer: Viewer }) {
  const label = useMemo(() => {
    const stamp = new Date().toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
    return `${viewer.username} · ${viewer.id.slice(-8)} · ${stamp}`;
  }, [viewer]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-20 opacity-[0.07]">
        {Array.from({ length: 120 }, (_, i) => (
          <span key={i} className="whitespace-nowrap font-mono text-sm font-semibold text-white">{label}</span>
        ))}
      </div>
    </div>
  );
}

export default function MetodikaShield({
  viewer,
  enforce,
  children,
}: {
  viewer: Viewer;
  /** Egasi uchun false: u tahrirlaydi va nusxalay oladi. */
  enforce: boolean;
  children: ReactNode;
}) {
  const [hiddenReason, setHiddenReason] = useState<null | 'blur' | 'devtools'>(null);
  const reported = useRef(new Set<string>());

  useEffect(() => {
    if (!enforce) return undefined;

    const report = (type: Parameters<typeof metodikaApi.event>[0]) => {
      // Har hodisa turi sahifa ochilishida bir marta — jurnalni to'ldirib yubormaslik uchun.
      if (reported.current.has(type)) return;
      reported.current.add(type);
      void metodikaApi.event(type);
    };

    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (key === 'f12' || (mod && e.shiftKey && BLOCKED_DEVTOOLS_KEYS.has(key))) {
        stop(e);
        report('devtools');
        return;
      }
      if (mod && BLOCKED_CTRL_KEYS.has(key)) {
        stop(e);
        report(key === 'p' ? 'print' : 'copy');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'PrintScreen') return;
      report('screenshot_key');
      // Buferga tushgan suratni bo'sh matn bilan almashtirishga urinish (har doim ham ishlamaydi).
      void navigator.clipboard?.writeText('').catch(() => undefined);
      setHiddenReason('blur');
    };

    const onCopy = (e: Event) => { stop(e); report('copy'); };
    const onContextMenu = (e: Event) => { stop(e); report('contextmenu'); };
    const onBeforePrint = () => { report('print'); setHiddenReason('blur'); };

    const onBlur = () => setHiddenReason((r) => r ?? 'blur');
    const onFocus = () => setHiddenReason((r) => (r === 'blur' ? null : r));
    const onVisibility = () => { if (document.hidden) onBlur(); };

    // Yon/pastga biriktirilgan DevTools: oynaning tashqi va ichki o'lchami orasidagi farq
    // sahifa ochilgandagi holatga nisbatan keskin oshadi. Zoom o'zgarsa (devicePixelRatio)
    // boshlang'ich qiymat qayta olinadi — soxta signal bermaslik uchun.
    let baseline = { w: window.outerWidth - window.innerWidth, h: window.outerHeight - window.innerHeight, dpr: window.devicePixelRatio };
    const timer = window.setInterval(() => {
      if (window.devicePixelRatio !== baseline.dpr) {
        baseline = { w: window.outerWidth - window.innerWidth, h: window.outerHeight - window.innerHeight, dpr: window.devicePixelRatio };
        return;
      }
      const open =
        window.outerWidth - window.innerWidth - baseline.w > 160 ||
        window.outerHeight - window.innerHeight - baseline.h > 160;
      if (open) report('devtools');
      setHiddenReason((r) => (open ? 'devtools' : r === 'devtools' ? null : r));
    }, 1000);

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCopy, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('dragstart', stop, true);
    document.addEventListener('selectstart', stop, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeprint', onBeforePrint);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCopy, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('dragstart', stop, true);
      document.removeEventListener('selectstart', stop, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeprint', onBeforePrint);
    };
  }, [enforce]);

  return (
    <div className={enforce ? 'select-none' : undefined} style={enforce ? { WebkitTouchCallout: 'none' } : undefined}>
      {enforce && (
        <style>{'@media print { body > * { display: none !important; } body::after { content: "Chop etish taqiqlangan"; display: block; padding: 40px; font-size: 20px; } }'}</style>
      )}

      {hiddenReason ? (
        <button
          type="button"
          onClick={() => setHiddenReason((r) => (r === 'blur' ? null : r))}
          className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#0a0e1a] px-6 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <FiEyeOff className="h-6 w-6" />
          </span>
          <span className="text-lg font-semibold text-white">Kontent yashirildi</span>
          <span className="max-w-md text-sm text-slate-400">
            {hiddenReason === 'devtools'
              ? "Dasturchi vositalari (DevTools) ochiq. Ularni yoping — kontent qaytadi. Bu harakat jurnalga yozildi."
              : 'Oyna fokusda emas. Davom etish uchun shu yerni bosing.'}
          </span>
        </button>
      ) : (
        children
      )}

      <Watermark viewer={viewer} />
    </div>
  );
}

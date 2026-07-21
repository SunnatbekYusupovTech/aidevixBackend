'use client';

import { useEffect, useState } from 'react';
import { IoNotifications } from 'react-icons/io5';
import { useAuth } from '@hooks/useAuth';
import { pushApi } from '@api/pushApi';

/**
 * PushOptIn — "Bildirishnomalarni yoqish" tugmasi.
 * - Faqat auth qilingan user'ga ko'rinadi.
 * - Push qo'llab-quvvatlanmasa yoki allaqachon obuna bo'lsa — yashiriladi.
 * - VAPID public key backend'dan olinadi (NEXT_PUBLIC_VAPID_PUBLIC_KEY fallback bilan).
 */

// base64url VAPID kalitni Uint8Array'ga aylantirish (applicationServerKey uchun)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export default function PushOptIn() {
  const { isLoggedIn } = useAuth();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    if (Notification.permission === 'denied') return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Ruxsat berilmadi');
        setBusy(false);
        return;
      }

      // VAPID public key — avval backend, keyin env fallback
      let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      try {
        const { data } = await pushApi.getVapidKey();
        if (data?.data?.publicKey) vapidKey = data.data.publicKey;
      } catch {
        // env fallback ishlatiladi
      }

      if (!vapidKey) {
        setError('Bildirishnoma sozlanmagan');
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      await pushApi.subscribe({
        endpoint: json.endpoint as string,
        keys: {
          p256dh: json.keys?.p256dh as string,
          auth: json.keys?.auth as string,
        },
      });

      setSubscribed(true);
    } catch (err) {
      setError('Xatolik yuz berdi');
    } finally {
      setBusy(false);
    }
  };

  if (!isLoggedIn || !supported || subscribed) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
      >
        <IoNotifications className="text-base" />
        {busy ? 'Yoqilmoqda...' : '🔔 Bildirishnomalarni yoqish'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

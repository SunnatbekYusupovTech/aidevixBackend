import { Suspense } from 'react';
import { Metadata } from 'next';

// Auth oqimi sahifalari (2FA, telegram-login, email verify) — indekslanmaydi.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-indigo-500" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

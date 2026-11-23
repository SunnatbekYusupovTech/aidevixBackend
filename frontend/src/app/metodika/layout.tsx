import type { Metadata } from 'next';

// Maxfiy bo'lim: qidiruv tizimlari va AI botlar indekslamasin, keshlamasin.
export const metadata: Metadata = {
  title: 'Metodika',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  referrer: 'no-referrer',
};

export default function MetodikaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

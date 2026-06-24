import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Referal dasturi',
  description: 'Do\'stlaringizni Aidevix\'ga taklif qiling — har ikkalangiz ham bonus XP va imtiyozlar oling. Referal dasturi shartlari va havola.',
  alternates: { canonical: '/referral' },
  openGraph: {
    title: 'Referal dasturi — Aidevix',
    description: 'Do\'st taklif qiling, bonus XP oling.',
  },
};

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

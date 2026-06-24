import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Foydalanish shartlari',
  description: 'Aidevix platformasidan foydalanish shartlari va qoidalari.',
  alternates: { canonical: '/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

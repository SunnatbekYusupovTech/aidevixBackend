import { Metadata } from 'next';
import { Suspense } from 'react';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Aloqa',
  description: 'Aidevix bilan bog\'lanish — savol, taklif, hamkorlik. Bizga yozing, biz javob beramiz.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Aidevix — Aloqa',
    description: 'Savol, taklif yoki hamkorlik uchun yozing.',
  },
};

export default function ContactPage() {
  // ContactClient useSearchParams() ishlatadi — Suspense boundary bo'lmasa statik
  // prerender butun sahifani CSR'ga bailout qiladi (bo'sh HTML → SEO zarari).
  return (
    <Suspense fallback={null}>
      <ContactClient />
    </Suspense>
  );
}

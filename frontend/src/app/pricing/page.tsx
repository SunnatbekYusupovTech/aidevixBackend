import { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Tariflar va Narxlar',
  description: 'Aidevix Pro obunalari: barcha kurslar, AI Coach, sertifikatlar va shaxsiy AI review imkoniyatlari.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Aidevix Pro — Tariflar',
    description: 'Sizga mos paketni tanlang. 14 kun bepul sinov, istalgan vaqtda bekor qiling.',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}

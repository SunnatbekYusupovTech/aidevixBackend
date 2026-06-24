import { Metadata } from 'next';
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
  return <ContactClient />;
}

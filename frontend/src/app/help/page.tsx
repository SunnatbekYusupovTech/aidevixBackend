import { Metadata } from 'next';
import HelpClient from './HelpClient';

export const metadata: Metadata = {
  title: 'Yordam markazi',
  description: 'Aidevix yordam markazi: tez-tez beriladigan savollar, yo\'riqnomalar va kontaktlar.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Aidevix Yordam markazi',
    description: 'Savolingiz bormi? Tez javobingizni shu yerdan topasiz.',
  },
};

export default function HelpPage() {
  return <HelpClient />;
}

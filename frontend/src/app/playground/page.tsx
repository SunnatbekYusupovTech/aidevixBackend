import { Metadata } from 'next';
import PlaygroundClient from './PlaygroundClient';

export const metadata: Metadata = {
  title: 'AI Code Playground',
  description: 'Kod yozing, AI Coach real-time tahlil bersin. JavaScript, TypeScript, Python va boshqalar.',
  alternates: { canonical: 'https://aidevix.uz/playground' },
  openGraph: {
    title: 'AI Code Playground — Aidevix',
    description: 'Real-time AI kod tahlili — Aidevix',
    url: 'https://aidevix.uz/playground',
    images: [{ url: 'https://aidevix.uz/og-image.png', width: 1200, height: 630, alt: 'Aidevix AI Code Playground' }],
  },
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}

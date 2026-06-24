import { Metadata } from 'next';
import PlaygroundClient from './PlaygroundClient';

export const metadata: Metadata = {
  title: 'AI Code Playground',
  description: 'Kod yozing, AI Coach real-time tahlil bersin. JavaScript, TypeScript, Python va boshqalar.',
  alternates: { canonical: '/playground' },
  openGraph: {
    title: 'AI Code Playground — Aidevix',
    description: 'Real-time AI kod tahlili — Aidevix',
  },
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}

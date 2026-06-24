import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati',
  description: 'Aidevix maxfiylik siyosati — shaxsiy ma\'lumotlaringizni qanday yig\'amiz, saqlaymiz va himoya qilamiz.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

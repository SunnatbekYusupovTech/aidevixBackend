import { Metadata } from 'next';

// Sozlamalar — shaxsiy sahifa, indekslanmaydi.
export const metadata: Metadata = {
  title: 'Sozlamalar',
  robots: { index: false, follow: true },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

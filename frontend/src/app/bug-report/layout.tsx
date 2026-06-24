import { Metadata } from 'next';

// Auth/private utility sahifa — indeksatsiyaga yaroqsiz (kontent emas).
// noindex + follow: havolalar kuzatiladi, lekin sahifa qidiruvga chiqmaydi.
export const metadata: Metadata = {
  title: "Xato haqida xabar",
  robots: { index: false, follow: true },
};

export default function BugReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { Metadata } from 'next';

// Auth/private utility sahifa — indeksatsiyaga yaroqsiz (kontent emas).
// noindex + follow: havolalar kuzatiladi, lekin sahifa qidiruvga chiqmaydi.
export const metadata: Metadata = {
  title: "Parolni tiklash",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

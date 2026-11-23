import MetodikaClient from './MetodikaClient';

// Kontent serverda render QILINMAYDI: sahifa HTML'ida metodika matni yo'q,
// u faqat ruxsat tekshirilgandan keyin brauzerda API'dan olinadi.
export default function MetodikaPage() {
  return <MetodikaClient />;
}

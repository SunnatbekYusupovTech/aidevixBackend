import type { ReactNode } from 'react';
import {
  FiBook,
  FiHome,
  FiSettings,
  FiUsers,
  FiDollarSign,
  FiTool,
  FiTag,
  FiList,
  FiZap,
  FiAlertTriangle,
  FiAward,
} from 'react-icons/fi';

export type AdminNavItem = {
  href: string;
  label: string;
  hint: string;
  icon: ReactNode;
};

export type AdminNavSection = { title: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavSection[] = [
  {
    title: 'Boshqaruv',
    items: [
      {
        href: '/admin',
        label: 'Umumiy panel',
        hint: "Statistika, grafiklar, tezkor ko'rinish",
        icon: <FiHome className="h-5 w-5" />,
      },
      {
        href: '/admin/courses',
        label: 'Kurslar',
        hint: 'Kurs CRUD, narx, chop etish',
        icon: <FiBook className="h-5 w-5" />,
      },
      {
        href: '/admin/users',
        label: 'Foydalanuvchilar',
        hint: 'Rol, faollik, batafsil profil',
        icon: <FiUsers className="h-5 w-5" />,
      },
      {
        href: '/admin/payments',
        label: "To'lovlar",
        hint: "So'nggi tranzaksiyalar, CSV eksport",
        icon: <FiDollarSign className="h-5 w-5" />,
      },
      {
        href: '/admin/enrollments',
        label: 'Yozilmalar',
        hint: "Barcha kurs yozilmalari, progress, filter",
        icon: <FiList className="h-5 w-5" />,
      },
      {
        href: '/admin/promos',
        label: 'Promo kodlar',
        hint: 'Chegirma kodlari CRUD, foiz/fixed',
        icon: <FiTag className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Kontent va vositalar',
    items: [
      {
        href: '/admin/prompts',
        label: 'Promptlar',
        hint: 'Moderatsiya: feature, yashirish, o\'chirish',
        icon: <FiZap className="h-5 w-5" />,
      },
      {
        href: '/admin/challenges',
        label: 'Kunlik vazifalar',
        hint: 'CRUD, faollik, XP miqdori',
        icon: <FiAward className="h-5 w-5" />,
      },
      {
        href: '/admin/bug-reports',
        label: 'Bug xabarlar',
        hint: 'Tasdiqlash, XP berish, rad etish',
        icon: <FiAlertTriangle className="h-5 w-5" />,
      },
      {
        href: '/admin/tools',
        label: 'Vositalar',
        hint: 'Telegram, Bunny bulk, AI news',
        icon: <FiTool className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Tizim',
    items: [
      {
        href: '/admin/settings',
        label: 'Sozlamalar va hujjatlar',
        hint: "API, Swagger, yo'riqnoma",
        icon: <FiSettings className="h-5 w-5" />,
      },
    ],
  },
];

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Prompt Library — Claude, Cursor, Copilot',
  description:
    "Claude Code, Cursor, GitHub Copilot, ChatGPT, Gemini, Windsurf uchun professional promptlar. Coding, debugging, architecture, refactoring, testing.",
  alternates: {
    canonical: 'https://aidevix.uz/prompts',
    languages: {
      'uz-UZ': 'https://aidevix.uz/prompts',
      'ru-RU': 'https://aidevix.uz/prompts',
      'en-US': 'https://aidevix.uz/prompts',
      'x-default': 'https://aidevix.uz/prompts',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://aidevix.uz/prompts',
    title: 'AI Prompt Library | Aidevix',
    description:
      "O'zbek developerlar uchun sinab ko'rilgan AI promptlar: Claude, Cursor, Copilot, ChatGPT.",
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix Prompts' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Prompt Library | Aidevix',
    description: 'Eng yaxshi promptlar bir joyda — like, copy, share.',
    images: ['https://aidevix.uz/Logo.jpg'],
  },
};

export default function PromptsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

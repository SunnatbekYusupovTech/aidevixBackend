import React from 'react';
import { Metadata } from 'next';
import BattleClient from './BattleClient';

export const metadata: Metadata = {
  title: 'Code Battle — yuzma-yuz dasturlash bellashuvi',
  description: "Boshqa dasturchilar bilan yuzma-yuz kod yozish bo'yicha bellashing. Eng tezkor dasturchiga +30 XP.",
  alternates: { canonical: 'https://aidevix.uz/battle' },
  // Sahifa faqat tizimga kirganlarga kontent ko'rsatadi — crawler "iltimos, kiring"
  // matnini ko'radi (thin content). follow — ichki linklar baribir o'tadi.
  robots: { index: false, follow: true },
};

export default function BattlePage() {
  return <BattleClient />;
}

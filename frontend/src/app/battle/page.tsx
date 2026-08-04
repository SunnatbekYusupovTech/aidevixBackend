import React from 'react';
import { Metadata } from 'next';
import BattleClient from './BattleClient';

export const metadata: Metadata = {
  title: 'Code Battle - Yuzma-yuz dasturlash | Aidevix',
  description: 'Boshqa dasturchilar bilan yuzma-yuz kod yozish bo\'yicha bellashing. Eng tezkor dasturchiga +30 XP.',
};

export default function BattlePage() {
  return <BattleClient />;
}

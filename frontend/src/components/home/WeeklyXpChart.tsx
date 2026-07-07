'use client';

// Recharts'ni alohida chunk'ga ajratish uchun mustaqil komponent.
// HomeClient buni `next/dynamic` (ssr:false) bilan yuklaydi — shu sabab
// recharts (+ d3 bog'liqliklari) bosh sahifaning boshlang'ich JS bundle'iga
// tushmaydi va faqat chart ko'rinadigan paytda yuklanadi. ssr:false +
// client-side mount layout o'lchamlari tayyor bo'lgach render qiladi, shuning
// uchun recharts'ning `width(-1)/height(-1)` ogohlantirishi ham yo'qoladi.

import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type XpPoint = { day: string; xp: number };

export default function WeeklyXpChart({ data }: { data: XpPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={128}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6f7f90" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6f7f90" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis
          dataKey="day"
          stroke="rgba(255,255,255,0.25)"
          fontSize={9}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.25)"
          fontSize={9}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload }: any) => {
            if (active && payload && payload.length) {
              return (
                <div className="p-2.5 rounded-none border border-slate-800 backdrop-blur-xl text-xs font-mono font-semibold shadow-xl z-[90] bg-slate-950/95 text-white">
                  <p className="opacity-60">{payload[0].payload.day}</p>
                  <p className="text-platinum-400 mt-0.5">{payload[0].value} XP</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="xp"
          stroke="#a9b3bc"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#xpGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

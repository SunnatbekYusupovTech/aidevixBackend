'use client';

import { useState, useEffect, useRef } from 'react';
import { IoFlash, IoStar, IoCheckmarkCircle } from 'react-icons/io5';
import { gsap } from 'gsap';
import axiosInstance from '@/api/axiosInstance';

const TYPE_STYLE: Record<string, { icon: JSX.Element; color: string }> = {
  enrollment: { icon: <IoCheckmarkCircle className="text-emerald-400" />, color: 'from-emerald-400/20' },
  prompt: { icon: <IoFlash className="text-blue-400" />, color: 'from-blue-400/20' },
  default: { icon: <IoStar className="text-yellow-400" />, color: 'from-yellow-400/20' },
};

export default function LiveActivityTicker({ visible = true }: { visible?: boolean }) {
  const [index, setIndex] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axiosInstance
      .get('public/live-activity')
      .then(({ data }) => setActivities(data?.data?.activities || []))
      .catch(() => setActivities([]));
  }, []);

  useEffect(() => {
    if (!activities.length) return;
    const timer = setInterval(() => {
      if (!itemRef.current) return;

      gsap.to(itemRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.35,
        onComplete: () => {
          setIndex((prev) => {
            const nextIndex = (prev + 1) % activities.length;

            if (itemRef.current) {
              gsap.fromTo(itemRef.current,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.35 }
              );
            }

            return nextIndex;
          });
        }
      });
    }, 5000);

    return () => {
      clearInterval(timer);
      if (itemRef.current) {
        gsap.killTweensOf(itemRef.current);
      }
    };
  }, [activities.length]);

  const current = activities[index];
  if (!current || !visible) return null;
  const style = TYPE_STYLE[current.type] || TYPE_STYLE.default;

  return (
    <div className="hidden md:block fixed top-28 left-1/2 -translate-x-1/2 z-[40] w-fit">
      <div
        ref={itemRef}
        className={`activity-item px-4 py-2 bg-[#111726]/80 backdrop-blur-md border border-white/5 rounded-full flex items-center gap-3 shadow-2xl bg-gradient-to-r ${style.color} to-transparent`}
      >
        <div className="flex items-center gap-2">
          {style.icon}
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{current.user}</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-white/20" />
        <span className="text-[10px] text-white/50 font-medium">{current.action}</span>
      </div>
    </div>
  );
}

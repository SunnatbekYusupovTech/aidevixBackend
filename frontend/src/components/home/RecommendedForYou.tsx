'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { courseApi } from '@/api/courseApi';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import CourseCard from '@components/courses/CourseCard';

type Course = { _id: string; title?: string; thumbnail?: string; category?: string };

export default function RecommendedForYou({ limit = 6 }: { limit?: number }) {
  const { isLoggedIn } = useAuth();
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [basedOn, setBasedOn] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    setLoading(true);
    courseApi
      .getForUser(limit)
      .then((res: any) => {
        if (!active) return;
        setCourses(res.data?.data?.courses || []);
        setBasedOn(res.data?.data?.meta?.basedOn || []);
      })
      .catch(() => {
        if (active) setCourses([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn, limit]);

  if (!isLoggedIn || (!loading && courses.length === 0)) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ✨ Siz uchun tavsiya
          </h2>
          {basedOn.length > 0 && (
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              AI stack va tugatgan kurslaringiz asosida
            </p>
          )}
        </div>
        <Link href="/courses" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider">
          Hammasi →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-64 rounded-2xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {courses.map((c) => (
            <CourseCard key={c._id} course={c as any} />
          ))}
        </motion.div>
      )}
    </section>
  );
}

import React from 'react';
import Link from 'next/link';
import { IoChatbubblesOutline, IoCheckmarkCircle, IoTrendingUp, IoFlame } from 'react-icons/io5';
import { SSR_API_BASE_URL } from '@/utils/constants';

async function fetchQuestions(page = 1, sort = 'newest') {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}forum/questions?page=${page}&sort=${sort}`, { next: { revalidate: 60 } });
    if (!res.ok) return { questions: [], total: 0 };
    const data = await res.json();
    return data.data;
  } catch {
    return { questions: [], total: 0 };
  }
}

export default async function ForumPage({ searchParams }: { searchParams: { page?: string, sort?: string } }) {
  const page = Number(searchParams.page) || 1;
  const sort = searchParams.sort || 'newest';
  const { questions, total } = await fetchQuestions(page, sort);

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-200 pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <IoChatbubblesOutline className="text-indigo-400" /> Muhokamalar & Savol-Javob
            </h1>
            <p className="text-slate-400 mt-2">Dasturlashdagi muammolaringizni yozing, jamoa yordam beradi. Yordam berganlar XP va daraja oladi!</p>
          </div>
          <Link href="/forum/new" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25">
            + Savol berish
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
          <Link href="/forum?sort=newest" className={\`font-bold \${sort === 'newest' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}\`}>
            Eng yangilari
          </Link>
          <Link href="/forum?sort=popular" className={\`font-bold flex items-center gap-1 \${sort === 'popular' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}\`}>
            <IoFlame /> Mashhurlari
          </Link>
          <Link href="/forum?sort=unanswered" className={\`font-bold \${sort === 'unanswered' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}\`}>
            Javobsizlar
          </Link>
        </div>

        {/* List */}
        <div className="flex flex-col gap-4">
          {questions?.length > 0 ? (
            questions.map((q: any) => (
              <div key={q._id} className="bg-[#111726] border border-white/5 hover:border-indigo-500/30 transition-all rounded-2xl p-5 flex gap-4 md:gap-6">
                
                {/* Stats */}
                <div className="flex flex-col items-center gap-3 min-w-[60px]">
                  <div className="text-center">
                    <span className="block text-lg font-bold text-white">{q.score || 0}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ovoz</span>
                  </div>
                  <div className={\`text-center px-3 py-1 rounded-lg border \${q.isResolved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : (q.answersCount > 0 ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'border-transparent text-slate-500')}\`}>
                    <span className="block text-lg font-bold">{q.answersCount || 0}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold">Javob</span>
                  </div>
                  <div className="text-center text-slate-500 text-xs">
                    {q.views} ko'rilish
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link href={\`/forum/\${q._id}\`}>
                      <h2 className="text-lg font-bold text-indigo-100 hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                        {q.title}
                      </h2>
                    </Link>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {q.tags?.map((tag: string) => (
                        <span key={tag} className="bg-white/5 border border-white/10 text-xs px-2 py-1 rounded-md text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end items-center mt-4">
                    <div className="flex items-center gap-2">
                      <img src={q.author?.avatar || \`https://ui-avatars.com/api/?name=\${q.author?.username}&background=2d3748&color=fff\`} alt="avatar" className="w-6 h-6 rounded-full" />
                      <Link href={\`/u/\${q.author?.username}\`} className="text-xs text-indigo-400 font-medium hover:underline">
                        {q.author?.username}
                      </Link>
                      <span className="text-xs text-slate-500">• {new Date(q.createdAt).toLocaleDateString('uz-UZ')}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-[#111726] rounded-2xl border border-white/5">
              <p className="text-slate-400">Hozircha savollar yo'q. Birinchi bo'lib savol bering!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

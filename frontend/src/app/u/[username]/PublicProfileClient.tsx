'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  IoTrophy, IoFlame, IoCheckmarkCircle, IoShareSocial, IoArrowBack,
  IoRibbon, IoSparkles, IoPeople, IoSchool,
} from 'react-icons/io5';
import { useTheme } from '@/context/ThemeContext';

const AI_ICONS: Record<string, string> = {
  'Claude Code': '🤖', 'Cursor': '⚡', 'GitHub Copilot': '🐙',
  'ChatGPT': '💬', 'Gemini': '✨', 'Windsurf': '🌊',
  'Devin': '🦾', 'Replit AI': '🔁', 'Codeium': '🔮', 'Other': '🛠️',
};

const RANK_COLORS: Record<string, string> = {
  GRANDMASTER: 'text-red-400', 'VICE-ADMIRAL': 'text-purple-400',
  COMMANDER: 'text-blue-400', CAPTAIN: 'text-cyan-400',
  LIEUTENANT: 'text-emerald-400', SERGEANT: 'text-yellow-400',
  CORPORAL: 'text-orange-400', RECRUIT: 'text-slate-400',
};

export default function PublicProfileClient({ profile }: { profile: any }) {
  const { isDark } = useTheme();
  const { user, stats, ranking, social, achievements } = profile;
  const followers = social?.followers ?? 0;
  const following = social?.following ?? 0;
  const certs = achievements?.topCertificates || [];
  const prompts = achievements?.topPrompts || [];
  const completed = achievements?.completedCourses ?? 0;

  const handleShare = () => {
    const url = window.location.href;
    const text = `🎓 ${user.username} — Level ${stats.level}, ${stats.xp.toLocaleString()} XP\nAidevix da ko'ring: ${url}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank');
  };

  const rankColor = RANK_COLORS[ranking.rankTitle] || 'text-slate-400';

  return (
    <div className={`min-h-screen pt-24 pb-20 px-4 ${isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm group">
          <IoArrowBack className="group-hover:-translate-x-1 transition-transform" /> Bosh sahifa
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-8 mb-6 ${isDark ? 'bg-[#111726]/80 border-white/5' : 'bg-white border-slate-200'}`}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden bg-indigo-500/20 flex items-center justify-center text-3xl font-black text-indigo-400">
              {user.avatar
                ? <Image
                    src={user.avatar}
                    alt={user.username}
                    width={96}
                    height={96}
                    sizes="96px"
                    className="w-full h-full object-cover"
                  />
                : user.username?.[0]?.toUpperCase()
              }
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h1 className="text-2xl font-black">{user.username}</h1>
                <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-white/5 ${rankColor}`}>
                  {ranking.rankTitle}
                </span>
              </div>
              {(user.firstName || user.lastName) && (
                <p className="text-slate-400 text-sm">{user.firstName} {user.lastName}</p>
              )}
              {user.jobTitle && <p className="text-indigo-400 text-sm font-medium mt-1">{user.jobTitle}</p>}
              {stats.bio && <p className="text-slate-400 text-sm mt-3 max-w-md leading-relaxed">{stats.bio}</p>}

              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-colors"
                >
                  <IoShareSocial /> Telegram orqali ulashish
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6`}
        >
          {[
            { icon: <IoTrophy className="text-yellow-400" />, label: 'XP', value: stats.xp.toLocaleString() },
            { icon: <span className="text-indigo-400 font-black">Lv</span>, label: 'Level', value: stats.level },
            { icon: <IoFlame className="text-orange-400" />, label: 'Streak', value: `${stats.streak} kun` },
            { icon: <IoCheckmarkCircle className="text-emerald-400" />, label: 'Ranking', value: `#${ranking.rank}` },
            { icon: <IoRibbon className="text-cyan-400" />, label: 'Sertifikat', value: achievements?.certificatesCount ?? 0 },
            { icon: <IoSchool className="text-emerald-400" />, label: 'Tugatgan', value: completed },
            { icon: <IoSparkles className="text-pink-400" />, label: 'Prompt', value: achievements?.promptsCount ?? 0 },
            { icon: <IoPeople className="text-indigo-400" />, label: 'Follower', value: followers },
          ].map((stat, i) => (
            <div key={i} className={`rounded-2xl border p-5 text-center ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}>
              <div className="text-2xl mb-1 flex justify-center">{stat.icon}</div>
              <div className="text-xl font-black">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Badges */}
        {stats.badges?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-3xl border p-6 mb-6 ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-5">Yutuqlar</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {stats.badges.map((badge: any, i: number) => (
                <div key={i} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${isDark ? 'bg-white/3 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-3xl">{badge.icon || '🏆'}</span>
                  <span className="text-[10px] font-bold text-center leading-tight text-slate-400">{badge.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Stack */}
        {user.aiStack?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-3xl border p-6 mb-6 ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-5">AI Stack</h2>
            <div className="flex flex-wrap gap-2">
              {user.aiStack.map((tool: string) => (
                <span key={tool} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold">
                  <span>{AI_ICONS[tool] || '🛠️'}</span> {tool}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills */}
        {stats.skills?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={`rounded-3xl border p-6 ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-5">Ko'nikmalar</h2>
            <div className="flex flex-wrap gap-2">
              {stats.skills.map((skill: string) => (
                <span key={skill} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wide">
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Certificates */}
        {certs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`rounded-3xl border p-6 mb-6 ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Sertifikatlar</h2>
              {achievements.certificatesCount > certs.length && (
                <span className="text-xs text-slate-500">+{achievements.certificatesCount - certs.length} ko'proq</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {certs.map((c: any) => (
                <div
                  key={c.certificateCode}
                  className={`rounded-2xl p-4 border ${isDark ? 'bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}
                >
                  <IoRibbon className="text-cyan-400 text-2xl mb-2" />
                  <div className="text-sm font-bold line-clamp-2">{c.courseName}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-2 uppercase">{c.certificateCode}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Prompts */}
        {prompts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className={`rounded-3xl border p-6 mb-6 ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-5">Eng yaxshi promptlar</h2>
            <div className="space-y-2">
              {prompts.map((p: any) => (
                <Link
                  key={p._id}
                  href={`/prompts?focus=${p._id}`}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/3 border-white/5 hover:border-pink-400/40' : 'bg-slate-50 border-slate-200 hover:border-pink-400/60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">
                      {p.tool} · {p.category}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-pink-400 font-bold">♥ {p.likesCount || 0}</div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Social */}
        <div className={`rounded-3xl border p-5 mb-6 flex items-center justify-around ${isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="text-center">
            <div className="text-2xl font-black text-indigo-400">{followers}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Follower</div>
          </div>
          <div className="w-px h-10 bg-white/5" />
          <div className="text-center">
            <div className="text-2xl font-black text-cyan-400">{following}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Following</div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          A'zo bo'lgan: {new Date(user.joinedAt).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })} •{' '}
          <Link href="/register" className="text-indigo-400 hover:underline">Siz ham qo'shiling!</Link>
        </p>
      </div>
    </div>
  );
}

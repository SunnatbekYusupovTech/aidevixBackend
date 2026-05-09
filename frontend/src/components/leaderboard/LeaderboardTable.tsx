// LeaderboardTable.jsx — SUHROB
import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { FaFire, FaMedal } from 'react-icons/fa'
import { HiTrophy } from 'react-icons/hi2'
import { useLang } from '@/context/LangContext'

const LEVEL_KEYS = [50, 40, 35, 30, 25, 20, 15, 10, 5, 1] as const

const getLevelName = (lvl: number, t: (k: string) => string) => {
  const found = LEVEL_KEYS.find((k) => lvl >= k) ?? 1
  return t(`lb.level.${found}`) || t('lb.level.1')
}

const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

const TOOL_ICONS: Record<string, string> = {
  'Claude Code': '🤖', 'Cursor': '⚡', 'GitHub Copilot': '🐙',
  'ChatGPT': '💬', 'Gemini': '✨', 'Windsurf': '🌊',
  'Devin': '🦾', 'Replit AI': '🔁', 'Codeium': '🔮', 'Other': '🛠️',
}

interface RowProps {
  user: any
  index: number
  isMe: boolean
  username: string
  lvlName: string
  youLabel: string
}

// Faqat birinchi 8 qatorda animatsiya — qolganlarida re-render storm va paint kostini kamaytirish.
const ANIMATE_LIMIT = 8

const DesktopRow = memo(function DesktopRow({ user: u, index, isMe, username, lvlName, youLabel }: RowProps) {
  const animate = index < ANIMATE_LIMIT
  return (
    <motion.div
      initial={animate ? { opacity: 0, x: -16 } : false}
      animate={animate ? { opacity: 1, x: 0 } : { opacity: 1 }}
      transition={animate ? { delay: index * 0.04 } : undefined}
      className={`grid grid-cols-[56px_1fr_72px_110px_72px] gap-2 px-4 py-3 items-center transition-colors
        ${isMe ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-base-300/30'}`}
    >
      <div className="flex items-center justify-center">
        <span className={`font-bold text-sm ${isMe ? 'text-primary' : 'text-base-content/50'}`}>
          #{u.rank}
        </span>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden
          ${isMe ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content'}`}>
          {u.user?.avatar
            ? <Image src={u.user.avatar} alt={username} width={36} height={36} sizes="36px" className="w-full h-full object-cover" />
            : getInitials(username)}
        </div>
        <div className="min-w-0">
          <p className={`font-semibold text-sm truncate ${isMe ? 'text-primary' : ''}`}>
            {username}
            {isMe && <span className="text-xs text-primary/60 ml-1">({youLabel})</span>}
          </p>
          <p className="text-xs text-base-content/40 truncate">{lvlName}</p>
        </div>
      </div>

      <div className="text-center">
        <span className="badge badge-sm badge-ghost font-semibold">{u.level ?? 1}</span>
      </div>

      <div className="text-center">
        <span className="font-bold text-sm text-primary">{(u.xp || 0).toLocaleString()}</span>
        <span className="text-xs text-base-content/40 ml-0.5">XP</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-1">
          {u.streak > 0 && <FaFire className="text-orange-400 text-sm" />}
          {u.badges?.length > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-400 text-sm">
              <HiTrophy />
              <span className="text-xs text-base-content/50">{u.badges.length}</span>
            </span>
          )}
          {!u.streak && !u.badges?.length && <FaMedal className="text-base-content/20 text-sm" />}
        </div>
        {u.aiStack?.length > 0 && (
          <div className="flex gap-0.5 flex-wrap justify-center" title={u.aiStack.join(', ')}>
            {u.aiStack.slice(0, 3).map((tool: string) => (
              <span key={tool} className="text-[10px]">{TOOL_ICONS[tool] || '🔧'}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
})

const MobileRow = memo(function MobileRow({ user: u, index, isMe, username, lvlName }: RowProps) {
  const animate = index < ANIMATE_LIMIT
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={animate ? { opacity: 1, y: 0 } : { opacity: 1 }}
      transition={animate ? { delay: index * 0.03 } : undefined}
      className={`p-3 ${isMe ? 'bg-primary/10' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base-300 text-sm font-bold overflow-hidden">
          {u.user?.avatar
            ? <Image src={u.user.avatar} alt={username} width={36} height={36} sizes="36px" className="h-full w-full object-cover" />
            : getInitials(username)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`truncate text-sm font-semibold ${isMe ? 'text-primary' : ''}`}>{username}</p>
            <span className="text-xs font-bold text-base-content/50">#{u.rank}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-base-content/50">{lvlName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="badge badge-xs badge-ghost">Lvl {u.level ?? 1}</span>
            <span className="text-xs font-bold text-primary">{(u.xp || 0).toLocaleString()} XP</span>
            {u.streak > 0 && <FaFire className="text-xs text-orange-400" />}
            {u.badges?.length > 0 && <span className="text-xs text-yellow-400">🏆 {u.badges.length}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

const LeaderboardTable = ({ users = [], currentUserId, loading }) => {
  const { t } = useLang()
  if (loading) return null

  const youLabel = t('auth.register.refBonus').includes('bonus') ? 'You' : 'Siz'

  return (
    <div className="rounded-xl overflow-hidden border border-base-300 bg-base-200">
      <div className="hidden sm:block">
        <div className="grid grid-cols-[56px_1fr_72px_110px_72px] gap-2 px-4 py-2 text-[11px] text-base-content/40 uppercase tracking-wider border-b border-base-300 bg-base-300/40">
          <span>{t('lb.rank')}</span>
          <span>{t('courses.badge')}</span>
          <span className="text-center">{t('profile.stat.level')}</span>
          <span className="text-center">{t('profile.stat.xp').split(' ')[0]}</span>
          <span className="text-center">Badges</span>
        </div>

        <div className="divide-y divide-base-300/60">
          {users.map((u: any, i: number) => {
            const isMe = u.user?._id === currentUserId
            const username = u.user?.username || u.user?.name || t('auth.register.username')
            const lvlName = getLevelName(u.level || 1, t)
            return (
              <DesktopRow
                key={u.rank ?? u.user?._id ?? i}
                user={u}
                index={i}
                isMe={isMe}
                username={username}
                lvlName={lvlName}
                youLabel={youLabel}
              />
            )
          })}
        </div>
      </div>

      <div className="sm:hidden divide-y divide-base-300/60">
        {users.map((u: any, i: number) => {
          const isMe = u.user?._id === currentUserId
          const username = u.user?.username || u.user?.name || t('auth.register.username')
          const lvlName = getLevelName(u.level || 1, t)
          return (
            <MobileRow
              key={`m-${u.rank ?? u.user?._id ?? i}`}
              user={u}
              index={i}
              isMe={isMe}
              username={username}
              lvlName={lvlName}
              youLabel={youLabel}
            />
          )
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-base-content/40">
          <HiTrophy className="text-4xl mx-auto mb-2 opacity-20" />
          <p className="text-sm">{t('courses.empty')}</p>
        </div>
      )}
    </div>
  )
}

export default LeaderboardTable

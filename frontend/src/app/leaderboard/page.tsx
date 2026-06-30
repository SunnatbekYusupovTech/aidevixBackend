'use client';

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { HiBolt, HiSparkles } from 'react-icons/hi2'
import { FaTrophy, FaCrown, FaAward } from 'react-icons/fa'
import { FiClock } from 'react-icons/fi'
import { ROUTES } from '@utils/constants'

import api from '@api/axiosInstance'
import { useUserStats } from '@hooks/useUserStats'
import { selectUser, selectIsLoggedIn } from '@store/slices/authSlice'
import { useLang } from '@/context/LangContext'
import LeaderboardTable from '@components/leaderboard/LeaderboardTable'
import LevelUpModal from '@components/leaderboard/LevelUpModal'
import { userApi } from '@api/userApi'
import dynamic from 'next/dynamic'

const LeaderboardChart = dynamic(
  () => import('@components/leaderboard/LeaderboardChart'),
  { ssr: false }
)

const TABS = [
  { key:'all',        label:'GLOBAL'     },
  { key:'javascript', label:'JAVASCRIPT' },
  { key:'react',      label:'REACT'      },
  { key:'python',     label:'PYTHON'     },
  { key:'ui/ux',      label:'UI/UX'      },
]

const XP_ENGINE = [
  { label:'Video Darslar', xp:'+50 XP',  color:'text-blue-400',   dot:'bg-blue-500'   },
  { label:'Quizlar',       xp:'+100 XP', color:'text-purple-400', dot:'bg-purple-500' },
  { label:'Amaliy Mashq',  xp:'+150 XP', color:'text-indigo-400', dot:'bg-indigo-500' },
  { label:'Challenge',     xp:'+500 XP', color:'text-orange-400', dot:'bg-orange-500' },
]

const getLevelName = (lvl: number, t: any) => {
  if (!lvl) return t('lb.level.1')
  const keys = [1, 5, 10, 15, 20, 25, 30, 35, 40, 50].sort((a,b)=>b-a)
  const found = keys.find(k=>lvl>=k)
  return found ? t(`lb.level.${found}`) : t('lb.level.1')
}
const getInitials = (name='') =>
  name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)

function PrizeBadgeItem({ badgeText }: { badgeText: string }) {
  if (badgeText.includes('🥇')) {
    return (
      <span className="flex items-center gap-1.5 text-[#ffba08] font-bold text-xs">
        <FaCrown className="text-[#ffba08] drop-shadow-[0_0_3px_rgba(255,186,8,0.5)] animate-pulse" />
        <span>{badgeText.replace('🥇', '').trim()}</span>
      </span>
    )
  }
  if (badgeText.includes('🥈')) {
    return (
      <span className="flex items-center gap-1.5 text-[#e85d04] font-bold text-xs">
        <FaAward className="text-[#e85d04]" />
        <span>{badgeText.replace('🥈', '').trim()}</span>
      </span>
    )
  }
  if (badgeText.includes('🥉')) {
    return (
      <span className="flex items-center gap-1.5 text-[#f48c06] font-bold text-xs">
        <FaAward className="text-[#f48c06]" />
        <span>{badgeText.replace('🥉', '').trim()}</span>
      </span>
    )
  }
  return <span className="text-xs text-base-content/85">{badgeText}</span>
}

function PodiumCard({ user, rank }: { user: any, rank: number }) {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  if (!user) return null
  const u = user.user || user
  const fullName = [u?.firstName, u?.lastName].map((s) => s?.trim()).filter(Boolean).join(' ').trim()
  const username = fullName || u?.username || t('auth.register.username')
  const sList: any = {
    1:{ wrap:'order-2 z-10 scale-110', card:'bg-[#370617]/90 border border-[#ffba08]/30', shadow:'0 20px 40px rgba(255,186,8,0.2)', badge:'bg-gradient-to-br from-[#ffba08] to-[#faa307] text-[#010106]', ab:'border-[#ffba08]', sz:'w-[72px] h-[72px]' },
    2:{ wrap:'order-1', card:'bg-[#21040e]/95 border border-[#e85d04]/25', shadow:'0 15px 30px rgba(232,93,4,0.12)', badge:'bg-gradient-to-br from-[#e85d04] to-[#dc2f02] text-[#010106]', ab:'border-[#e85d04]', sz:'w-14 h-14' },
    3:{ wrap:'order-3', card:'bg-[#0b0105]/95 border border-[#f48c06]/25', shadow:'0 15px 30px rgba(244,140,6,0.12)', badge:'bg-gradient-to-br from-[#f48c06] to-[#faa307] text-[#010106]', ab:'border-[#f48c06]', sz:'w-14 h-14' },
  }
  const s = sList[rank] || sList[1]

  return (
    <motion.div
      initial={reduceMotion ? false : {opacity:0,y:60}} animate={{opacity:1,y:0}}
      transition={reduceMotion ? { duration: 0 } : {delay:rank*0.1,type:'spring',stiffness:160,damping:18}}
      className={`${s.wrap} flex-1 min-w-0 max-w-[132px] min-[360px]:max-w-[160px]`}
    >
      <div className={`relative flex flex-col items-center px-2.5 min-[360px]:px-3 pt-5 min-[360px]:pt-6 pb-4 rounded-2xl ${s.card}`} style={{boxShadow:s.shadow}}>
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${s.badge} flex items-center justify-center font-black text-sm shadow-lg`}>
          {rank}
        </div>
        {rank===1 && <FaTrophy className="text-[#ffba08] text-3xl mb-2 drop-shadow-lg" />}
        <div className={`${s.sz} rounded-full border-2 ${s.ab} flex items-center justify-center font-bold text-lg overflow-hidden bg-base-300 flex-shrink-0`}>
          <Image
            src={user.user?.avatar || user.avatar || '/Logo.jpg'}
            alt={username}
            width={96}
            height={96}
            sizes="(max-width: 360px) 64px, 96px"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <p className={`${rank===1?'text-sm min-[360px]:text-base font-black':'text-xs min-[360px]:text-sm font-bold'} mt-2 text-center truncate w-full text-[#fff1ce]`}>{username}</p>
        {rank===1 ? (
          <>
            <span className="mt-1 px-2 py-0.5 rounded bg-[#ffba08]/20 text-[#ffba08] text-[10px] font-black tracking-wider">
              {getLevelName(user.level || 1, t).toUpperCase()}
            </span>
            <p className="text-[#ffba08] font-black text-base mt-2">{(user.xp||0).toLocaleString()} XP</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="flex flex-col items-center"><span className="text-[#fff1ce]/40 text-[9px]">{t('profile.stat.level').toUpperCase()}</span><b className="text-[#fff1ce]">{user.level || 1}</b></span>
              <span className="flex flex-col items-center"><span className="text-[#fff1ce]/40 text-[9px]">{t('lb.xp.quizzes').toUpperCase()}</span><b className="text-[#fff1ce]">{user.quizzesCompleted || 0}</b></span>
              <span className="flex flex-col items-center"><span className="text-[#fff1ce]/40 text-[9px]">{t('general.streak').toUpperCase()}</span><b className="text-[#ffba08]">{user.streak || 0}<HiBolt className="inline-block text-[#ffba08] ml-0.5" /></b></span>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-[#fff1ce]/40 mt-0.5">{getLevelName(user.level||1, t)}</p>
            <p className="text-[#e85d04] font-bold text-sm mt-1">{(user.xp||0).toLocaleString()} XP</p>
            <div className="w-full h-1 bg-[#010106] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#e85d04] rounded-full"
                style={{ width: `${Math.max(5, Math.min(100, user.levelProgress || 0))}%` }}
              />
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default function LeaderboardPage() {
  const reduceMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState('all')
  const [pageNum, setPageNum]     = useState(1)
  const [apiUsers, setApiUsers]   = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [pagination, setPagination] = useState<any>(null)
  const [userPosition, setUserPosition] = useState<any>(null)
  const [weeklyData, setWeeklyData]     = useState<any>(null)
  const [countdown, setCountdown]       = useState('')
  const { t } = useLang();

  const TABS = [
    { key:'all',        label: t('filter.all').toUpperCase() },
    { key:'javascript', label:'JAVASCRIPT' },
    { key:'react',      label:'REACT'      },
    { key:'python',     label:'PYTHON'     },
    { key:'ui/ux',      label:'UI/UX'      },
  ]

  const XP_ENGINE = [
    { label: t('lb.xp.videos'),  xp:'+50 XP',  color:'text-blue-400',   dot:'bg-blue-500',   to: ROUTES.COURSES },
    { label: t('lb.xp.quizzes'), xp:'+100 XP', color:'text-purple-400', dot:'bg-purple-500', to: ROUTES.COURSES },
    { label: t('lb.xp.practice'),xp:'+150 XP', color:'text-indigo-400', dot:'bg-indigo-500', to: ROUTES.COURSES },
    { label: t('lb.challenge'),  xp:'+500 XP', color:'text-orange-400', dot:'bg-orange-500', to: ROUTES.CHALLENGES },
  ]

  const isLoggedIn  = useSelector(selectIsLoggedIn)
  const currentUser = useSelector(selectUser)

  const { xp, level, levelProgress, xpToNextLevel, streak, badges,
          justLeveledUp, newLevel, quizResult, dismissLevelUp } = useUserStats()

  const fetchUsers = async (page=1, replace=true) => {
    setLoading(true)
    try {
      const { data } = await api.get('/ranking/users', {
        params: { page, limit: 20 }
      })
      const list  = data?.data?.users || data?.users || []
      const pages = data?.data?.pagination || data?.pagination || {}
      if (replace) setApiUsers(list)
      else setApiUsers((prev: any) => [...prev, ...list])
      setPagination(pages)
    } catch (e: any) {
      console.error('Ranking API xato:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosition = async () => {
    if (!isLoggedIn || !currentUser?._id) return
    try {
      const { data } = await api.get(`/ranking/users/${currentUser._id}/position`)
      setUserPosition(data?.data?.position || data?.data || null)
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('ranking position:', err?.message || err)
      }
    }
  }

  useEffect(() => {
    fetchUsers(1, true)
    userApi.getWeeklyPrizes()
      .then(({ data }) => setWeeklyData(data?.data))
      .catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('weekly prizes:', err?.message || err)
        }
      })
  }, [])

  useEffect(() => {
    if (!weeklyData?.nextReset) return
    const update = () => {
      const ms = new Date(weeklyData.nextReset).getTime() - Date.now()
      if (ms <= 0) { setCountdown('0k 0s 0d'); return }
      const d = Math.floor(ms / 86400000)
      const h = Math.floor((ms % 86400000) / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      setCountdown(`${d}k ${h}s ${m}d`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [weeklyData?.nextReset])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPosition() }, [isLoggedIn, currentUser?._id])

  const displayUsers = apiUsers
  const podiumUsers  = displayUsers.slice(0, 3)
  const tableUsers   = displayUsers.slice(3)

  const rank       = userPosition?.rank
  const topPercent = userPosition?.percentile
  const nextLevelXP    = xpToNextLevel || 1000
  const currentLevelXP = xp % nextLevelXP
  const progressPct    = levelProgress || Math.round((currentLevelXP/nextLevelXP)*100)

  return (
    <div className="leaderboard-page-container min-h-screen bg-[#03071e]">
      <LevelUpModal
        isOpen={justLeveledUp}
        level={newLevel}
        levelName={getLevelName(newLevel, t)}
        xp={xp}
        quizResult={quizResult}
        onClose={dismissLevelUp}
      />

      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">

        {isLoggedIn && (
          <motion.div
            initial={reduceMotion ? false : {opacity:0,y:-16}} animate={{opacity:1,y:0}}
            className="mb-5 sm:mb-6 w-full overflow-hidden rounded-xl border-none shadow-[0_20px_50px_-15px_rgba(232,93,4,0.12),0_30px_100px_-25px_rgba(3,7,30,0.8)]"
            style={{background:'linear-gradient(135deg,#010106 0%,#370617 50%,#020411 100%)'}}
          >
            {/* Top row: Rank box + rating bar */}
            <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[#370617] border border-[#ffba08]/15 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <span className="text-xl font-black leading-none text-[#ffba08]">{rank??'—'}</span>
                <span className="text-[8px] uppercase text-[#ffc83b]/60">{t('lb.rank')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase text-[#fff1ce]">{t('lb.myRating')}</span>
                  <span className="rounded bg-[#880f39]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#f6aec7]">
                    {getLevelName(level, t).toUpperCase()}
                  </span>
                  {topPercent && <span className="text-[10px] font-semibold text-[#ffba08]">Top {topPercent}%</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{background:'rgba(1,1,6,0.5)'}}>
                    <motion.div
                      initial={{width:0}} animate={{width:`${progressPct}%`}}
                      transition={{duration:1.2,ease:'easeOut'}}
                      className="h-full rounded-full"
                      style={{background:'linear-gradient(90deg,#6a040f,#ffba08)'}}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-[#fff1ce]/40">
                    {currentLevelXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                  </span>
                </div>
              </div>
            </div>
            {/* Bottom row: 3 stats split equally with dividers */}
            <div className="grid grid-cols-3 divide-x divide-[#21040e]/60 border-t border-[#21040e]/60">
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] uppercase text-[#fff1ce]/40">{t('lb.totalXp')}</p>
                <p className="text-sm font-black text-[#e85d04]">{xp.toLocaleString()}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] uppercase text-[#fff1ce]/40">{t('general.streak').toUpperCase()}</p>
                <p className="text-sm font-bold text-[#ffc300] flex items-center justify-center gap-0.5">
                  <HiBolt className="text-[#ffc300] animate-pulse" /> {streak}
                </p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] uppercase text-[#fff1ce]/40">{t('lb.badge').toUpperCase()}</p>
                <p className="text-sm font-bold text-[#ffd60a] flex items-center justify-center gap-0.5">
                  <FaTrophy className="text-[#ffd60a]" /> {badges?.length??0}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.h1 initial={reduceMotion ? false : {opacity:0,y:-12}} animate={{opacity:1,y:0}} className="mb-4 max-w-full text-balance text-xl font-black tracking-tight sm:mb-5 sm:text-2xl md:text-4xl text-[#fff1ce]">
          {t('lb.heroTitle1')} <span className="text-[#e85d04]">{t('lb.heroTitle2')}</span>
        </motion.h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <div className="flex gap-1.5 p-1 rounded-xl bg-[#010106] shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-[#ffba08]/5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveTab(tab.key); setPageNum(1) }}
                      className={`relative shrink-0 px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-colors duration-300 outline-none select-none z-10 ${
                        isActive ? 'text-white' : 'text-base-content/50 hover:text-base-content'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabPill"
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#6a040f] to-[#e85d04] shadow-[0_4px_12px_rgba(232,93,4,0.3)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <div className="flex justify-center items-end gap-2 sm:gap-4 py-6 sm:py-8">
                  {[160,220,160].map((h,i) => (
                    <div key={i} className="skeleton rounded-2xl flex-1 max-w-[160px]" style={{height:h}} />
                  ))}
                </div>
              ) : podiumUsers.length < 3 ? (
                <div className="py-10 text-center text-base-content/50 text-sm">
                  {t('lb.notEnough')}
                </div>
              ) : (
                <motion.div
                  key={activeTab+'-p'}
                  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  className="flex items-end justify-center gap-2 sm:gap-3 py-3 sm:py-4"
                >
                  <PodiumCard user={podiumUsers[1]} rank={2} />
                  <PodiumCard user={podiumUsers[0]} rank={1} />
                  <PodiumCard user={podiumUsers[2]} rank={3} />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
              ) : tableUsers.length === 0 ? (
                <div className="py-8 text-center text-base-content/50 text-sm">
                  {t('lb.noMoreUsers')}
                </div>
              ) : (
                <motion.div key={activeTab+'-t'} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                  {activeTab === 'all' && <LeaderboardChart users={displayUsers} />}
                  <LeaderboardTable users={tableUsers} currentUserId={currentUser?._id} loading={false} />
                </motion.div>
              )}
            </AnimatePresence>

            {pagination && pageNum < Math.min(pagination.totalPages||pagination.pages||1, 10) && (
              <div className="text-center py-4">
                <button
                  onClick={() => { setPageNum(p => p+1); fetchUsers(pageNum+1, false) }}
                  disabled={loading}
                  className="btn btn-outline btn-sm px-4 sm:px-10 gap-2 font-bold tracking-wider"
                >
                  {loading && <span className="loading loading-spinner loading-xs" />}
                  {t('lb.loadMore')}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.2}}
              className="rounded-xl border border-[#ffba08]/10 bg-[#01030b] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ffba08]/10 bg-[#370617]/10">
                <div className="flex items-center gap-2">
                  <HiBolt className="text-[#ffba08] text-lg" />
                  <span className="font-bold text-sm tracking-wide">{t('lb.xpEngine').toUpperCase()}</span>
                </div>
                <HiBolt className="text-[#ffba08]/10 text-2xl" />
              </div>
              <div className="p-3 space-y-1">
                {XP_ENGINE.map(item => (
                  <Link
                    key={item.label}
                    href={item.to}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#370617]/30 border border-transparent hover:border-[#ffba08]/10 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.dot} group-hover:scale-110 transition-transform`} />
                      <span className="text-sm text-base-content/80 group-hover:text-base-content transition-colors">{item.label}</span>
                    </div>
                    <span className={`font-black text-sm ${item.color} group-hover:brightness-110 transition-all`}>{item.xp}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.35}}
              className="rounded-xl border border-[#ffba08]/10 bg-[#01030b] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ffba08]/10 bg-[#370617]/10">
                <div className="flex items-center gap-2">
                  <FaTrophy className="text-[#ffba08] text-base" />
                  <span className="font-bold text-sm tracking-wide">{t('lb.weeklyTournament').toUpperCase()}</span>
                </div>
                {countdown && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#ffba08] bg-[#e85d04]/10 px-2 py-1 rounded-lg">
                    <FiClock className="text-[#ffba08] animate-pulse" />
                    <span>{countdown}</span>
                  </span>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                {(weeklyData?.prizes || []).map((prize: any) => (
                  <div key={prize.rank} className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-300/20">
                    <PrizeBadgeItem badgeText={prize.badge} />
                    <span className="font-black text-sm text-[#e85d04]">+{prize.xp} XP</span>
                  </div>
                ))}
                {!weeklyData?.prizes?.length && (
                  <div className="px-3 py-2 rounded-lg bg-base-300/20 text-sm text-base-content/50">
                    {t('lb.noPrizes')}
                  </div>
                )}
              </div>
              {weeklyData?.leaderboard?.length > 0 && (
                <div className="px-3 pb-3 space-y-2 border-t border-[#001225]/40">
                  <div className="flex items-center gap-1.5 px-3 pt-3">
                    <HiSparkles className="text-yellow-400 animate-pulse text-xs" />
                    <p className="text-[10px] text-[#a5d1ff]/50 font-bold uppercase tracking-widest">{t('lb.weeklyTop')}</p>
                  </div>
                  <div className="space-y-1.5">
                    {weeklyData.leaderboard.slice(0, 3).map((u: any, i: number) => {
                      const rank = i + 1;
                      const full = [u.user?.firstName, u.user?.lastName].map((s) => s?.trim()).filter(Boolean).join(' ').trim()
                      const display = full || u.user?.username || '—'
                      
                      const styles: Record<number, { bg: string, border: string, text: string, shadow: string, iconColor: string, icon: React.ReactNode, avatarBorder: string }> = {
                        1: {
                          bg: 'bg-gradient-to-r from-[#ffba08]/10 to-transparent',
                          border: 'border-l-4 border-l-[#ffba08] border-y-0 border-r-0',
                          text: 'text-white font-bold',
                          shadow: 'shadow-[0_4px_12px_rgba(255,186,8,0.05)]',
                          iconColor: 'text-[#ffba08]',
                          icon: <FaCrown className="w-3 h-3 text-[#ffba08] drop-shadow-[0_0_3px_rgba(255,186,8,0.5)] animate-pulse" />,
                          avatarBorder: 'border-[#ffba08]'
                        },
                        2: {
                          bg: 'bg-gradient-to-r from-[#e85d04]/10 to-transparent',
                          border: 'border-l-4 border-l-[#e85d04] border-y-0 border-r-0',
                          text: 'text-[#fff1ce]/90 font-semibold',
                          shadow: 'shadow-[0_4px_12px_rgba(232,93,4,0.03)]',
                          iconColor: 'text-[#e85d04]',
                          icon: <FaAward className="w-3 h-3 text-[#e85d04]" />,
                          avatarBorder: 'border-[#e85d04]'
                        },
                        3: {
                          bg: 'bg-gradient-to-r from-[#f48c06]/10 to-transparent',
                          border: 'border-l-4 border-l-[#f48c06] border-y-0 border-r-0',
                          text: 'text-[#fff1ce]/85 font-semibold',
                          shadow: 'shadow-[0_4px_12px_rgba(244,140,6,0.03)]',
                          iconColor: 'text-[#f48c06]',
                          icon: <FaAward className="w-3 h-3 text-[#f48c06]" />,
                          avatarBorder: 'border-[#f48c06]'
                        }
                      }
                      
                      const s = styles[rank] || styles[3];
                      
                      return (
                        <motion.div
                          key={u.user?._id || i}
                          whileHover={{ scale: 1.02, x: 2 }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border border-transparent ${s.bg} ${s.border} ${s.shadow} backdrop-blur-sm transition-all duration-300`}
                        >
                          {/* Rank Icon */}
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#010106] border border-[#ffba08]/10">
                            {s.icon}
                          </div>

                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full border-2 ${s.avatarBorder} overflow-hidden bg-[#010106] flex-shrink-0 flex items-center justify-center`}>
                            <Image
                              src={u.user?.avatar || '/Logo.jpg'}
                              alt={display}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs truncate ${s.text}`}>{display}</p>
                            <p className="text-[9px] text-[#fff1ce]/40">Rank #{rank}</p>
                          </div>

                          {/* Weekly XP Badge */}
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`text-[10px] font-black ${s.iconColor} px-2 py-0.5 rounded-lg bg-[#010106] border border-[#ffba08]/5`}>
                              {(u.weeklyXp||0).toLocaleString()} XP
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

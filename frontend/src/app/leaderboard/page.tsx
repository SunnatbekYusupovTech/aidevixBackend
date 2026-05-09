'use client';

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { HiBolt } from 'react-icons/hi2'
import { FaTrophy } from 'react-icons/fa'

import api from '@api/axiosInstance'
import { useUserStats } from '@hooks/useUserStats'
import { selectUser, selectIsLoggedIn } from '@store/slices/authSlice'
import { useLang } from '@/context/LangContext'
import LeaderboardTable from '@components/leaderboard/LeaderboardTable'
import LevelUpModal from '@components/leaderboard/LevelUpModal'
import { userApi } from '@api/userApi'

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

function PodiumCard({ user, rank }: { user: any, rank: number }) {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  if (!user) return null
  const username = user.user?.username || user.username || t('auth.register.username')
  const sList: any = {
    1:{ wrap:'order-2 z-10 scale-110', card:'border-yellow-500/60 bg-[#1c1500]', shadow:'0 0 40px rgba(234,179,8,0.25)', badge:'bg-yellow-500', ab:'border-yellow-500', sz:'w-[72px] h-[72px]' },
    2:{ wrap:'order-1', card:'border-gray-500/30 bg-[#111318]', shadow:'none', badge:'bg-gray-400', ab:'border-gray-400/60', sz:'w-14 h-14' },
    3:{ wrap:'order-3', card:'border-amber-600/30 bg-[#130e00]', shadow:'none', badge:'bg-amber-600', ab:'border-amber-600/50', sz:'w-14 h-14' },
  }
  const s = sList[rank] || sList[1]

  return (
    <motion.div
      initial={reduceMotion ? false : {opacity:0,y:60}} animate={{opacity:1,y:0}}
      transition={reduceMotion ? { duration: 0 } : {delay:rank*0.1,type:'spring',stiffness:160,damping:18}}
      className={`${s.wrap} flex-1 min-w-0 max-w-[132px] min-[360px]:max-w-[160px]`}
    >
      <div className={`relative flex flex-col items-center px-2.5 min-[360px]:px-3 pt-5 min-[360px]:pt-6 pb-4 rounded-2xl border ${s.card}`} style={{boxShadow:s.shadow}}>
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${s.badge} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
          {rank}
        </div>
        {rank===1 && <FaTrophy className="text-yellow-400 text-3xl mb-2 drop-shadow-lg" />}
        <div className={`${s.sz} rounded-full border-2 ${s.ab} flex items-center justify-center font-bold text-lg overflow-hidden bg-base-300 flex-shrink-0`}>
          {user.user?.avatar || user.avatar
            ? <Image
                src={user.user?.avatar || user.avatar}
                alt={username}
                width={96}
                height={96}
                sizes="(max-width: 360px) 64px, 96px"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            : <span>{getInitials(username)}</span>}
        </div>
        <p className={`${rank===1?'text-sm min-[360px]:text-base font-black':'text-xs min-[360px]:text-sm font-bold'} mt-2 text-center truncate w-full`}>{username}</p>
        {rank===1 ? (
          <>
            <span className="mt-1 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-black tracking-wider">
              {getLevelName(user.level || 1, t).toUpperCase()}
            </span>
            <p className="text-yellow-400 font-black text-base mt-2">{(user.xp||0).toLocaleString()} XP</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="flex flex-col items-center"><span className="text-white/40 text-[9px]">{t('profile.stat.level').toUpperCase()}</span><b className="text-white">{user.level || 1}</b></span>
              <span className="flex flex-col items-center"><span className="text-white/40 text-[9px]">{t('lb.xp.quizzes').toUpperCase()}</span><b className="text-white">{user.quizzesCompleted || 0}</b></span>
              <span className="flex flex-col items-center"><span className="text-white/40 text-[9px]">{t('general.streak').toUpperCase()}</span><b className="text-orange-400">{user.streak || 0}🔥</b></span>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-base-content/40 mt-0.5">{getLevelName(user.level||1, t)}</p>
            <p className="text-primary font-bold text-sm mt-1">{(user.xp||0).toLocaleString()} XP</p>
            <div className="w-full h-1 bg-base-300 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full"
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
  const [isMounted, setIsMounted]       = useState(false)
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
    { label: t('lb.xp.videos'),  xp:'+50 XP',  color:'text-blue-400',   dot:'bg-blue-500'   },
    { label: t('lb.xp.quizzes'), xp:'+100 XP', color:'text-purple-400', dot:'bg-purple-500' },
    { label: t('lb.xp.practice'),xp:'+150 XP', color:'text-indigo-400', dot:'bg-indigo-500' },
    { label: 'Challenge',        xp:'+500 XP', color:'text-orange-400', dot:'bg-orange-500' },
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
    setIsMounted(true)
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

  useEffect(() => { if (isMounted) fetchPosition() }, [isLoggedIn, currentUser?._id, isMounted])

  if (!isMounted) return <div className="min-h-screen bg-base-100 flex items-center justify-center"><span className="loading loading-spinner loading-lg"></span></div>

  const displayUsers = apiUsers
  const podiumUsers  = displayUsers.slice(0, 3)
  const tableUsers   = displayUsers.slice(3)

  const rank       = userPosition?.rank
  const topPercent = userPosition?.percentile
  const nextLevelXP    = xpToNextLevel || 1000
  const currentLevelXP = xp % nextLevelXP
  const progressPct    = levelProgress || Math.round((currentLevelXP/nextLevelXP)*100)

  return (
    <div className="min-h-screen bg-base-100">
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
            className="mb-5 sm:mb-6 w-full overflow-hidden rounded-xl border border-primary/30"
            style={{background:'linear-gradient(135deg,rgba(99,102,241,0.2) 0%,rgba(139,92,246,0.12) 50%,rgba(15,15,25,0.98) 100%)'}}
          >
            {/* Top row: Rank box + rating bar */}
            <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg"
                style={{background:'rgba(99,102,241,0.3)',border:'1px solid rgba(99,102,241,0.5)'}}>
                <span className="text-xl font-black leading-none text-white">{rank??'—'}</span>
                <span className="text-[8px] uppercase text-indigo-300/60">{t('lb.rank')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase text-white">{t('lb.myRating')}</span>
                  <span className="rounded border border-indigo-500/30 bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                    {getLevelName(level, t).toUpperCase()}
                  </span>
                  {topPercent && <span className="text-[10px] font-semibold text-primary">Top {topPercent}%</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{background:'rgba(255,255,255,0.08)'}}>
                    <motion.div
                      initial={{width:0}} animate={{width:`${progressPct}%`}}
                      transition={{duration:1.2,ease:'easeOut'}}
                      className="h-full rounded-full"
                      style={{background:'linear-gradient(90deg,#6366f1,#ec4899)'}}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-white/40">
                    {currentLevelXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                  </span>
                </div>
              </div>
            </div>
            {/* Bottom row: 3 stats split equally with dividers */}
            <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] uppercase text-white/40">{t('lb.totalXp')}</p>
                <p className="text-sm font-black text-primary">{xp.toLocaleString()}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] uppercase text-white/40">{t('general.streak').toUpperCase()}</p>
                <p className="text-sm font-bold text-orange-400">🔥 {streak}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] uppercase text-white/40">BADGE</p>
                <p className="text-sm font-bold text-yellow-400">🏆 {badges?.length??0}</p>
              </div>
            </div>
          </motion.div>
        )}

            <motion.h1 initial={reduceMotion ? false : {opacity:0,y:-12}} animate={{opacity:1,y:0}} className="mb-4 max-w-full text-balance text-xl font-black tracking-tight sm:mb-5 sm:text-2xl md:text-4xl">
          {t('lb.heroTitle1')} <span className="text-primary">{t('lb.heroTitle2')}</span>
        </motion.h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setPageNum(1) }}
                  className={`btn btn-sm shrink-0 rounded-lg font-bold transition-all ${
                    activeTab===tab.key
                      ? 'btn-primary shadow-lg shadow-primary/30'
                      : 'btn-ghost border border-base-300 text-base-content/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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
              className="rounded-xl border border-base-300 bg-base-200 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                <div className="flex items-center gap-2">
                  <HiBolt className="text-yellow-400 text-lg" />
                  <span className="font-bold text-sm tracking-wide">XP ENGINE</span>
                </div>
                <HiBolt className="text-yellow-400/20 text-2xl" />
              </div>
              <div className="p-3 space-y-1">
                {XP_ENGINE.map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-base-300/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <span className="text-sm text-base-content/80">{item.label}</span>
                    </div>
                    <span className={`font-black text-sm ${item.color}`}>{item.xp}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.35}}
              className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/10">
                <div className="flex items-center gap-2">
                  <FaTrophy className="text-yellow-400 text-base" />
                  <span className="font-bold text-sm tracking-wide">HAFTALIK TURNIR</span>
                </div>
                {countdown && (
                  <span className="text-[10px] font-bold text-yellow-400/70 bg-yellow-500/10 px-2 py-1 rounded-lg">
                    ⏱ {countdown}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                {(weeklyData?.prizes || []).map((prize: any) => (
                  <div key={prize.rank} className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-300/20">
                    <span className="text-sm">{prize.badge}</span>
                    <span className="font-black text-sm text-primary">+{prize.xp} XP</span>
                  </div>
                ))}
                {!weeklyData?.prizes?.length && (
                  <div className="px-3 py-2 rounded-lg bg-base-300/20 text-sm text-base-content/50">
                    Turnir mukofotlari hozircha mavjud emas
                  </div>
                )}
              </div>
              {weeklyData?.leaderboard?.length > 0 && (
                <div className="px-3 pb-3 space-y-1">
                  <p className="text-[10px] text-base-content/30 uppercase tracking-widest px-3 pt-2">Bu hafta top</p>
                  {weeklyData.leaderboard.slice(0, 3).map((u: any, i: number) => (
                    <div key={u.user?._id || i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-black text-base-content/30 w-4">{i+1}</span>
                      <span className="text-sm font-semibold flex-1 truncate">{u.user?.username || '—'}</span>
                      <span className="text-xs font-bold text-yellow-400">{(u.weeklyXp||0).toLocaleString()} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

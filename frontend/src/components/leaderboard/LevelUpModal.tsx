// LevelUpModal.tsx — SUHROB
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { HiSparkles } from 'react-icons/hi2'
import { FaTelegramPlane } from 'react-icons/fa'

interface LevelUpModalProps {
  isOpen: boolean
  level: number
  levelName: string
  xp: number
  quizResult: any
  onClose: () => void
}

const LevelUpModal = ({ isOpen, level, levelName, xp, quizResult, onClose }: LevelUpModalProps) => {
  const [size, setSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 400, h: typeof window !== 'undefined' ? window.innerHeight : 600 })

  useEffect(() => {
    const fn = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const handleShare = () => {
    const text = `Aidevix platformasida ${level}-darajaga yetdim! "${levelName}" unvonini oldim! 🎉`
    window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <Confetti
            width={size.w} height={size.h}
            numberOfPieces={300} gravity={0.1} recycle={false}
            colors={['#ffba08','#faa307','#f48c06','#e85d04','#dc2f02','#6a040f']}
          />

          <motion.div
            initial={{ scale:0.5, y:60, opacity:0 }}
            animate={{ scale:1, y:0, opacity:1 }}
            exit={{ scale:0.8, opacity:0 }}
            transition={{ type:'spring', damping:16, stiffness:260 }}
            className="relative bg-[#0A0E1A] border border-[#ffba08]/20 rounded-3xl p-7 max-w-[340px] w-full mx-4 text-center"
            style={{ boxShadow:'0 0 60px rgba(232,93,4,0.25), 0 0 120px rgba(55,6,23,0.1)' }}
          >
            {/* Floating icons */}
            <div className="absolute top-5 right-5 text-yellow-400 animate-pulse"><HiSparkles size={20} /></div>
            <div className="absolute top-5 left-5 text-[#ffba08] animate-pulse" style={{animationDelay:'0.5s'}}><HiSparkles size={16} /></div>
            <div className="absolute bottom-28 right-5 text-pink-400 animate-pulse" style={{animationDelay:'1s'}}><HiSparkles size={12} /></div>

            {/* Level circle */}
            <div className="flex justify-center mb-4">
              <div
                className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
                style={{
                  background:'linear-gradient(135deg,rgba(232,93,4,0.2),rgba(55,6,23,0.4))',
                  border:'2px solid rgba(232,93,4,0.4)',
                  boxShadow:'0 0 20px rgba(232,93,4,0.25)'
                }}
              >
                <span className="text-[10px] text-[#fff1ce]/70 uppercase tracking-widest">Daraja</span>
                <motion.span
                  initial={{ scale:0 }}
                  animate={{ scale:[0,1.3,1] }}
                  transition={{ delay:0.3, duration:0.6 }}
                  className="text-4xl font-black text-white leading-none"
                >
                  {level}
                </motion.span>
              </div>
            </div>

            {/* Title */}
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
              <h2 className="text-2xl font-black text-white">Tabriklaymiz!</h2>
              <p className="text-white/50 text-sm mt-1">Siz yangi unvonga erishdingiz:</p>
              <p className="text-[#ffba08] font-bold text-base mt-0.5">"{levelName}"</p>
            </motion.div>

            {/* Jami XP block */}
            <motion.div
              initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.65}}
              className="mt-5 rounded-xl p-4 text-left"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#ffba08] text-base">⚡</span>
                  <span className="text-[11px] text-white/40 uppercase tracking-wider">Jami XP</span>
                </div>
                <span className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">
                  +{quizResult?.xpEarned ? Math.round((quizResult.xpEarned/(xp||1))*100) : 5}%
                </span>
              </div>
              <p className="text-3xl font-black text-white mt-1">{(xp||0).toLocaleString()}</p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.75}}
              className="mt-3 grid grid-cols-2 gap-3"
            >
              {/* Sessiya XP */}
              <div className="rounded-xl p-3 text-left" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Sessiya XP</p>
                <p className="text-2xl font-black text-green-400 mt-0.5">+{quizResult?.xpEarned||450}</p>
                <p className="text-[10px] text-green-400/60">+100%</p>
                <div className="w-full h-0.5 bg-white/10 rounded-full mt-2">
                  <div className="h-full bg-green-400 rounded-full w-full" />
                </div>
              </div>

              {/* Vulduzlar */}
              <div className="rounded-xl p-3 text-left" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Yulduzlar</p>
                <p className="text-2xl font-black text-white mt-0.5">{quizResult?.score||50}</p>
                <p className="text-[10px] text-yellow-400/60">+{quizResult?.correctAnswers||2}</p>
                <div className="w-full h-0.5 bg-white/10 rounded-full mt-2">
                  <div className="h-full bg-yellow-400 rounded-full w-3/4" />
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.9}}
              className="text-xs text-white/30 mt-4 leading-relaxed"
            >
              Siz bugungi darslarda ajoyib natija ko'rsatdingiz! O'rganishda davom eting va yangi cho'qqilarni zabt eting.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:1.05}}
              className="flex flex-col gap-3 mt-5"
            >
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-white font-bold text-base transition-opacity hover:opacity-90 animate-pulse"
                style={{background:'linear-gradient(135deg,#e85d04,#6a040f)'}}
              >
                Davom etish →
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 text-white/40 hover:text-blue-400 text-sm transition-colors py-1"
              >
                <FaTelegramPlane /> Ulashish (Telegram)
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LevelUpModal

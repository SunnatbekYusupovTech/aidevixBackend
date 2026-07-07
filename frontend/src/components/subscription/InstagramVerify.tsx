'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { IoLogoInstagram, IoCheckmarkCircle, IoWarning } from 'react-icons/io5'
import toast from 'react-hot-toast'
import { useLang } from '@/context/LangContext'
import { verifyInstagram, fetchSubscriptionStatus } from '@store/slices/subscriptionSlice'

type Phase = 'input' | 'success'

interface InstagramVerifyProps {
  onVerified?: () => void
}

export default function InstagramVerify({ onVerified }: InstagramVerifyProps) {
  const dispatch = useDispatch()
  const { t } = useLang()

  const [phase, setPhase] = useState<Phase>('input')
  const [username, setUsername] = useState('')
  const [savedUsername, setSavedUsername] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const clean = username.trim().replace(/^@/, '')
    if (clean.length < 3) {
      toast.error(t('ig.noUsername'))
      return
    }

    setSubmitting(true)
    try {
      const res = await (dispatch as any)(verifyInstagram({ username: clean })).unwrap()
      if (res?.instagram?.subscribed) {
        setSavedUsername(clean)
        setPhase('success')
        await dispatch(fetchSubscriptionStatus() as any)
        toast.success(t('ig.subConfirmed'))
      } else {
        toast.error(t('ig.failedTitle'))
      }
    } catch {
      toast.error(t('ig.failedTitle'))
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'success') {
    return (
      <div className="rounded-2xl overflow-hidden border border-emerald-500/20 bg-[#111726]">
        <div className="p-6 text-center space-y-3">
          <IoCheckmarkCircle className="text-5xl text-green-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">{t('ig.verified')}</h3>
          <p className="text-slate-400 text-sm">@{savedUsername}</p>
        </div>

        <div className="mx-4 mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-3">
          <IoWarning className="text-amber-400 text-xl shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">{t('ig.warnTitle')}</p>
            <p className="text-amber-200/70 text-xs mt-1">{t('ig.warnDesc')}</p>
          </div>
        </div>

        <div className="px-4 pb-5">
          <button
            onClick={onVerified}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
          >
            {t('ig.nextStep')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-[#161D31] p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
          <IoLogoInstagram className="text-3xl text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">{t('ig.title')}</h3>
        <p className="text-slate-400 text-sm">{t('ig.subtitle')}</p>
      </div>

      <div className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
        <div className="w-7 h-7 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-bold flex items-center justify-center shrink-0">
          1
        </div>
        <p className="text-slate-300 text-sm">
          {t('ig.step1a')} <strong className="text-pink-400">@aidevix</strong> {t('ig.step1b')}
        </p>
      </div>

      <div className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
        <div className="w-7 h-7 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-bold flex items-center justify-center shrink-0">
          2
        </div>
        <p className="text-slate-300 text-sm">{t('ig.step2')}</p>
      </div>

      <div className="space-y-3 pt-1">
        <input
          type="text"
          placeholder={t('ig.placeholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !submitting && handleSubmit()}
          disabled={submitting}
          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors text-sm disabled:opacity-50"
        />

        <button
          onClick={handleSubmit}
          disabled={!username.trim() || submitting}
          className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2"
        >
          <IoLogoInstagram className="text-lg" />
          {submitting ? t('ig.checking') : t('ig.confirmBtn')}
        </button>
      </div>
    </div>
  )
}

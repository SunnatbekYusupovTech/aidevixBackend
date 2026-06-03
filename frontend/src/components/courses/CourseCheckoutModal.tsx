'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IoClose, IoPricetag, IoCheckmarkCircle, IoAlertCircle,
  IoCardOutline, IoSparkles,
} from 'react-icons/io5'
import paymentApi, { type PaymentProvider } from '@api/paymentApi'

type Lang = 'uz' | 'ru' | 'en'

interface AppliedPromo {
  code: string
  type: 'percent' | 'fixed'
  value: number
  description?: string
}

interface CourseLike {
  _id: string
  title: string
  price?: number
}

interface Props {
  open: boolean
  onClose: () => void
  course: CourseLike
  lang?: Lang
}

const T = {
  uz: {
    title: 'Kursni sotib olish', price: 'Narx', promoPh: 'Promo kod', apply: "Qo'llash",
    discount: 'Chegirma', total: 'Jami', provider: "To'lov tizimi", pay: "To'lash",
    paying: 'Yo\'naltirilmoqda…', checking: 'Tekshirilmoqda…', close: 'Yopish',
    promoOk: 'Promo qo\'llandi', promoBad: 'Promo kod yaroqsiz yoki muddati tugagan',
    free: 'Bu kurs bepul', err: 'Xatolik yuz berdi. Qayta urinib ko\'ring.',
    secure: "To'lov Payme/Click orqali xavfsiz amalga oshiriladi",
  },
  ru: {
    title: 'Покупка курса', price: 'Цена', promoPh: 'Промокод', apply: 'Применить',
    discount: 'Скидка', total: 'Итого', provider: 'Платёжная система', pay: 'Оплатить',
    paying: 'Перенаправление…', checking: 'Проверка…', close: 'Закрыть',
    promoOk: 'Промокод применён', promoBad: 'Промокод недействителен или истёк',
    free: 'Этот курс бесплатный', err: 'Произошла ошибка. Попробуйте снова.',
    secure: 'Оплата безопасно через Payme/Click',
  },
  en: {
    title: 'Buy course', price: 'Price', promoPh: 'Promo code', apply: 'Apply',
    discount: 'Discount', total: 'Total', provider: 'Payment method', pay: 'Pay',
    paying: 'Redirecting…', checking: 'Checking…', close: 'Close',
    promoOk: 'Promo applied', promoBad: 'Promo code invalid or expired',
    free: 'This course is free', err: 'Something went wrong. Please try again.',
    secure: 'Payment is processed securely via Payme/Click',
  },
} as const

const fmt = (n: number, lang: Lang) =>
  new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(Math.max(0, Math.round(n))) + " so'm"

export default function CourseCheckoutModal({ open, onClose, course, lang = 'uz' }: Props) {
  const t = T[lang]
  const basePrice = Number(course.price || 0)

  const [promoInput, setPromoInput] = useState('')
  const [applied, setApplied] = useState<AppliedPromo | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [provider, setProvider] = useState<PaymentProvider>('payme')
  const [payLoading, setPayLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalPrice = useMemo(() => {
    if (!applied) return basePrice
    const discounted = applied.type === 'percent'
      ? basePrice - (basePrice * applied.value) / 100
      : basePrice - applied.value
    return Math.max(1, Math.round(discounted))
  }, [applied, basePrice])

  const discountAmount = Math.max(0, basePrice - finalPrice)

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoLoading(true); setPromoError(null); setApplied(null)
    try {
      const res = await paymentApi.validatePromo(code, course._id)
      const d = res.data?.data
      if (d?.code) {
        setApplied({ code: d.code, type: d.type, value: d.value, description: d.description })
      } else {
        setPromoError(t.promoBad)
      }
    } catch {
      setPromoError(t.promoBad)
    } finally {
      setPromoLoading(false)
    }
  }

  const handlePay = async () => {
    setPayLoading(true); setError(null)
    try {
      const res = await paymentApi.initiate({
        courseId: course._id,
        provider,
        promoCode: applied?.code,
      })
      const url = res.data?.data?.paymentUrl
      if (url) {
        window.location.href = url
      } else {
        setError(t.err)
        setPayLoading(false)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t.err)
      setPayLoading(false)
    }
  }

  if (basePrice <= 0) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={payLoading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative w-full max-w-md mx-auto bg-base-200 rounded-2xl border border-base-content/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-content/8 bg-gradient-to-r from-primary/10 to-transparent">
              <h3 className="font-bold text-base flex items-center gap-2">
                <IoCardOutline className="text-primary" /> {t.title}
              </h3>
              <button
                onClick={onClose}
                disabled={payLoading}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label={t.close}
              >
                <IoClose className="text-lg" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Course title */}
              <p className="text-sm text-base-content/70 line-clamp-2 font-medium">{course.title}</p>

              {/* Promo */}
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IoPricetag className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 text-sm" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value); setPromoError(null) }}
                      placeholder={t.promoPh}
                      disabled={payLoading}
                      className="input input-bordered input-sm w-full pl-9 rounded-xl uppercase"
                    />
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || payLoading || !promoInput.trim()}
                    className="btn btn-sm rounded-xl btn-outline btn-primary min-w-[88px]"
                  >
                    {promoLoading ? <span className="loading loading-spinner loading-xs" /> : t.apply}
                  </button>
                </div>
                {applied && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <IoCheckmarkCircle /> {t.promoOk}: <b>{applied.code}</b>
                  </p>
                )}
                {promoError && (
                  <p className="text-xs text-error flex items-center gap-1">
                    <IoAlertCircle /> {promoError}
                  </p>
                )}
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl bg-base-300/50 border border-base-content/5 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-base-content/60">
                  <span>{t.price}</span><span>{fmt(basePrice, lang)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>{t.discount}</span><span>− {fmt(discountAmount, lang)}</span>
                  </div>
                )}
                <div className="border-t border-base-content/10 pt-1.5 flex justify-between font-bold text-base">
                  <span>{t.total}</span>
                  <span className="text-primary">{fmt(finalPrice, lang)}</span>
                </div>
              </div>

              {/* Provider */}
              <div className="space-y-1.5">
                <p className="text-xs text-base-content/40 font-medium">{t.provider}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['payme', 'click'] as PaymentProvider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      disabled={payLoading}
                      className={`btn btn-sm rounded-xl justify-center font-bold capitalize ${
                        provider === p ? 'btn-primary' : 'btn-outline btn-neutral'
                      }`}
                    >
                      {p === 'payme' ? 'Payme' : 'Click'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-error flex items-center gap-1">
                  <IoAlertCircle /> {error}
                </p>
              )}

              {/* Pay */}
              <button
                onClick={handlePay}
                disabled={payLoading}
                className="btn btn-primary btn-block rounded-xl font-bold gap-2"
              >
                {payLoading
                  ? <><span className="loading loading-spinner loading-sm" /> {t.paying}</>
                  : <><IoSparkles /> {t.pay} · {fmt(finalPrice, lang)}</>}
              </button>

              <p className="text-[11px] text-center text-base-content/30 flex items-center justify-center gap-1">
                <IoCheckmarkCircle className="text-emerald-400/60" /> {t.secure}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

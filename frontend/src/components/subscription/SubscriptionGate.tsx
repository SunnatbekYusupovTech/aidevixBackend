import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { IoClose } from 'react-icons/io5'
import toast from 'react-hot-toast'
import { selectInstagramSub, selectTelegramSub } from '@store/slices/subscriptionSlice'
import InstagramVerify from './InstagramVerify'
import TelegramVerify from './TelegramVerify'
import { useLang } from '@/context/LangContext'

interface SubscriptionGateProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  videoId?: string
}

export default function SubscriptionGate({
  isOpen,
  onClose,
  onSuccess,
  videoId
}: SubscriptionGateProps): JSX.Element | null {
  const instagram = useSelector(selectInstagramSub)
  const telegram = useSelector(selectTelegramSub)
  const { t } = useLang()
  const successCalledRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  // Qaysi obuna yo'qligini aniqlash
  const needsInstagram = !instagram?.subscribed
  const needsTelegram = !telegram?.subscribed

  const getInitialStep = (): 'instagram' | 'telegram' => {
    if (needsInstagram) return 'instagram'
    if (needsTelegram) return 'telegram'
    return 'instagram'
  }

  const [currentStep, setCurrentStep] = useState<'instagram' | 'telegram'>(getInitialStep())

  // Step ni obuna o'zgarganda yangilash
  useEffect(() => {
    setCurrentStep(getInitialStep())
  }, [instagram?.subscribed, telegram?.subscribed])

  // Reset success flag when modal opens
  useEffect(() => {
    if (isOpen) successCalledRef.current = false
  }, [isOpen])

  // Agar ikkala obuna ham tasdiqlangan bo'lsa, modal yopiladi (faqat bir marta)
  useEffect(() => {
    if (isOpen && instagram?.subscribed && telegram?.subscribed && onSuccessRef.current && !successCalledRef.current) {
      successCalledRef.current = true
      onSuccessRef.current()
    }
  }, [isOpen, instagram?.subscribed, telegram?.subscribed])

  if (!isOpen) return null
  if (instagram?.subscribed && telegram?.subscribed) return null

  // Faqat kerakli steplarni hisoblash
  const totalSteps = (needsInstagram ? 1 : 0) + (needsTelegram ? 1 : 0)
  const currentStepNumber = currentStep === 'instagram' ? 1 : (needsInstagram ? 2 : 1)
  const handleInstagramVerified = () => {
    if (needsTelegram) {
      toast.success(t('gate.igDone'))
      setCurrentStep('telegram')
    } else {
      toast.success(t('gate.allDone'))
      if (onSuccess && !successCalledRef.current) {
        successCalledRef.current = true
        setTimeout(() => {
          onSuccess()
          if (videoId) window.location.href = `/videos/${videoId}`
        }, 1500)
      }
    }
  }

  const handleTelegramVerified = () => {
    if (!instagram?.subscribed) return // Instagram hali tasdiqlanmagan

    toast.success(t('gate.allDone'))

    if (onSuccess && !successCalledRef.current) {
      successCalledRef.current = true
      setTimeout(() => {
        onSuccess()
        if (videoId) {
          window.location.href = `/videos/${videoId}`
        }
      }, 1500)
    }
  }

  const stepLabel = currentStep === 'instagram'
    ? t('gate.igLabel')
    : t('gate.tgLabel')

  const stepDesc = currentStep === 'instagram'
    ? t('gate.igDesc')
    : t('gate.tgDesc')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <IoClose className="text-lg" />
        </button>

        {/* Progress indicator */}
        <div className="mb-4 flex items-center justify-center gap-2">
          {totalSteps > 1 ? (
            <>
              <div className={`w-3 h-3 rounded-full transition-colors ${
                currentStep === 'instagram' ? 'bg-pink-500' :
                !needsInstagram ? 'bg-green-500' : 'bg-slate-600'
              }`} />
              <div className="w-8 h-0.5 bg-slate-600" />
              <div className={`w-3 h-3 rounded-full transition-colors ${
                currentStep === 'telegram' ? 'bg-blue-500' :
                !needsTelegram ? 'bg-green-500' : 'bg-slate-600'
              }`} />
            </>
          ) : (
            <div className={`w-3 h-3 rounded-full transition-colors ${
              currentStep === 'instagram' ? 'bg-pink-500' : 'bg-blue-500'
            }`} />
          )}
        </div>

        {/* Step indicator */}
        <div className="text-center mb-6">
          <p className="text-lg font-semibold text-white">
            {currentStepNumber}/{totalSteps} - {stepLabel}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            {stepDesc}
          </p>
        </div>

        {/* Component based on current step */}
        {currentStep === 'instagram' ? (
          <InstagramVerify
            onVerified={handleInstagramVerified}
          />
        ) : (
          <TelegramVerify
            onTelegramVerified={handleTelegramVerified}
          />
        )}

      </div>
    </div>
  )
}

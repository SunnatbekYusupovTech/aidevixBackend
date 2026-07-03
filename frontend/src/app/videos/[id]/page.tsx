'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { IoPlay, IoTime, IoEye, IoArrowBack, IoCodeSlash, IoStar, IoDocumentText } from 'react-icons/io5';
import { selectIsLoggedIn } from '@/store/slices/authSlice';
import { selectInstagramSub, selectTelegramSub } from '@/store/slices/subscriptionSlice';
import { useVideos } from '@hooks/useVideos';
import { useSubscription } from '@hooks/useSubscription';
import { useLang } from '@/context/LangContext';
import { formatDuration } from '@utils/formatDuration';
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import { videoApi } from '@/api/videoApi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import VideoComments from '@/components/videos/VideoComments';

const IntegratedPlayground = dynamic(
  () => import('@/components/videos/IntegratedPlayground'),
  { ssr: false, loading: () => <div className="rounded-lg bg-slate-900/40 p-8 text-center text-sm text-slate-400">Playground yuklanmoqda...</div> }
);

export default function VideoPage() {
  const { id }: { id: string } = useParams();
  const router = useRouter();
  const { current: video, videoLink, player, loading, error, fetchById } = useVideos();
  const embedUrl = player && typeof player === 'object' && 'embedUrl' in player ? (player as { embedUrl?: string }).embedUrl : undefined;
  const { t, lang } = useLang();
  const localText = {
    needLoginTitle: lang === 'en' ? 'Sign in required' : lang === 'ru' ? 'Требуется вход' : 'Tizimga kirish talab qilinadi',
    needSubTitle: lang === 'en' ? 'Subscription required' : lang === 'ru' ? 'Требуется подписка' : 'Obuna talab qilinadi',
    needProTitle: lang === 'en' ? 'Pro subscription required' : lang === 'ru' ? 'Требуется Pro подписка' : 'Pro obuna talab qilinadi',
    videoNotReady: lang === 'en' ? 'Video is not ready yet' : lang === 'ru' ? 'Видео пока не готово' : 'Video hali tayyor emas',
    videoNotFound: lang === 'en' ? 'Video not found' : lang === 'ru' ? 'Видео не найдено' : 'Video topilmadi',
    loginDesc: lang === 'en' ? 'Please sign in to watch this video.' : lang === 'ru' ? 'Войдите, чтобы смотреть это видео.' : "Videoni ko'rish uchun avval tizimga kiring.",
    subDesc:
      lang === 'en'
        ? 'Subscribe to our Telegram and Instagram channels to watch this video.'
        : lang === 'ru'
          ? 'Чтобы смотреть это видео, подпишитесь на наши Telegram и Instagram каналы.'
          : "Ushbu videoni ko'rish uchun Telegram va Instagram kanallarimizga obuna bo'ling.",
    proDesc:
      lang === 'en'
        ? 'AI videos are available for Pro users only. Price: 99 000 UZS.'
        : lang === 'ru'
          ? 'AI-видео доступны только для Pro пользователей. Цена: 99 000 сум.'
          : "AI videolar (Cursor, Claude va boshqa agent darslari) faqat Pro foydalanuvchilar uchun ochiq. Narxi: 99 000 so'm.",
    busyDesc:
      lang === 'en'
        ? 'The video is still processing on Bunny.net or has not finished uploading yet. Please try again later.'
        : lang === 'ru'
          ? 'Видео еще обрабатывается в Bunny.net или не завершило загрузку. Попробуйте позже.'
          : "Video Bunny.net da hali qayta ishlanmoqda yoki yuklanmagan. Iltimos, keyinroq qayta urinib ko'ring.",
    notFoundDesc:
      lang === 'en'
        ? 'This video does not exist or has been removed.'
        : lang === 'ru'
          ? 'Такого видео нет или оно было удалено.'
          : "Bunday video mavjud emas yoki o'chirib yuborilgan.",
    loginBtn: lang === 'en' ? 'Sign in' : lang === 'ru' ? 'Войти' : 'Kirish',
    subscribeBtn: lang === 'en' ? 'Subscribe' : lang === 'ru' ? 'Подписаться' : "Obuna bo'lish",
    buyProBtn: lang === 'en' ? 'Buy Pro (99 000 UZS)' : lang === 'ru' ? 'Купить Pro (99 000 сум)' : "Pro sotib olish (99 000 so'm)",
    reloadBtn: lang === 'en' ? 'Reload' : lang === 'ru' ? 'Перезагрузить' : 'Qayta yuklash',
    backToCourses: lang === 'en' ? 'Back to courses' : lang === 'ru' ? 'Назад к курсам' : 'Kurslarga qaytish',
    back: lang === 'en' ? 'Back' : lang === 'ru' ? 'Назад' : 'Orqaga',
    coursePrefix: lang === 'en' ? 'Course:' : lang === 'ru' ? 'Курс:' : 'Kurs:',
    lessonFallback: lang === 'en' ? 'Lesson' : lang === 'ru' ? 'Урок' : 'Dars',
    noDescription:
      lang === 'en'
        ? 'No description has been added for this lesson yet.'
        : lang === 'ru'
          ? 'Описание для этого урока пока не добавлено.'
          : "Ushbu dars haqida hozircha tavsif qo'shilmagan.",
    viewsLabel: lang === 'en' ? 'views' : lang === 'ru' ? 'просмотров' : "marta ko'rilgan",
    loginToWatch: lang === 'en' ? 'Sign in to continue' : lang === 'ru' ? 'Войдите, чтобы продолжить' : 'Tizimga kiring',
    needLoginWatch: lang === 'en' ? 'Please sign in to watch this video.' : lang === 'ru' ? 'Чтобы смотреть видео, войдите в систему.' : "Videoni ko'rish uchun avval tizimga kiring.",
    needSubWatch: lang === 'en' ? 'Subscription required' : lang === 'ru' ? 'Требуется подписка' : 'Obuna talab qilinadi',
    needSubWatchDesc:
      lang === 'en'
        ? 'Subscribe to our Telegram and Instagram channels to access this lesson.'
        : lang === 'ru'
          ? 'Подпишитесь на Telegram и Instagram каналы, чтобы смотреть этот урок.'
          : "Ushbu darsni ko'rish uchun Telegram va Instagram kanallarimizga obuna bo'ling.",
    unlockSub: lang === 'en' ? 'Subscribe to unlock' : lang === 'ru' ? 'Подписаться для доступа' : "Obuna bo'lish",
    tgHosted: lang === 'en' ? 'Video is hosted on Telegram' : lang === 'ru' ? 'Видео размещено в Telegram' : "Video Telegram'da joylashgan",
    tgHostedDesc:
      lang === 'en'
        ? 'Tap the button below and open the lesson through our Telegram link.'
        : lang === 'ru'
          ? 'Нажмите кнопку ниже и откройте урок по нашей Telegram-ссылке.'
          : "Ushbu darsni ko'rish uchun quyidagi tugmani bosing va biz taqdim etgan havola orqali videoga o'ting.",
    watchVideoBtn: lang === 'en' ? 'Watch video' : lang === 'ru' ? 'Смотреть видео' : "Videoni ko'rish",
    processingTitle: lang === 'en' ? 'Video is processing' : lang === 'ru' ? 'Видео обрабатывается' : 'Video tayyorlanmoqda',
    processingDesc: lang === 'en' ? 'The video is still being processed. Please wait a little.' : lang === 'ru' ? 'Видео еще обрабатывается. Пожалуйста, подождите.' : 'Video hali ishlanmoqda. Iltimos, bir oz kuting.',
    refresh: lang === 'en' ? 'Refresh' : lang === 'ru' ? 'Обновить' : 'Yangilash',
    lessonMaterials: lang === 'en' ? 'Lesson materials' : lang === 'ru' ? 'Материалы урока' : 'Dars Materiallari',
    qaTitle: lang === 'en' ? 'Questions & Answers' : lang === 'ru' ? 'Вопросы и ответы' : 'Savol va Javoblar',
    qaPlaceholder: lang === 'en' ? 'Any questions about this lesson?' : lang === 'ru' ? 'Есть вопросы по уроку?' : "Dars bo'yicha savolingiz bormi?",
    send: lang === 'en' ? 'Send' : lang === 'ru' ? 'Отправить' : 'Yuborish',
  };
  useSubscription();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const instagram = useSelector(selectInstagramSub);
  const telegram = useSelector(selectTelegramSub);

  const isSubscribed = !!(isLoggedIn && instagram?.subscribed && telegram?.subscribed);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [question, setQuestion] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1024);
  const wasSubscribedRef = useRef(isSubscribed);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Progress tracking: har 10 soniyada POST /api/videos/{id}/progress
  const watchedSecondsRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // fetchById is recreated each render — stabilise via ref so the effect deps stay correct
  const fetchByIdRef = useRef(fetchById);
  useEffect(() => { fetchByIdRef.current = fetchById; }, [fetchById]);

  useEffect(() => {
    setIsMounted(true);
    if (id) fetchByIdRef.current(id);
  }, [id]);

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Video ko'rilayotganda progress saqlash (faqat login + obuna bo'lsa)
  useEffect(() => {
    const courseId =
      typeof video?.course === 'object' ? video.course?._id : undefined;
    const canWatch = isLoggedIn && isSubscribed && !!embedUrl && !!courseId;
    if (!canWatch || !id || !courseId) return;

    progressTimerRef.current = setInterval(() => {
      watchedSecondsRef.current += 10;
      videoApi.saveProgress(courseId, id, watchedSecondsRef.current).catch(() => {});
    }, 10_000);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [id, isLoggedIn, isSubscribed, embedUrl, video?.course]);

  // Sticky video logic
  useEffect(() => {
    const handleScroll = () => {
      if (!videoContainerRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      const shouldBeSticky = rect.bottom < 0;
      setIsSticky(shouldBeSticky);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Obuna bekor qilinganda avtomatik gate ochish
  useEffect(() => {
    if (wasSubscribedRef.current && !isSubscribed && isLoggedIn) {
      setShowModal(true);
    }
    wasSubscribedRef.current = isSubscribed;
  }, [isSubscribed, isLoggedIn]);

  const handleVideoClick = (e: React.MouseEvent) => {
    if (!isSubscribed) {
      e.preventDefault();
      setShowModal(true);
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    window.location.reload();
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim() || isSubmittingQuestion) return;
    setIsSubmittingQuestion(true);
    try {
      await videoApi.askQuestion(id, { question: question.trim() });
      toast.success(
        lang === 'en' ? 'Question submitted!' :
        lang === 'ru' ? 'Вопрос отправлен!' :
        'Savol yuborildi!'
      );
      setQuestion('');
    } catch {
      toast.error(
        lang === 'en' ? 'Failed to submit question' :
        lang === 'ru' ? 'Не удалось отправить вопрос' :
        "Savol yuborishda xato yuz berdi"
      );
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="loading loading-spinner loading-lg text-primary"
        ></motion.div>
      </div>
    );
  }

  if (error || !video) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    const isAuth = statusCode === 401
    const isSub  = statusCode === 403
    const isPro  = statusCode === 402
    const isBusy = statusCode === 503
    const isNotFound = statusCode === 404

    return (
      <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl mb-6"
        >
          {isAuth ? '🔐' : isSub ? '🔒' : isPro ? '💎' : isBusy ? '⏳' : '😕'}
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-3">
          {isAuth ? localText.needLoginTitle
          : isSub  ? localText.needSubTitle
          : isPro  ? localText.needProTitle
          : isBusy ? localText.videoNotReady
          :          localText.videoNotFound}
        </h2>
        <p className="text-gray-400 mb-8 max-w-sm">
          {isAuth ? localText.loginDesc
          : isSub  ? localText.subDesc
          : isPro  ? localText.proDesc
          : isBusy ? localText.busyDesc
          :          localText.notFoundDesc}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          {isAuth && (
            <Link href="/login" className="btn btn-primary rounded-full px-8">{localText.loginBtn}</Link>
          )}
          {isSub && (
            <Link
              href={`/subscription?returnUrl=/videos/${id}`}
              className="btn btn-primary rounded-full px-8"
            >
              {localText.subscribeBtn}
            </Link>
          )}
          {isPro && (
            <Link
              href="/pricing"
              className="btn btn-primary rounded-full px-8"
            >
              {localText.buyProBtn}
            </Link>
          )}
          {isBusy && (
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary rounded-full px-8"
            >
              {localText.reloadBtn}
            </button>
          )}
          <Link href="/courses" className="btn btn-outline btn-sm rounded-full px-6 text-white border-white/20">{localText.backToCourses}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Orqaga tugma */}
        <motion.button 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => router.back()} 
          className="mb-6 flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white sm:mb-8 sm:text-base group"
        >
          <IoArrowBack className="group-hover:-translate-x-1 transition-transform" />
          <span>{localText.back}</span>
        </motion.button>

        {/* Video Header Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8 rounded-2xl border border-white/5 bg-[#0d1224]/60 p-4 shadow-2xl backdrop-blur-md sm:mb-10 sm:rounded-3xl sm:p-10"
        >
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="badge badge-primary badge-outline px-2 sm:px-3 font-bold text-[10px] uppercase tracking-wider">
              {localText.coursePrefix} {video.course?.title || localText.lessonFallback}
            </span>
          </div>

          <h1 className="mb-3 text-2xl font-black leading-tight tracking-tight text-white sm:mb-4 sm:text-4xl">
            {video.title}
          </h1>

          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-gray-400 sm:mb-8 sm:text-lg">
            {video.description || localText.noDescription}
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-5 sm:pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 text-gray-400">
              <IoTime className="text-indigo-400" />
              <span className="text-sm font-medium">{formatDuration(video.duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <IoEye className="text-indigo-400" />
              <span className="text-sm font-medium">
                {(video.viewCount ?? video.views ?? 0).toLocaleString()} {localText.viewsLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <IoStar className="text-yellow-400" />
              <span className="text-sm font-medium">{video.rating?.average?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        </motion.div>

        {/* Video Player Section */}
        <div ref={videoContainerRef} className="mb-8 sm:mb-10 aspect-video">
          <motion.div 
            layout
            initial={{ scale: 0.95, opacity: 0 }}
            animate={isSticky ? { 
              scale: 1, 
              opacity: 1,
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: viewportWidth < 360 ? 156 : viewportWidth < 640 ? 200 : 320,
              height: viewportWidth < 360 ? 88 : viewportWidth < 640 ? 112 : 180,
              zIndex: 100,
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)'
            } : { 
              scale: 1, 
              opacity: 1,
              position: 'relative',
              width: '100%',
              height: '100%',
              bottom: 'auto',
              right: 'auto',
              zIndex: 1
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`rounded-[2.5rem] overflow-hidden bg-black border border-white/5 shadow-2xl group ${isSticky ? 'pointer-events-auto' : ''}`}
          >
          {!isLoggedIn ? (
            /* Not logged in */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#0d1224] to-[#1a1c2e] px-3 text-center">
              <div className="mb-4 sm:mb-6 flex h-16 w-16 sm:h-24 sm:w-24 rounded-full border border-indigo-500/30 bg-indigo-600/20 items-center justify-center shadow-2xl">
                <div className="flex h-10 w-10 sm:h-16 sm:w-16 rounded-full bg-indigo-500 items-center justify-center text-white shadow-lg shadow-indigo-500/40">
                  <IoPlay size={32} className="ml-1" />
                </div>
              </div>
              <h2 className="mb-2 text-xl sm:text-2xl font-bold text-white">{localText.loginToWatch}</h2>
              <p className="mb-5 sm:mb-8 max-w-md px-2 sm:px-8 text-sm sm:text-base text-gray-400">
                {localText.needLoginWatch}
              </p>
              <Link href="/login" className="btn btn-primary border-none bg-indigo-500 hover:bg-indigo-600 rounded-full px-5 sm:px-10 h-11 sm:h-14 font-bold text-sm sm:text-lg shadow-xl shadow-indigo-500/20">
                {localText.loginBtn}
              </Link>
            </div>
          ) : !isSubscribed ? (
            /* Logged in but not subscribed */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#0d1224] to-[#1a1c2e] group px-3 text-center">
              <div className="mb-4 sm:mb-6 flex h-16 w-16 sm:h-24 sm:w-24 rounded-full border border-indigo-500/30 bg-indigo-600/20 items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <div className="flex h-10 w-10 sm:h-16 sm:w-16 rounded-full bg-indigo-500 items-center justify-center text-white shadow-lg shadow-indigo-500/40">
                  <IoPlay size={32} className="ml-1" />
                </div>
              </div>
              <h2 className="mb-2 text-xl sm:text-2xl font-bold text-white">{localText.needSubWatch}</h2>
              <p className="mb-5 sm:mb-8 max-w-md px-2 sm:px-8 text-sm sm:text-base text-gray-400">
                {localText.needSubWatchDesc}
              </p>
              <button
                onClick={handleVideoClick}
                className="btn btn-primary border-none bg-indigo-500 hover:bg-indigo-600 rounded-full px-5 sm:px-10 h-11 sm:h-14 font-bold text-sm sm:text-lg shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
              >
                🔓 {localText.unlockSub}
              </button>
            </div>
          ) : embedUrl ? (
            /* Subscribed + Bunny Stream */
            <iframe
              title={t('video.playerTitle')}
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (videoLink as any)?.telegramLink ? (
            /* Subscribed + Telegram link */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#0d1224] to-[#1a1c2e] px-3 text-center">
              <div className="mb-4 sm:mb-6 flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-600/20 shadow-2xl transition-transform duration-500 group-hover:scale-110">
                <div className="flex h-10 w-10 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/40">
                  <IoPlay size={32} className="ml-1" />
                </div>
              </div>
              <h2 className="mb-2 text-xl sm:text-2xl font-bold text-white">{localText.tgHosted}</h2>
              <p className="mb-5 sm:mb-8 max-w-md px-2 sm:px-8 text-sm sm:text-base text-gray-400">
                {localText.tgHostedDesc}
              </p>
              <a
                href={(videoLink as any).telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary h-11 sm:h-14 rounded-full border-none bg-indigo-500 px-5 sm:px-10 text-sm sm:text-lg font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-600"
              >
                ▶ {localText.watchVideoBtn}
              </a>
            </div>
          ) : (
            /* Subscribed but no link — video processing */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#0d1224] to-[#1a1c2e]">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mb-6">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{localText.processingTitle}</h2>
              <p className="text-gray-400 text-center px-8 max-w-md mb-6">
                {localText.processingDesc}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-outline text-white border-white/20 rounded-full px-8 hover:bg-white/10"
              >
                🔄 {localText.refresh}
              </button>
            </div>
          )}
          {isSticky && (
            <button 
              onClick={() => setIsSticky(false)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black rounded-full text-white z-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IoArrowBack className="rotate-90" />
            </button>
          )}
        </motion.div>
        </div>

        {/* Integrated Playground Section */}
        {isSubscribed && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <IntegratedPlayground 
              videoId={id} 
              category={video.course?.category || 'javascript'} 
            />
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 mt-10 sm:mt-12">
          {/* Materials */}
          {video?.materials && video.materials.length > 0 && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-[#0d1224]/60 border border-white/5 rounded-3xl p-6 sm:p-8"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IoDocumentText className="text-indigo-400" />
                {localText.lessonMaterials}
              </h3>
              <div className="space-y-3">
                {video.materials.map((mat: { name: string; url: string }, i: number) => (
                  <a
                    key={i}
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                      <IoDocumentText className="text-indigo-400" size={18} />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                      {mat.name}
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}

          {/* Q&A */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0d1224]/60 border border-white/5 rounded-3xl p-6 sm:p-8"
          >
            <h3 className="text-lg font-bold text-white mb-6">{localText.qaTitle}</h3>
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 shadow-lg" />
              <div className="flex-1 relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-600 px-4 py-3 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
                  rows={3}
                  placeholder={localText.qaPlaceholder}
                />
                <button
                  onClick={handleQuestionSubmit}
                  disabled={!question.trim() || isSubmittingQuestion}
                  className="absolute bottom-3 right-3 px-4 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg active:scale-95"
                >
                  {isSubmittingQuestion ? '...' : localText.send}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Q&A Comments Section */}
      <VideoComments videoId={id} />

      {/* Instagram Verification Modal */}
      <SubscriptionGate
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        videoId={id}
      />
    </div>
  );
}

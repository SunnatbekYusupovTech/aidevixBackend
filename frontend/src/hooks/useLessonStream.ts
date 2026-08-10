'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { videoApi } from '@api/videoApi'
import { useVideos } from '@hooks/useVideos'
import type { StreamStatus, Video } from '@/types/video'

/** O'ynayotgan dars pozitsiyasini shu oraliqda bir marta yuboradi. */
const POSITION_REPORT_INTERVAL_S = 10
/** Token muddati tugashidan shuncha oldin yangi token olinadi. */
const TOKEN_REFRESH_LEAD_MS = 5 * 60 * 1000
/** Tayyorlanayotgan dars uchun poll oralig'i (spec §11). */
const PREPARING_POLL_MS = 30_000
/**
 * Ikki xato-refetch orasidagi minimal masofa. Busiz haqiqatan buzilgan oqim
 * `error → refetch → error` siklida cheksiz aylanadi.
 */
const ERROR_REFETCH_COOLDOWN_MS = 30_000

export interface LessonPlayerBinding {
  hlsUrl: string
  poster?: string
  startAt: number
  onPosition: (seconds: number) => void
  onError: () => void
}

export interface LessonStream {
  video: Video | null
  videoLink: unknown
  streamStatus: StreamStatus | null
  /**
   * Redux'dagi umumiy `videos.loading` bayrog'i: FONDAGI refetch'lar (token
   * yangilash, poll, xato-refetch) paytida ham `true` bo'ladi, hatto dars
   * allaqachon ekranda o'ynayotgan bo'lsa ham. Sahifani gate qilish uchun
   * ishlatmang — `isInitialLoading`dan foydalaning.
   */
  loading: boolean
  /**
   * Shu `videoId` uchun hali ko'rsatadigan hech narsa yo'q. Faqat shu holatda
   * to'liq ekranli spinner chizish mumkin: aks holda har bir fon refetch'i
   * o'ynayotgan player'ni uzib qo'yadi.
   */
  isInitialLoading: boolean
  /**
   * Faqat shu darsga tegishli ma'lumot umuman bo'lmaganda to'ldiriladi. Fon
   * refetch'ining xatosi ekranni buzmasligi kerak — player eski (hali amal
   * qiladigan) token bilan o'ynashda davom etadi va `onError`/poll qayta
   * urinadi.
   */
  error: unknown
  /** Video hali tayyorlanmoqda — sahifa kutish ekranini chizadi. */
  isPreparing: boolean
  /** Transcode buzilgan — sahifa xato ekranini chizadi. */
  hasFailed: boolean
  /** null bo'lsa player ko'rsatilmaydi. */
  playerProps: LessonPlayerBinding | null
  /** Kutish ekranidagi "Yangilash" tugmasi uchun. */
  refetch: () => void
}

/**
 * Bitta darsning pozitsiya hisoboti. Har bir `videoId` uchun ALOHIDA obyekt
 * yaratiladi (mutatsiya emas), chunki flush effekti o'z obyektini closure'da
 * ushlab turadi: dars almashganda render fazasi yangi obyektni qo'yadi, lekin
 * effekt cleanup'i hamon CHIQIB KETAYOTGAN darsning obyektini ko'radi va
 * uning oxirgi pozitsiyasini yubora oladi.
 */
interface PositionTracker {
  videoId: string
  position: number
  lastSent: number
}

export function useLessonStream(
  videoId: string,
  { reportProgress }: { reportProgress: boolean },
): LessonStream {
  const {
    current: storeVideo,
    videoLink: storeVideoLink,
    player: storePlayer,
    progress: storeProgress,
    streamStatus: storeStreamStatus,
    loading,
    error: storeError,
    fetchById,
  } = useVideos()

  // ── Faqat SHU darsga tegishli javob ─────────────────────────────────────
  // `videos.*` butun ilova bo'ylab bitta global slot. Yangi `videoId` bilan
  // birinchi render bo'lganda u hamon OLDINGI darsning javobini saqlaydi
  // (fetch endi boshlanadi). O'sha eski javobdan hech narsa o'qilmasligi
  // kerak: aks holda resume nuqtasi oldingi darsdan muzlab qoladi, player esa
  // bir zumda oldingi darsning oqimini ko'rsatadi.
  const isOwnResponse =
    !!storeVideo && (storeVideo as { _id?: string })._id === videoId
  const video = isOwnResponse ? storeVideo : null
  const videoLink = isOwnResponse ? storeVideoLink : null
  const player = isOwnResponse ? storePlayer : null
  const streamStatus = isOwnResponse ? storeStreamStatus : null

  // `fetchById` har renderda yangi funksiya. Quyidagi taymerlar shu sababdan
  // qayta ishga tushmasligi kerak.
  const fetchRef = useRef(fetchById)
  useEffect(() => {
    fetchRef.current = fetchById
  }, [fetchById])

  const trackerRef = useRef<PositionTracker>({ videoId, position: 0, lastSent: 0 })
  const resumeAtRef = useRef<number | null>(null)
  const errorRefetchAtRef = useRef(0)

  const reportRef = useRef(reportProgress)
  useEffect(() => {
    reportRef.current = reportProgress
  }, [reportProgress])

  const courseId =
    video && typeof video.course === 'object' ? video.course?._id : undefined
  const courseIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    courseIdRef.current = courseId
  }, [courseId])

  // ── Resume nuqtasini muzlatish ──────────────────────────────────────────
  // Render paytida bajariladi (idempotent), chunki `player` va `progress`
  // bitta javobdan bitta renderda keladi — effekt kech qolib, birinchi
  // `playerProps` startAt=0 bilan hisoblanardi.
  if (trackerRef.current.videoId !== videoId) {
    trackerRef.current = { videoId, position: 0, lastSent: 0 }
    resumeAtRef.current = null
    errorRefetchAtRef.current = 0
  }
  if (resumeAtRef.current === null && isOwnResponse) {
    // SHU darsga tegishli birinchi javobgina ma'noli pozitsiya olib keladi.
    // Keyingi har qanday javob (token yangilanishi, poll) shu seans
    // BOSHIDAGI pozitsiyani qaytaradi, ya'ni uni qayta o'qish player'ni
    // orqaga tortardi.
    const resumeAt =
      (storeProgress as { lastPositionSeconds?: number } | null)?.lastPositionSeconds || 0
    resumeAtRef.current = resumeAt
    // Hisobot bazasi ham shu nuqta: aks holda resume'dan keyingi birinchi
    // `onPosition` o'zgarmagan pozitsiyani darhol qayta POST qilardi.
    trackerRef.current.position = resumeAt
    trackerRef.current.lastSent = resumeAt
  }

  // ── Dastlabki fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  const sendPosition = useCallback((tracker: PositionTracker, seconds: number) => {
    const course = courseIdRef.current
    if (!reportRef.current || !course || !tracker.videoId) return
    tracker.lastSent = seconds
    videoApi.saveProgress(course, tracker.videoId, Math.floor(seconds)).catch(() => {})
  }, [])

  const onPosition = useCallback(
    (seconds: number) => {
      const tracker = trackerRef.current
      tracker.position = seconds
      // Masofa ISHORASIZ o'lchanadi: orqaga qaytish ham haqiqiy pozitsiya
      // o'zgarishi. Aks holda 100s dan 10s ga qaytgan foydalanuvchi 110s ga
      // yetguncha umuman hisobot bermasdi.
      if (Math.abs(seconds - tracker.lastSent) >= POSITION_REPORT_INTERVAL_S) {
        sendPosition(tracker, seconds)
      }
    },
    [sendPosition],
  )

  // ── Unmount'da va tab yashiringanda oxirgi pozitsiyani yuborish ─────────
  // `videoId` ataylab dependency: dars joyida almashganda ham cleanup ishlaydi
  // va closure'dagi `tracker` — chiqib ketayotgan darsniki.
  useEffect(() => {
    const tracker = trackerRef.current
    const flush = () => {
      // Teng emaslik tekshiruvi: orqaga surilgan pozitsiya ham yuborilishi
      // kerak (`>` bo'lsa rewind'dan keyingi flush yo'qolardi).
      if (tracker.position !== tracker.lastSent) sendPosition(tracker, tracker.position)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [videoId, sendPosition])

  // ── Proaktiv token yangilash ────────────────────────────────────────────
  const expiresAt = player?.expiresAt
  useEffect(() => {
    if (!expiresAt || !videoId) return
    const lead = new Date(expiresAt).getTime() - Date.now() - TOKEN_REFRESH_LEAD_MS
    const timer = setTimeout(() => fetchRef.current(videoId), Math.max(0, lead))
    return () => clearTimeout(timer)
  }, [expiresAt, videoId])

  // ── Reaktiv: player xatosi ──────────────────────────────────────────────
  const onError = useCallback(() => {
    const now = Date.now()
    if (now - errorRefetchAtRef.current < ERROR_REFETCH_COOLDOWN_MS) return
    errorRefetchAtRef.current = now
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  // ── Tayyorlanayotgan darsni pollinq qilish ──────────────────────────────
  const isPreparing =
    !player && (streamStatus === 'pending' || streamStatus === 'processing')

  useEffect(() => {
    if (!isPreparing || !videoId) return
    const timer = setInterval(() => fetchRef.current(videoId), PREPARING_POLL_MS)
    return () => clearInterval(timer)
  }, [isPreparing, videoId])

  const refetch = useCallback(() => {
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  const hlsUrl = player?.hlsUrl
  const poster = video?.thumbnail || undefined

  const playerProps = useMemo<LessonPlayerBinding | null>(() => {
    if (!hlsUrl) return null
    return {
      hlsUrl,
      poster,
      // Ref'lar ataylab dependency emas: `startAt` faqat manba almashganda
      // qayta o'qilishi kerak, har renderda emas.
      startAt: trackerRef.current.position || resumeAtRef.current || 0,
      onPosition,
      onError,
    }
  }, [hlsUrl, poster, onPosition, onError])

  return {
    video: (video as Video) ?? null,
    videoLink,
    streamStatus: (streamStatus as StreamStatus) ?? null,
    loading,
    // Shu dars uchun hali na ma'lumot, na xato bor — demak birinchi yuklash.
    // Fon refetch'i (`loading === true`, lekin javob allaqachon bor) bu yerga
    // tushmaydi, shuning uchun player uzilmaydi.
    isInitialLoading: !isOwnResponse && !storeError,
    error: isOwnResponse ? null : storeError,
    isPreparing,
    hasFailed: streamStatus === 'failed',
    playerProps,
    refetch,
  }
}

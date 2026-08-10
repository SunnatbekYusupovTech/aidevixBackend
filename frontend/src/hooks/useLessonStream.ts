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
  loading: boolean
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

export function useLessonStream(
  videoId: string,
  { reportProgress }: { reportProgress: boolean },
): LessonStream {
  const {
    current: video,
    videoLink,
    player,
    progress,
    streamStatus,
    loading,
    error,
    fetchById,
  } = useVideos()

  // `fetchById` har renderda yangi funksiya. Quyidagi taymerlar shu sababdan
  // qayta ishga tushmasligi kerak.
  const fetchRef = useRef(fetchById)
  useEffect(() => {
    fetchRef.current = fetchById
  }, [fetchById])

  const positionRef = useRef(0)
  const lastSentRef = useRef(0)
  const resumeAtRef = useRef<number | null>(null)
  const errorRefetchAtRef = useRef(0)
  const frozenForRef = useRef<string | null>(null)

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
  if (frozenForRef.current !== videoId) {
    frozenForRef.current = videoId
    resumeAtRef.current = null
    positionRef.current = 0
    lastSentRef.current = 0
    errorRefetchAtRef.current = 0
  }
  if (resumeAtRef.current === null && progress) {
    // Faqat birinchi javob ma'noli pozitsiya olib keladi. Keyingi har qanday
    // javob (token yangilanishi, poll) shu seans BOSHIDAGI pozitsiyani
    // qaytaradi, ya'ni uni qayta o'qish player'ni orqaga tortardi.
    resumeAtRef.current = (progress as { lastPositionSeconds?: number }).lastPositionSeconds || 0
  }

  // ── Dastlabki fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  const sendPosition = useCallback(
    (seconds: number) => {
      const course = courseIdRef.current
      if (!reportRef.current || !course || !videoId) return
      lastSentRef.current = seconds
      videoApi.saveProgress(course, videoId, Math.floor(seconds)).catch(() => {})
    },
    [videoId],
  )

  const onPosition = useCallback(
    (seconds: number) => {
      positionRef.current = seconds
      if (seconds - lastSentRef.current >= POSITION_REPORT_INTERVAL_S) {
        sendPosition(seconds)
      }
    },
    [sendPosition],
  )

  // ── Unmount'da va tab yashiringanda oxirgi pozitsiyani yuborish ─────────
  useEffect(() => {
    const flush = () => {
      if (positionRef.current > lastSentRef.current) sendPosition(positionRef.current)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [sendPosition])

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
      startAt: positionRef.current > 0 ? positionRef.current : resumeAtRef.current ?? 0,
      onPosition,
      onError,
    }
  }, [hlsUrl, poster, onPosition, onError])

  return {
    video: (video as Video) ?? null,
    videoLink,
    streamStatus: (streamStatus as StreamStatus) ?? null,
    loading,
    error,
    isPreparing,
    hasFailed: streamStatus === 'failed',
    playerProps,
    refetch,
  }
}

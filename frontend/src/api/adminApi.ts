import axiosInstance from './axiosInstance'
import type { AxiosResponse } from 'axios'

/** Backend javobi: { success, data: T } */
export function unwrapAdmin<T>(res: AxiosResponse<{ success?: boolean; data: T }>): T {
  return res.data.data
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats  = ()       => axiosInstance.get('admin/stats')
export const getTopStudents     = ()       => axiosInstance.get('admin/top-students')
export const getCoursesStats    = ()       => axiosInstance.get('admin/courses/stats')
export const getRecentPayments  = (params) => axiosInstance.get('admin/payments', { params })

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers    = (params)      => axiosInstance.get('admin/users', { params })
export const updateUser  = (id, data)    => axiosInstance.put(`admin/users/${id}`, data)
export const deleteUser  = (id)          => axiosInstance.delete(`admin/users/${id}`)

// ─── Courses ─────────────────────────────────────────────────────────────────
export const getAllCourses  = (params)   => axiosInstance.get('courses', { params })
export const getCourseById = (id)        => axiosInstance.get(`courses/${id}`)
export const createCourse  = (data)      => axiosInstance.post('courses', data)
export const updateCourse  = (id, data)  => axiosInstance.put(`courses/${id}`, data)
export const deleteCourse  = (id)        => axiosInstance.delete(`courses/${id}`)

// ─── Videos ──────────────────────────────────────────────────────────────────
export const getCourseVideos       = (courseId)          => axiosInstance.get(`videos/course/${courseId}`)
export const createVideo           = (data)              => axiosInstance.post('videos', data)
export const updateVideo           = (id, data)          => axiosInstance.put(`videos/${id}`, data)
export const deleteVideo           = (id)                => axiosInstance.delete(`videos/${id}`)
export const getUploadCredentials  = (id)                => axiosInstance.get(`videos/${id}/upload-credentials`)
export const getVideoStatus        = (id)                => axiosInstance.get(`videos/${id}/status`)
export const linkVideoToBunny      = (id, bunnyVideoId)  => axiosInstance.patch(`videos/${id}/link-bunny`, { bunnyVideoId })

// ─── Users (detail) ──────────────────────────────────────────────────────────
export const getUserDetail = (id: string) => axiosInstance.get(`admin/users/${id}`)

// ─── Analytics ───────────────────────────────────────────────────────────────
export const getAnalytics = () => axiosInstance.get('admin/analytics')

// ─── Global search ───────────────────────────────────────────────────────────
export const globalSearch = (q: string) => axiosInstance.get('admin/search', { params: { q } })

// ─── Course enrollment stats ─────────────────────────────────────────────────
export const getCourseEnrollmentStats = (courseId: string) =>
  axiosInstance.get(`admin/courses/${courseId}/enrollments`)

// ─── Telegram ────────────────────────────────────────────────────────────────
export const sendTelegramMessage = (message: string, parseMode?: string) =>
  axiosInstance.post('admin/telegram', { message, parseMode })

// ─── Bulk Bunny GUID link ─────────────────────────────────────────────────────
export const bulkLinkBunny = (links: { videoId: string; bunnyVideoId: string }[]) =>
  axiosInstance.post('admin/videos/bulk-link', { links })

// ─── Reorder videos ──────────────────────────────────────────────────────────
export const reorderVideos = (videos: { id: string; order: number }[]) =>
  axiosInstance.put('admin/videos/reorder', { videos })

// ─── Video binary upload (backend proxy — AccessKey leak qilinmaydi) ───────────
export const uploadVideoBinary = (
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
) =>
  axiosInstance.put(uploadUrl, file, {
    headers: { 'Content-Type': 'application/octet-stream' },
    timeout: 0, // katta video fayllar uchun
    onUploadProgress: (ev) => {
      if (onProgress && ev.total) onProgress(Math.round((ev.loaded / ev.total) * 100))
    },
  })

// ─── Thumbnail upload ─────────────────────────────────────────────────────────
export const uploadThumbnail = (courseId: string, file: File) => {
  const fd = new FormData()
  fd.append('thumbnail', file)
  // Content-Type'ni qo'lda bermaymiz — axios FormData boundary'ni o'zi qo'yadi
  return axiosInstance.post(`upload/thumbnail/${courseId}`, fd)
}

// ─── Challenges (admin) ─────────────────────────────────────────────────────
export const createDailyChallenge = (body: {
  title: string
  description?: string
  type: string
  targetCount?: number
  xpReward?: number
  date: string
}) => axiosInstance.post('challenges/admin', body)

// ─── AI News (admin) ─────────────────────────────────────────────────────────
export const getAiNewsAdmin = () => axiosInstance.get('admin/ai-news')
export const createAiNewsAdmin = (body: {
  title: string
  summary: string
  imageUrl?: string
  platform: 'telegram' | 'instagram'
  href: string
  cta?: string
  order?: number
  isActive?: boolean
  startsAt?: string
  endsAt?: string
}) => axiosInstance.post('admin/ai-news', body)
export const updateAiNewsAdmin = (id: string, body: Record<string, unknown>) =>
  axiosInstance.put(`admin/ai-news/${id}`, body)
export const deleteAiNewsAdmin = (id: string) => axiosInstance.delete(`admin/ai-news/${id}`)

// ─── Promo Codes (admin) ──────────────────────────────────────────────────────
export const getPromoCodes = (params?: Record<string, unknown>) =>
  axiosInstance.get('admin/promos', { params })
export const createPromoCode = (body: {
  code: string
  description?: string
  type: 'percent' | 'fixed'
  value: number
  maxUses?: number | null
  courseIds?: string[]
  expiresAt?: string | null
}) => axiosInstance.post('admin/promos', body)
export const updatePromoCode = (id: string, body: Record<string, unknown>) =>
  axiosInstance.put(`admin/promos/${id}`, body)
export const deletePromoCode = (id: string) => axiosInstance.delete(`admin/promos/${id}`)

// ─── Enrollments (admin) ──────────────────────────────────────────────────────
export const getAllEnrollments = (params?: Record<string, unknown>) =>
  axiosInstance.get('admin/enrollments', { params })

// ─── Award XP (admin) ─────────────────────────────────────────────────────────
export const awardXpToUser = (id: string, xp: number, reason?: string) =>
  axiosInstance.post(`admin/users/${id}/award-xp`, { xp, reason })

// ─── Payments (admin) ─────────────────────────────────────────────────────────
export const updatePaymentStatus = (
  id: string,
  status: 'completed' | 'refunded' | 'cancelled' | 'failed',
  note?: string,
) => axiosInstance.put(`admin/payments/${id}`, { status, note })

// ─── Prompts moderation (admin) ───────────────────────────────────────────────
export const getAdminPrompts = (params?: Record<string, unknown>) =>
  axiosInstance.get('admin/prompts', { params })
export const setPromptVisibility = (id: string, isPublic: boolean) =>
  axiosInstance.patch(`admin/prompts/${id}/visibility`, { isPublic })
export const featurePromptAdmin = (id: string, featured: boolean) =>
  axiosInstance.patch(`admin/prompts/${id}/feature`, { featured })
export const deletePromptAdmin = (id: string) =>
  axiosInstance.delete(`admin/prompts/${id}`)

// ─── Daily Challenges (admin) ─────────────────────────────────────────────────
export const getAdminChallenges = (params?: Record<string, unknown>) =>
  axiosInstance.get('admin/challenges', { params })
export const updateChallenge = (id: string, body: Record<string, unknown>) =>
  axiosInstance.put(`admin/challenges/${id}`, body)
export const deleteChallenge = (id: string) =>
  axiosInstance.delete(`admin/challenges/${id}`)

// ─── Bug Reports (admin) ──────────────────────────────────────────────────────
export const getAdminBugReports = (params?: Record<string, unknown>) =>
  axiosInstance.get('admin/bug-reports', { params })
export const reviewBugReport = (
  id: string,
  action: 'reject' | 'award_bug' | 'award_suggestion',
  adminNote?: string,
) => axiosInstance.patch(`admin/bug-reports/${id}`, { action, adminNote })

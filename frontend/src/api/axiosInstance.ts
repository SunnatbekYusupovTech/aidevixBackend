import axios from 'axios'
import { API_BASE_URL } from '@utils/constants'
import { tokenStorage } from '@utils/tokenStorage'

const CSRF_COOKIE_NAME = 'aidevix_csrf'

// In-memory CSRF token. Cross-site frontends (aidevix.uz → railway.app) cannot
// read the API-origin cookie via document.cookie, so the canonical source is
// what the backend hands us in JSON response bodies (login, refresh, /auth/me,
// /auth/csrf). The cookie is still used as a fallback for same-origin setups.
let csrfTokenInMemory: string | null = null

export const setCsrfToken = (token: string | null | undefined) => {
  if (typeof token === 'string' && token.length > 0) {
    csrfTokenInMemory = token
  }
}

const readCsrfFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CSRF_COOKIE_NAME}=`))
  if (!match) return null
  return decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1))
}

const getCsrfToken = (): string | null => csrfTokenInMemory || readCsrfFromCookie()

const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}auth/csrf`, {
      withCredentials: true,
      timeout: 10000,
    })
    const token = data?.data?.token
    if (typeof token === 'string' && token) {
      csrfTokenInMemory = token
      return token
    }
  } catch {
    // Network error — caller will surface the original failure.
  }
  return null
}

// Public boot-time helper. Call once on app mount so the in-memory token is
// ready before any mutating request fires (otherwise the first POST on a
// fresh tab eats one round-trip on the 403→retry path).
export const primeCsrfToken = (): void => {
  if (csrfTokenInMemory) return
  void fetchCsrfToken()
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach CSRF token for state-changing requests, and lift captchaToken from body to header.
api.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase()
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
  if (isFormData) {
    // Let XHR/fetch set proper multipart boundary for FormData requests.
    if (config.headers && 'Content-Type' in config.headers) {
      delete (config.headers as Record<string, string>)['Content-Type']
    }
  }
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) {
      config.headers = config.headers || {}
      ;(config.headers as Record<string, string>)['X-CSRF-Token'] = csrf
    }
    // Convenience: callers may add `captchaToken` to the body; we forward it as
    // `X-Captcha-Token` (which the backend `captchaCheck` middleware reads).
    const body: any = config.data
    if (
      body &&
      typeof body === 'object' &&
      !(body instanceof FormData) &&
      'captchaToken' in body &&
      body.captchaToken
    ) {
      config.headers = config.headers || {}
      ;(config.headers as Record<string, string>)['X-Captcha-Token'] = String(body.captchaToken)
      // Strip from body so it doesn't pollute backend payloads
      const { captchaToken, ...rest } = body
      config.data = rest
    }
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = []

api.interceptors.response.use(
  (response) => {
    // Backend returns `csrfToken` on auth-issuing responses (login, refresh,
    // 2fa-verify, telegram-init, /auth/me). Pull it into the in-memory store
    // so cross-site clients have something to echo back as X-CSRF-Token.
    const body: any = response?.data
    if (body && typeof body === 'object' && typeof body.csrfToken === 'string') {
      setCsrfToken(body.csrfToken)
    }
    return response
  },
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const message = error.response?.data?.message || ''

    // Cross-site clients can't read the CSRF cookie — when the server rejects
    // a request because the X-CSRF-Token header is missing/mismatched, fetch
    // a fresh token via /auth/csrf and replay the original request once.
    if (
      status === 403 &&
      typeof message === 'string' &&
      message.toLowerCase().includes('csrf') &&
      original &&
      !original._csrfRetry
    ) {
      original._csrfRetry = true
      const fresh = await fetchCsrfToken()
      if (fresh) {
        original.headers = original.headers || {}
        original.headers['X-CSRF-Token'] = fresh
        return api(original)
      }
    }

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !String(original.url || '').includes('auth/refresh-token') &&
      !String(original.url || '').includes('auth/login') &&
      !String(original.url || '').includes('auth/register') &&
      !String(original.url || '').includes('auth/forgot-password') &&
      !String(original.url || '').includes('auth/verify-code') &&
      !String(original.url || '').includes('auth/reset-password')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then(() => api(original))
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data: refreshBody } = await axios.post(
          `${API_BASE_URL}auth/refresh-token`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          },
        )

        // Refresh response carries the new CSRF token — capture it for the
        // replayed request so the next retry doesn't 403 on a stale token.
        if (refreshBody && typeof refreshBody.csrfToken === 'string') {
          setCsrfToken(refreshBody.csrfToken)
        }

        // Navbatdagi so'rovlar yangi cookie bilan mustaqil retry qiladi (.then → api(original)).
        // isRefreshing finally'da reset bo'ladi; yuqori concurrency'da kamdan-kam double-refresh
        // bo'lishi mumkin, lekin har retry idempotent va xavfsiz — qabul qilingan trade-off.
        refreshQueue.forEach((cb) => cb.resolve(true))
        refreshQueue = []
        return api(original)
      } catch (refreshError) {
        tokenStorage.clearTokens()
        refreshQueue.forEach((cb) => cb.reject(refreshError))
        refreshQueue = []
        // Do not force global redirect from interceptor.
        // Public pages can legitimately receive 401 on optional auth checks.
        // ProtectedRoute/AdminRoute handle navigation for protected screens.
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    // Obuna bekor qilingan bo'lsa — Redux state ni yangilash
    // (dynamic import — circular dependency oldini olish uchun; xato silent qolmasin)
    if (error.response?.status === 403 && error.response?.data?.isSubscriptionError) {
      Promise.all([import('@store/index'), import('@store/slices/subscriptionSlice')])
        .then(([{ dispatch }, { resetSubscription }]) => {
          dispatch(resetSubscription({ subscriptions: error.response.data.subscriptions }))
        })
        .catch((e) => console.error('[axios] resetSubscription dispatch failed:', e))
    }

    // Admin 2FA enrollment required — auto-redirect once
    if (
      error.response?.status === 403 &&
      error.response?.data?.requires2FAEnrollment &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/auth/2fa-setup')
    ) {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.replace(`/auth/2fa-setup?next=${next}`)
    }

    return Promise.reject(error)
  },
)

export default api

import { STORAGE_KEYS } from './constants'

// Auth tokenlari faqat HttpOnly cookie orqali saqlanadi (CLAUDE.md).
// Bu utility faqat USER cache-i uchun ishlatiladi — sezgir token saqlamaydi.
const isBrowser = typeof window !== 'undefined'

const cleanupLegacyTokens = () => {
  if (!isBrowser) return
  // Eski versiyalarda token localStorage da bo'lgan bo'lishi mumkin — tozalaymiz.
  try {
    localStorage.removeItem('aidevix_access_token')
    localStorage.removeItem('aidevix_refresh_token')
  } catch { /* ignore quota / disabled storage */ }
}

export const tokenStorage = {
  clearTokens: () => {
    if (!isBrowser) return
    cleanupLegacyTokens()
    localStorage.removeItem(STORAGE_KEYS.USER)
  },
  clearUser: () => {
    if (isBrowser) {
      localStorage.removeItem(STORAGE_KEYS.USER)
    }
  },
  getUser: () => {
    if (!isBrowser) return null
    try {
      const user = localStorage.getItem(STORAGE_KEYS.USER)
      return user ? JSON.parse(user) : null
    } catch { return null }
  },
  setUser: (user: any) =>
    isBrowser && localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
}

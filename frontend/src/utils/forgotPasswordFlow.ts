const STORAGE_KEY = 'aidevix_forgot_password_state'
const REMEMBERED_EMAIL_KEY = 'aidevix_remembered_email'
const CODE_TTL_MS = 10 * 60 * 1000

const normalize = (id = '') => id.trim().toLowerCase()

const safeLocalStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

const readState = () => {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    return JSON.parse(ls.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

const writeState = (state: object) => {
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota / privacy mode — ignore */
  }
}

const clearState = () => {
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    ls.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export const forgotPasswordFlow = {
  startTimer(identifier: string) {
    const normalized = normalize(identifier)
    const expiresAt = Date.now() + CODE_TTL_MS
    writeState({ identifier: normalized, expiresAt })
  },

  getRemainingSeconds(identifier: string) {
    const state = readState()
    const normalized = normalize(identifier)
    if (!state || state.identifier !== normalized) return 0
    const remaining = Math.ceil((state.expiresAt - Date.now()) / 1000)
    return Math.max(0, remaining)
  },

  rememberEmail(email: string) {
    const ls = safeLocalStorage()
    if (!ls) return
    try {
      ls.setItem(REMEMBERED_EMAIL_KEY, normalize(email))
    } catch {
      /* ignore */
    }
  },

  getRememberedEmail(): string {
    const ls = safeLocalStorage()
    if (!ls) return ''
    try {
      return ls.getItem(REMEMBERED_EMAIL_KEY) || ''
    } catch {
      return ''
    }
  },

  clear() {
    clearState()
  },
}

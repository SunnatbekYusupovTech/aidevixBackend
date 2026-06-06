import api from './axiosInstance'

export const authApi = {
  /** POST /auth/register */
  register: (data) => api.post('auth/register', data),

  /** POST /auth/login */
  login: (data) => api.post('auth/login', data),

  /** POST /auth/google — Google OAuth (credential = ID token) yoki (accessToken = access token) */
  googleAuth: (data: { credential?: string; accessToken?: string }) => api.post('auth/google', data),

  /** POST /auth/telegram-init — Telegram Mini App login (initData HMAC validated) */
  telegramMiniAppAuth: (data: { initData: string }) =>
    api.post('auth/telegram-init', data),

  /** POST /auth/telegram-login — bot "Magic Login" opaque kodini sessiyaga almashtirish */
  telegramMagicLogin: (code: string) =>
    api.post('auth/telegram-login', { code }),

  /** POST /auth/2fa/verify-login — exchange challengeId + TOTP code for session */
  verify2FALogin: (data: { challengeId: string; code: string }) =>
    api.post('auth/2fa/verify-login', data),

  /** POST /auth/resend-verification-public — public, generic response (no enumeration) */
  resendVerificationPublic: (data: { email: string }) =>
    api.post('auth/resend-verification-public', data),

  /** POST /auth/verify-email-public — public verify code (used after login email-gate) */
  verifyEmailPublic: (data: { email: string; code: string }) =>
    api.post('auth/verify-email-public', data),

  /** POST /auth/verify-email — authenticated verify (existing logged-in flow) */
  verifyEmail: (data: { code: string }) => api.post('auth/verify-email', data),

  /** POST /auth/2fa/setup — start enrollment (returns QR + secret) */
  setup2FA: () => api.post('auth/2fa/setup', {}),

  /** POST /auth/2fa/enable — verify first code, get backup codes */
  enable2FA: (data: { code: string }) => api.post('auth/2fa/enable', data),

  /** POST /auth/2fa/disable — requires password + TOTP/backup code */
  disable2FA: (data: { password: string; code: string }) =>
    api.post('auth/2fa/disable', data),

  /** POST /auth/2fa/backup-codes — regenerate backup codes (invalidates old) */
  regenerateBackupCodes: (data: { code: string }) =>
    api.post('auth/2fa/backup-codes', data),

  /** POST /auth/refresh-token */
  refresh: () => api.post('auth/refresh-token', {}),

  /** POST /auth/logout */
  logout: () => api.post('auth/logout'),

  /** GET /auth/me - get current user info */
  getMe: () => api.get('auth/me'),

  /** PUT /auth/change-password */
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('auth/change-password', data),

  /**
   * POST /auth/reauth — issue 5-min step-up reauth token.
   * Pass `password` for local accounts, OR `googleCredential` (Google ID token) for Google-only accounts.
   */
  reauth: (data: { password?: string; googleCredential?: string }) =>
    api.post('auth/reauth', data),

  /**
   * DELETE /auth/me — GDPR right-to-erasure (soft-delete + anonymize).
   * Requires `X-Reauth-Token` header (obtain from /auth/reauth).
   */
  deleteMyAccount: (reauthToken: string) =>
    api.delete('auth/me', { headers: { 'X-Reauth-Token': reauthToken } }),
}

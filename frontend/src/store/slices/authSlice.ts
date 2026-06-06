import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '@api/authApi'
import { tokenStorage } from '@utils/tokenStorage'

// ─── Async Thunks ─────────────────────────────────────────────

export const register = createAsyncThunk(
  'auth/register',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authApi.register(credentials)
      // Server no longer auto-logs in. Successful register returns
      // requiresEmailVerification + email so the UI can hop to /auth/verify-email.
      if (data?.requiresEmailVerification) {
        return { requiresEmailVerification: true, email: data.email }
      }
      tokenStorage.clearTokens()
      tokenStorage.setUser(data.data.user)
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Ro\'yxatdan o\'tishda xato')
    }
  },
)

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authApi.login(credentials)
      // Intermediate states — password OK but session not yet issued
      if (data.requires2FA) {
        return { requires2FA: true, challengeId: data.challengeId }
      }
      if (data.requiresEmailVerification) {
        return { requiresEmailVerification: true, email: data.email }
      }
      tokenStorage.clearTokens()
      tokenStorage.setUser(data.data.user)
      return data.data
    } catch (err) {
      // Email-verification gate uses HTTP 403 with a flag — surface it to the UI.
      const body = err.response?.data
      if (body?.requiresEmailVerification) {
        return { requiresEmailVerification: true, email: body.email }
      }
      return rejectWithValue(body?.message || 'Login yoki parol xato')
    }
  },
)

export const googleAuth = createAsyncThunk(
  'auth/googleAuth',
  async (payload: { credential: string }, { rejectWithValue }) => {
    try {
      const { data } = await authApi.googleAuth(payload)
      if (data.requires2FA) {
        return { requires2FA: true, challengeId: data.challengeId }
      }
      tokenStorage.clearTokens()
      tokenStorage.setUser(data.data.user)
      return data.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Google orqali kirish amalga oshmadi')
    }
  },
)

export const verify2FALogin = createAsyncThunk(
  'auth/verify2FALogin',
  async (payload: { challengeId: string; code: string }, { rejectWithValue }) => {
    try {
      const { data } = await authApi.verify2FALogin(payload)
      tokenStorage.clearTokens()
      tokenStorage.setUser(data.data.user)
      return data.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || '2FA kodi noto\'g\'ri')
    }
  },
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout()
    } catch {
      // Logout always clears local tokens even if API fails
    } finally {
      tokenStorage.clearTokens()
    }
  },
)

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      // Cookie (httpOnly) — haqiqiy manba. localStorage cache yo'q bo'lsa ham
      // valid sessiya cookie'si bo'lishi mumkin, shuning uchun har doim /me chaqiramiz.
      const { data } = await authApi.getMe()
      tokenStorage.clearTokens()
      tokenStorage.setUser(data.data)
      return { user: data.data }
    } catch {
      return rejectWithValue('No active session')
    }
  },
)

// ─── Slice ────────────────────────────────────────────────────

const initialState = {
  user:        null,
  isLoggedIn:  false,
  // true on first mount so ProtectedRoute waits for the bootstrap checkAuthStatus
  // call before redirecting users with valid session cookies to /login.
  loading:     true,
  error:       null,
  // 2FA / verification interstitial state
  pending2FA:  null as null | { challengeId: string },
  pendingEmailVerification: null as null | { email: string },
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null },
    clearPending2FA: (state) => { state.pending2FA = null },
    clearPendingEmailVerification: (state) => { state.pendingEmailVerification = null },
    updateUser: (state, action) => {
      state.user = { ...(state.user || {}), ...action.payload }
    },
  },
  extraReducers: (builder) => {
    const pending   = (state) => { state.loading = true; state.error = null }
    const rejected  = (state, action) => { state.loading = false; state.error = action.payload }
    const clearSession = (state) => {
      state.user = null
      state.isLoggedIn = false
    }
    const fulfilled = (state, action) => {
      state.loading   = false
      // 2FA pending: don't mark logged in yet
      if (action.payload?.requires2FA) {
        state.pending2FA = { challengeId: action.payload.challengeId }
        state.user = null
        state.isLoggedIn = false
        return
      }
      // Email verification pending: don't mark logged in
      if (action.payload?.requiresEmailVerification) {
        state.pendingEmailVerification = { email: action.payload.email }
        state.user = null
        state.isLoggedIn = false
        return
      }
      state.user = action.payload.user
      state.isLoggedIn = true
      state.pending2FA = null
      state.pendingEmailVerification = null
    }

    builder
      .addCase(register.pending,         pending)
      .addCase(register.fulfilled,       fulfilled)
      .addCase(register.rejected,        rejected)

      .addCase(login.pending,            pending)
      .addCase(login.fulfilled,          fulfilled)
      .addCase(login.rejected,           rejected)

      .addCase(googleAuth.pending,       pending)
      .addCase(googleAuth.fulfilled,     fulfilled)
      .addCase(googleAuth.rejected,      rejected)

      .addCase(verify2FALogin.pending,   pending)
      .addCase(verify2FALogin.fulfilled, fulfilled)
      .addCase(verify2FALogin.rejected,  rejected)

      .addCase(logout.fulfilled,         (state) => {
        state.loading = false
        state.error = null
        clearSession(state)
      })

      .addCase(checkAuthStatus.pending,  pending)
      .addCase(checkAuthStatus.fulfilled, fulfilled)
      .addCase(checkAuthStatus.rejected,  (state) => {
        state.loading = false
        clearSession(state)
      })
  },
})

export const { clearError, clearPending2FA, clearPendingEmailVerification, updateUser } = authSlice.actions
export default authSlice.reducer

// ─── Selectors ────────────────────────────────────────────────
export const selectUser      = (state) => state.auth.user
export const selectIsLoggedIn = (state) => state.auth.isLoggedIn
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthError  = (state) => state.auth.error
export const selectIsAdmin    = (state) => state.auth.user?.role === 'admin'
export const selectPending2FA = (state) => state.auth.pending2FA
export const selectPendingEmailVerification = (state) => state.auth.pendingEmailVerification

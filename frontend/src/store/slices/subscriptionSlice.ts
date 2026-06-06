import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { subscriptionApi } from '@api/subscriptionApi'

export const fetchSubscriptionStatus = createAsyncThunk(
  'subscription/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await subscriptionApi.getStatus()
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  },
)

export const verifyTelegram = createAsyncThunk(
  'subscription/verifyTelegram',
  async (telegramData, { rejectWithValue }) => {
    try {
      const { data } = await subscriptionApi.verifyTelegram(telegramData)
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Telegram tekshirishda xato')
    }
  },
)

export const verifyInstagram = createAsyncThunk(
  'subscription/verifyInstagram',
  async (instagramData, { rejectWithValue }) => {
    try {
      const { data } = await subscriptionApi.verifyInstagram(instagramData)
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Instagram tekshirishda xato')
    }
  },
)

const initialState = {
  telegram:  { subscribed: false, username: null, verifiedAt: null },
  instagram: { subscribed: false, username: null, verifiedAt: null },
  allVerified: false,
  loading:     false,
  error:       null,
}

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearSubError: (state) => { state.error = null },
    resetSubscription: (state, action) => {
      const subs = action.payload?.subscriptions
      if (subs) {
        if (subs.instagram === false) {
          state.instagram = { subscribed: false, username: state.instagram.username, verifiedAt: null }
        }
        if (subs.telegram === false) {
          state.telegram = { subscribed: false, username: state.telegram.username, verifiedAt: null }
        }
      } else {
        state.telegram  = { subscribed: false, username: state.telegram.username, verifiedAt: null }
        state.instagram = { subscribed: false, username: state.instagram.username, verifiedAt: null }
      }
      state.allVerified = !!(state.telegram.subscribed && state.instagram.subscribed)
    },
  },
  extraReducers: (builder) => {
    const setStatus = (state, action) => {
      const source = action.payload?.subscriptions ?? action.payload ?? {}
      const telegram = action.payload?.telegram ?? source.telegram
      const instagram = action.payload?.instagram ?? source.instagram
      // undefined tekshirish — null/false qiymatlarni to'g'ri qabul qilish uchun
      state.telegram   = telegram  !== undefined ? telegram  : state.telegram
      state.instagram  = instagram !== undefined ? instagram : state.instagram
      state.allVerified = !!(state.telegram.subscribed && state.instagram.subscribed)
      state.loading = false
    }

    builder
      .addCase(fetchSubscriptionStatus.pending,   (state) => { state.loading = true })
      .addCase(fetchSubscriptionStatus.fulfilled, setStatus)
      .addCase(fetchSubscriptionStatus.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload
      })

      .addCase(verifyTelegram.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(verifyTelegram.fulfilled, setStatus)
      .addCase(verifyTelegram.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload
      })

      .addCase(verifyInstagram.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(verifyInstagram.fulfilled, setStatus)
      .addCase(verifyInstagram.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload
      })
  },
})

export const { clearSubError, resetSubscription } = subscriptionSlice.actions
export default subscriptionSlice.reducer

// Selectors
export const selectTelegramSub  = (state) => state.subscription.telegram
export const selectInstagramSub = (state) => state.subscription.instagram
export const selectAllVerified  = (state) => state.subscription.allVerified
export const selectSubLoading   = (state) => state.subscription.loading
export const selectSubError     = (state) => state.subscription.error

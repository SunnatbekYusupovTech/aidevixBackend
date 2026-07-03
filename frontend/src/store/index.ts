import { configureStore } from '@reduxjs/toolkit'
import authReducer         from './slices/authSlice'
import courseReducer       from './slices/courseSlice'
import videoReducer        from './slices/videoSlice'
import subscriptionReducer from './slices/subscriptionSlice'
import rankingReducer      from './slices/rankingSlice'      // NUMTON + SUHROB
import userStatsReducer    from './slices/userStatsSlice'    // SUHROB + FIRDAVS

const store = configureStore({
  reducer: {
    auth:         authReducer,
    courses:      courseReducer,
    videos:       videoReducer,
    subscription: subscriptionReducer,
    ranking:      rankingReducer,       // NUMTON + SUHROB
    userStats:    userStatsReducer,     // SUHROB + FIRDAVS
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types (contain non-serializable Date values)
        ignoredActions: ['auth/loginSuccess', 'auth/checkAuthStatus/fulfilled'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export default store

// Type helpers for TypeScript migration later
export const getState  = store.getState
export const dispatch  = store.dispatch

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

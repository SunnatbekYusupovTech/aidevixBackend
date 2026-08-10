import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { videoApi } from '@api/videoApi'

// ─── Async Thunks ─────────────────────────────────────────────

export const fetchCourseVideos = createAsyncThunk(
  'videos/fetchByCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      const { data } = await videoApi.getByCourse(courseId)
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  },
)

export const fetchVideo = createAsyncThunk(
  'videos/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await videoApi.getById(id)
      return data.data
    } catch (err) {
      return rejectWithValue({
        ...err.response?.data,
        statusCode: err.response?.status,   // HTTP status kodi (401, 403, 404...)
      })
    }
  },
)

export const fetchTopVideos = createAsyncThunk(
  'videos/fetchTop',
  async (limit, { rejectWithValue }) => {
    try {
      const { data } = await videoApi.getTop(limit)
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  },
)

export const rateVideo = createAsyncThunk(
  'videos/rate',
  async ({ id, rating }, { rejectWithValue }) => {
    try {
      const { data } = await videoApi.rate(id, rating)
      return { id, rating: data.data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  },
)

export const useVideoLink = createAsyncThunk(
  'videos/useLink',
  async (linkId, { rejectWithValue }) => {
    try {
      const { data } = await videoApi.useLink(linkId)
      return data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  },
)

// ─── Slice ────────────────────────────────────────────────────

const initialState = {
  courseVideos: [],
  topVideos:    [],
  current:      null,
  videoLink:    null,
  /** mkhls HLS: { type, hlsUrl, expiresAt } — video tayyor bo'lmasa null */
  player:       null,
  /** { lastPositionSeconds } — enrollment yo'q bo'lsa null */
  progress:     null,
  /** 'pending' | 'processing' | 'ready' | 'failed' */
  streamStatus: null,
  loading:      false,
  linkLoading:  false,
  error:        null,
  ratings:      {},   // { [videoId]: { average, count, userRating } }
}

const videoSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    clearCurrentVideo: (state) => {
      state.current      = null
      state.videoLink    = null
      state.player       = null
      state.progress     = null
      state.streamStatus = null
      state.error        = null
    },
    clearVideoError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseVideos.pending,   (state) => { state.loading = true })
      .addCase(fetchCourseVideos.fulfilled, (state, action) => {
        state.loading      = false
        state.courseVideos = action.payload.videos || action.payload
      })
      .addCase(fetchCourseVideos.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload
      })

      .addCase(fetchVideo.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchVideo.fulfilled, (state, action) => {
        state.loading      = false
        state.current      = action.payload.video
        state.videoLink    = action.payload.videoLink ?? null
        state.player       = action.payload.player ?? null
        state.progress     = action.payload.progress ?? null
        state.streamStatus = action.payload.streamStatus ?? null
      })
      .addCase(fetchVideo.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload
      })

      .addCase(fetchTopVideos.fulfilled, (state, action) => {
        state.topVideos = action.payload.videos || action.payload
      })

      .addCase(rateVideo.fulfilled, (state, action) => {
        const { id, rating } = action.payload
        state.ratings[id] = rating
      })

      .addCase(useVideoLink.pending,   (state) => { state.linkLoading = true })
      .addCase(useVideoLink.fulfilled, (state) => { state.linkLoading = false })
      .addCase(useVideoLink.rejected,  (state) => { state.linkLoading = false })
  },
})

export const { clearCurrentVideo, clearVideoError } = videoSlice.actions
export default videoSlice.reducer

// Selectors
export const selectCourseVideos = (state) => state.videos.courseVideos
export const selectTopVideos    = (state) => state.videos.topVideos
export const selectCurrentVideo = (state) => state.videos.current
export const selectVideoLink    = (state) => state.videos.videoLink
export const selectVideoPlayer  = (state) => state.videos.player
export const selectVideoProgress = (state) => state.videos.progress
export const selectStreamStatus  = (state) => state.videos.streamStatus
export const selectVideoLoading = (state) => state.videos.loading
export const selectVideoError   = (state) => state.videos.error
export const selectRatings      = (state) => state.videos.ratings

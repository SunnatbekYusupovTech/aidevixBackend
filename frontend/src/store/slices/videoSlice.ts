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
  /**
   * Hozir "haqiqiy" deb hisoblanadigan `fetchVideo` so'rovining identifikatori.
   *
   * `current`/`player`/`progress` butun ilova uchun BITTA global slot. Ular
   * shartsiz yozilganda tartibsiz kelgan javob ularni zaharlashi mumkin edi:
   * dars A ochiladi (tayyor — tez javob), foydalanuvchi `pending` holatidagi
   * dars B'ga o'tadi (backend mkhls'ga borgani uchun javob sekin), keyin B
   * javob bermasdan turib Orqaga bosadi. A qayta so'ralib tez javob beradi,
   * SO'NG B'ning kechikkan javobi kelib `current`ni B qilib qo'yadi — holbuki
   * URL hamon A. `useLessonStream`ning `isOwnResponse` darvozasi endi hech
   * qachon ochilmaydi: `player` ham, `streamStatus` ham null bo'lib qoladi,
   * shuning uchun token taymeri, poll va `onError` — hammasi o'chadi, dastlabki
   * fetch effekti esa `[videoId]`ga bog'liq bo'lgani uchun qayta ishlamaydi.
   * Natija — xatosiz, logsiz, o'zi tuzalmaydigan ABADIY spinner.
   *
   * Shuning uchun javob faqat ENG OXIRGI so'rovga tegishli bo'lsagina qabul
   * qilinadi. Bu bir vaqtning o'zida `clearCurrentVideo`dan keyin kelgan
   * kechikkan javobning tozalangan darsni tiriltirib yuborishini ham yopadi.
   */
  // `as string | null` — aks holda TS boshlang'ich qiymatdan turni `null` deb
  // toraytiradi va `pending`da requestId'ni yozib bo'lmaydi.
  currentRequestId: null as string | null,
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
      // Uchayotgan so'rov endi "haqiqiy" emas: aks holda uning javobi
      // tozalangandan keyin kelib, darsni qaytadan tiriltirib qo'yardi.
      state.currentRequestId = null
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

      .addCase(fetchVideo.pending,   (state, action) => {
        state.loading = true
        state.error   = null
        state.currentRequestId = action.meta.requestId
      })
      .addCase(fetchVideo.fulfilled, (state, action) => {
        // `loading` ATAYLAB shartsiz tushiriladi: u `fetchCourseVideos` bilan
        // umumiy bayroq (kurs sahifasidagi darslar ro'yxati ham shunga qaraydi),
        // shuning uchun uni eskirgan javobda "yopilmagan" qoldirish sahifani
        // abadiy skeletonda ushlab qolardi.
        state.loading = false
        // Eskirgan javob: shundan keyin boshqa so'rov ketgan yoki
        // `clearCurrentVideo` chaqirilgan — bitta ham maydonga tegmaydi.
        if (action.meta.requestId !== state.currentRequestId) return
        state.currentRequestId = null
        state.current      = action.payload.video
        state.videoLink    = action.payload.videoLink ?? null
        state.player       = action.payload.player ?? null
        state.progress     = action.payload.progress ?? null
        state.streamStatus = action.payload.streamStatus ?? null
      })
      .addCase(fetchVideo.rejected,  (state, action) => {
        state.loading = false
        // Eskirgan so'rovning xatosi ham ekranga chiqmasligi kerak: aks holda
        // allaqachon ochilgan boshqa dars uchun yolg'on xato ekrani chizilardi.
        if (action.meta.requestId !== state.currentRequestId) return
        state.currentRequestId = null
        state.error = action.payload
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

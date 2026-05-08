import api from './axiosInstance'

export const videoApi = {
  /** GET /videos/course/:courseId - list videos of a course */
  getByCourse: (courseId) => api.get(`videos/course/${courseId}`),

  /** GET /videos/:id - get video + one-time Telegram link (auth + subscription required) */
  getById: (id) => api.get(`videos/${id}`),

  /** POST /videos/link/:linkId/use - mark one-time link as used */
  useLink: (linkId) => api.post(`videos/link/${linkId}/use`),

  /** GET /videos/top - most watched videos */
  getTop: (limit = 8) => api.get('videos/top', { params: { limit } }),

  /** POST /videos/:id/rate - rate a video (1-5 stars) */
  rate: (id, rating) => api.post(`videos/${id}/rate`, { rating }),

  /**
   * POST /enrollments/:courseId/watch/:videoId - save watch progress
   * Backend progress endpoint enrollment modulida joylashgan.
   */
  saveProgress: (courseId: string, videoId: string, watchedSeconds: number) =>
    api.post(`enrollments/${courseId}/watch/${videoId}`, { watchedSeconds }),

  /** GET /videos/:id/rating - get video rating stats */
  getRating: (id) => api.get(`videos/${id}/rating`),

  /** POST /videos (admin) */
  create: (data) => api.post('videos', data),

  /** PUT /videos/:id (admin) */
  update: (id, data) => api.put(`videos/${id}`, data),

  /** DELETE /videos/:id (admin) */
  delete: (id) => api.delete(`videos/${id}`),

  /** Discussions */
  getQuestions: (videoId: string) => api.get(`videos/${videoId}/questions`),
  askQuestion: (videoId: string, payload: { question: string; parentId?: string; mentions?: string[] }) =>
    api.post(`videos/${videoId}/questions`, payload),
  upvoteQuestion: (videoId: string, questionId: string) =>
    api.post(`videos/${videoId}/questions/${questionId}/upvote`),
}

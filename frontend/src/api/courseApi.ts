import api from './axiosInstance'

export const courseApi = {
  /** GET /courses - list with optional filters */
  getAll: (params = {}) => api.get('courses', { params }),
  // params: { category, search, sort, page, limit }

  /** GET /courses/:id */
  getById: (id) => api.get(`courses/${id}`),

  /** GET /courses/top - most viewed courses */
  getTop: (limit = 6) => api.get('courses/top', { params: { limit } }),

  /** GET /courses/categories - available categories */
  getCategories: () => api.get('courses/categories'),

  /** GET /courses/:id/recommended - similar courses (same category) */
  getRecommended: (id, limit = 4) => api.get(`courses/${id}/recommended`, { params: { limit } }),

  /** GET /courses/recommended - foydalanuvchi uchun aqlli tavsiya (auth) */
  getForUser: (limit = 6) => api.get('courses/recommended', { params: { limit } }),

  /** POST /courses (admin) */
  create: (data) => api.post('courses', data),

  /** PUT /courses/:id (admin) */
  update: (id, data) => api.put(`courses/${id}`, data),

  /** DELETE /courses/:id (admin) */
  delete: (id) => api.delete(`courses/${id}`),
}

import api from './axiosInstance'

export const jobApi = {
  list: (params?: { q?: string; level?: string; type?: string }) => api.get('jobs', { params }),
}

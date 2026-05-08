import api from './axiosInstance'

export const teamApi = {
  my: () => api.get('teams/my'),
  create: (payload: { name: string; company: string; seats?: number }) => api.post('teams', payload),
}

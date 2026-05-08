import api from './axiosInstance'

export const mentorshipApi = {
  getMentors: () => api.get('mentorship/mentors'),
  createBooking: (payload: {
    mentorId: string
    topic: string
    notes?: string
    scheduledAt: string
    durationMin?: number
  }) => api.post('mentorship/bookings', payload),
  myBookings: () => api.get('mentorship/bookings/my'),
}

import { io, Socket } from 'socket.io-client'
import api from '@/api/axiosInstance'
import { BACKEND_ORIGIN } from '@/utils/constants'

// WS backend domeniga to'g'ridan-to'g'ri ulanadi, httpOnly auth cookie esa frontend
// domenida (Vercel proxy) — shuning uchun handshake'ga qisqa muddatli socket token
// beriladi (GET /api/socket-token, cookie bilan). `auth` funksiya bo'lgani uchun har
// reconnect'da yangi token olinadi.
const fetchSocketToken = async (): Promise<string | null> => {
  try {
    const res = await api.get('socket-token')
    const token = res?.data?.token
    return typeof token === 'string' ? token : null
  } catch {
    return null
  }
}

/** Autentifikatsiyalangan socket. namespace: '' (default) yoki '/battle'. */
export const createAuthedSocket = (namespace = ''): Socket =>
  io(`${BACKEND_ORIGIN}${namespace}`, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: (cb) => {
      fetchSocketToken().then((token) => cb(token ? { token } : {}))
    },
  })

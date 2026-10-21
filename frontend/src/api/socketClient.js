
import { io } from 'socket.io-client'
import { getToken } from './httpClient'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? '/api'
    : `${window.location.protocol}//${window.location.hostname}:5000/api`)
).replace(/\/+$/, '')

// Socket.IO connects to the server origin, not the /api endpoint.
const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '')

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  auth: (callback) => {
    callback({ token: getToken() })
  },
})

import axios from 'axios'
import { emitDataChange } from '../utils/realtime'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: broadcast real-time sync on mutations & handle 401
api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || '').toLowerCase()
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const url = response.config.url || ''
      // Avoid feedback loop if it's purely WebRTC ICE candidate signaling
      const reqData = typeof response.config.data === 'string' ? response.config.data : ''
      if (!reqData.includes('webrtc_signal')) {
        emitDataChange(url)
      }
    }
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          })
          localStorage.setItem('access_token', res.data.access)
          error.config.headers.Authorization = `Bearer ${res.data.access}`
          return api(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login/', { email, password }),
  register: (data: any) =>
    api.post('/api/auth/register/', data),
  getProfile: () =>
    api.get('/api/auth/profile/'),
  updateProfile: (data: any) =>
    api.put('/api/auth/profile/', data),
  getDoctors: () =>
    api.get('/api/auth/doctors/'),
}

// Medical Records
export const medicalRecordAPI = {
  list: () => api.get('/api/medical-records/'),
  detail: (id: number) => api.get(`/api/medical-records/${id}/`),
  create: (data: any) => api.post('/api/medical-records/', data),
  update: (id: number, data: any) => api.patch(`/api/medical-records/${id}/`, data),
}

// Clinics
export const clinicAPI = {
  list: (params?: { lat?: number; lng?: number }) => api.get('/api/clinics/', { params }),
  nearby: (lat: number, lng: number, radius: number = 5000) =>
    api.get(`/api/clinics/nearby/?lat=${lat}&lng=${lng}&radius=${radius}`),
  detail: (id: number) => api.get(`/api/clinics/${id}/`),
}

// Appointments
export const appointmentAPI = {
  list: () => api.get('/api/appointments/'),
  detail: (id: number) => api.get(`/api/appointments/${id}/`),
  getDashboard: () => api.get('/api/appointments/dashboard/'),
  create: (data: any) => api.post('/api/appointments/create/', data),
  optimalSlots: (clinicId: number, date: string, patientLat?: number, patientLng?: number) => {
    let url = `/api/appointments/optimal-slots/?clinic_id=${clinicId}&date=${date}`
    if (patientLat && patientLng) {
      url += `&patient_lat=${patientLat}&patient_lng=${patientLng}`
    }
    return api.get(url)
  },
  updateStatus: (id: number, status: string, notes?: string) =>
    api.patch(`/api/appointments/${id}/status/`, notes ? { status, notes } : { status }),
  getTelehealthRoom: (id: number) =>
    api.get(`/api/appointments/${id}/telehealth-room/`),
  updateTelehealthRoom: (id: number, data: any) =>
    api.post(`/api/appointments/${id}/telehealth-room/`, data),
}

// X-ray
export const xrayAPI = {
  analyze: (formData: FormData) =>
    api.post('/api/xray/analyze/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  results: () => api.get('/api/xray/results/'),
  detail: (id: number) => api.get(`/api/xray/results/${id}/`),
  review: (id: number, data: { doctor_review: string; doctor_agrees_with_ai: boolean }) =>
    api.patch(`/api/xray/results/${id}/review/`, data),
}

// Chat
export const chatAPI = {
  send: (message: string, sessionId?: number) =>
    api.post('/api/chat/', { message, session_id: sessionId }, { timeout: 60000 }),
  sessions: () => api.get('/api/chat/sessions/'),
  sessionDetail: (id: number) => api.get(`/api/chat/sessions/${id}/`),
}

// Notifications
export const notificationAPI = {
  list: () => api.get('/api/notifications/'),
  markRead: (id: number) => api.patch(`/api/notifications/${id}/read/`),
  markAllRead: () => api.post('/api/notifications/read-all/'),
}

export default api

import axios from 'axios'

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

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
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
  getDoctors: () =>
    api.get('/api/auth/doctors/'),
}

// Clinics
export const clinicAPI = {
  list: () => api.get('/api/clinics/'),
  nearby: (lat: number, lng: number, radius: number = 5000) =>
    api.get(`/api/clinics/nearby/?lat=${lat}&lng=${lng}&radius=${radius}`),
  detail: (id: number) => api.get(`/api/clinics/${id}/`),
}

// Appointments
export const appointmentAPI = {
  list: () => api.get('/api/appointments/'),
  getDashboard: () => api.get('/api/appointments/dashboard/'),
  create: (data: any) => api.post('/api/appointments/create/', data),
  optimalSlots: (clinicId: number, date: string, patientLat?: number, patientLng?: number) => {
    let url = `/api/appointments/optimal-slots/?clinic_id=${clinicId}&date=${date}`
    if (patientLat && patientLng) {
      url += `&patient_lat=${patientLat}&patient_lng=${patientLng}`
    }
    return api.get(url)
  },
  updateStatus: (id: number, status: string) =>
    api.patch(`/api/appointments/${id}/status/`, { status }),
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

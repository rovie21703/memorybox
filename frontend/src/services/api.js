import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/2ndanniversary/api'
export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || 'http://localhost/2ndanniversary/uploads'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/?action=login', data),
  register: (data) => api.post('/auth/?action=register', data),
  logout: () => api.post('/auth/?action=logout'),
  getMe: () => api.get('/auth/?action=me'),
  getPartner: () => api.get('/auth/?action=partner'),
  updateProfile: (data) => api.put('/auth/?action=profile', data),
  uploadAvatar: (formData) => api.post('/auth/?action=upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updatePassword: (data) => api.put('/auth/?action=password', data),
  linkPartner: (data) => api.put('/auth/?action=link-partner', data),
}

// Photos API
export const photosAPI = {
  getPhotos: (params) => api.get('/photos/', { params: { action: 'list', ...params } }),
  getPhoto: (id) => api.get(`/photos/?action=single&id=${id}`),
  getFavorites: () => api.get('/photos/?action=favorites'),
  getByDate: () => api.get('/photos/?action=by-date'),
  getByAnniversary: () => api.get('/photos/?action=by-anniversary'),
  getTimeline: () => api.get('/photos/?action=timeline'),
  getStats: () => api.get('/photos/?action=stats'),
  upload: (formData) => api.post('/photos/?action=upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/photos/?action=update&id=${id}`, data),
  toggleFavorite: (id) => api.put(`/photos/?action=favorite&id=${id}`),
  delete: (id) => api.delete(`/photos/?id=${id}`),
  addReaction: (data) => api.post('/photos/?action=reaction', data),
  addComment: (data) => api.post('/photos/?action=comment', data),
}

// Memories API
export const memoriesAPI = {
  getMemories: (params) => api.get('/memories/', { params: { action: 'list', ...params } }),
  getMemory: (id) => api.get(`/memories/?action=single&id=${id}`),
  getOnThisDay: () => api.get('/memories/?action=on-this-day'),
  getMilestones: () => api.get('/memories/?action=milestones'),
  getTimeline: () => api.get('/memories/?action=timeline'),
  create: (data) => api.post('/memories/?action=create', data),
  createMilestone: (data) => api.post('/memories/?action=milestone', data),
  update: (id, data) => api.put(`/memories/?id=${id}`, data),
  delete: (id) => api.delete(`/memories/?id=${id}`),
}

// Messages API
export const messagesAPI = {
  getConversation: (params) => api.get('/messages/', { params: { action: 'conversation', ...params } }),
  getUnread: () => api.get('/messages/?action=unread'),
  send: (data) => api.post('/messages/?action=send', data),
  sendHeart: () => api.post('/messages/?action=heart'),
  markAsRead: () => api.put('/messages/?action=read'),
  delete: (id) => api.delete(`/messages/?id=${id}`),
  // Love notes
  getLoveNotes: () => api.get('/messages/?action=love-notes'),
  getLoveNote: (id) => api.get(`/messages/?action=love-note&id=${id}`),
  sendLoveNote: (data) => api.post('/messages/?action=love-note', data),
  openLoveNote: (id) => api.put(`/messages/?action=open-note&id=${id}`),
}

// Anniversaries API
export const anniversariesAPI = {
  getAll: () => api.get('/anniversaries/?action=list'),
  get: (id) => api.get(`/anniversaries/?action=single&id=${id}`),
  getCurrent: () => api.get('/anniversaries/?action=current'),
  getCountdowns: () => api.get('/anniversaries/?action=countdowns'),
  create: (data) => api.post('/anniversaries/?action=create', data),
  createCountdown: (data) => api.post('/anniversaries/?action=countdown', data),
  update: (id, data) => api.put(`/anniversaries/?id=${id}`, data),
  delete: (id) => api.delete(`/anniversaries/?id=${id}`),
  deleteCountdown: (id) => api.delete(`/anniversaries/?action=countdown&id=${id}`),
}

export default api

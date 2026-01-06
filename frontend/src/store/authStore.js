import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      partner: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await authAPI.login(credentials)
          const { user, partner, token } = response.data.data
          
          localStorage.setItem('token', token)
          
          set({
            user,
            partner,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            message: error.response?.data?.message || 'Login failed' 
          }
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await authAPI.register(userData)
          const { user, token } = response.data.data
          
          localStorage.setItem('token', token)
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            message: error.response?.data?.message || 'Registration failed' 
          }
        }
      },
      
      logout: () => {
        localStorage.removeItem('token')
        set({
          user: null,
          partner: null,
          token: null,
          isAuthenticated: false,
        })
      },
      
      fetchUser: async () => {
        try {
          const response = await authAPI.getMe()
          set({ user: response.data.data })
        } catch (error) {
          console.error('Failed to fetch user:', error)
        }
      },
      
      fetchPartner: async () => {
        try {
          const response = await authAPI.getPartner()
          set({ partner: response.data.data })
        } catch (error) {
          console.error('Failed to fetch partner:', error)
        }
      },
      
      updateProfile: async (data) => {
        try {
          const response = await authAPI.updateProfile(data)
          set({ user: response.data.data })
          return { success: true }
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Update failed' 
          }
        }
      },
      
      linkPartner: async (partnerUsername) => {
        try {
          const response = await authAPI.linkPartner({ partner_username: partnerUsername })
          set({ partner: response.data.data })
          return { success: true, message: response.data.message }
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to link partner' 
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore

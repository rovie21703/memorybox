import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  User, Heart, Camera, Link2, Lock, LogOut,
  Save, Check, X, AlertCircle, Settings, Bell
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { authAPI, photosAPI, FILE_BASE_URL } from '../services/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function Profile() {
  const { user, updateProfile, logout } = useAuthStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    display_name: user?.display_name || '',
    bio: user?.bio || '',
  })
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  
  // Partner linking
  const [partnerCode, setPartnerCode] = useState('')
  const [partnerStats, setPartnerStats] = useState(null)
  
  // User stats
  const [stats, setStats] = useState({
    total_photos: 0,
    favorites: 0,
    memories: 0,
    messages: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await photosAPI.getStats()
      setStats(res.data.data || stats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('avatar', file)

    const toastId = toast.loading('Uploading avatar...')

    try {
      const res = await authAPI.uploadAvatar(formData)
      // Update user in store
      useAuthStore.setState({ user: res.data.data })
      toast.success('Avatar updated! ✨', { id: toastId })
    } catch (error) {
      toast.error('Failed to upload avatar', { id: toastId })
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await updateProfile(profileForm)
      toast.success('Profile updated! ✨')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setSaving(true)
    
    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      
      toast.success('Password changed successfully!')
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleLinkPartner = async (e) => {
    e.preventDefault()
    
    if (!partnerCode) {
      toast.error('Please enter a partner code')
      return
    }
    
    setSaving(true)
    
    try {
      const { linkPartner } = useAuthStore.getState()
      await linkPartner(partnerCode)
      toast.success('Partner linked! 💕')
      setPartnerCode('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to link partner')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'partner', label: 'Partner', icon: Heart },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="relative inline-block">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-full bg-gradient-love mx-auto flex items-center justify-center mb-4 overflow-hidden cursor-pointer group relative"
            onClick={handleAvatarClick}
          >
            {user?.avatar ? (
              <img
                src={`${FILE_BASE_URL}/${user.avatar}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">
                {user?.display_name?.charAt(0) || user?.username?.charAt(0) || '💚'}
              </span>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            className="hidden"
            accept="image/*"
          />
        </div>
        
        <h1 className="text-2xl font-display font-bold text-gray-800">
          {user?.display_name || user?.username}
        </h1>
        <p className="text-gray-500">@{user?.username}</p>
        
        {user?.partner && (
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm">
            <Heart className="w-4 h-4 fill-pink-500" />
            Linked with {user.partner.display_name || user.partner.username}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{stats.total_photos}</p>
          <p className="text-sm text-gray-500">Photos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{stats.favorites}</p>
          <p className="text-sm text-gray-500">Favorites</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{stats.memories || 0}</p>
          <p className="text-sm text-gray-500">Memories</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{stats.messages || 0}</p>
          <p className="text-sm text-gray-500">Messages</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'text-mint-600 border-b-2 border-mint-500 bg-mint-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleProfileSubmit}
              className="space-y-4"
            >
              <div>
                <label className="input-label">Username</label>
                <input
                  type="text"
                  className="input"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                />
              </div>
              
              <div>
                <label className="input-label">Display Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your display name"
                  value={profileForm.display_name}
                  onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="input-label">Bio</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Tell your story..."
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                />
              </div>
              
              <button 
                type="submit" 
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-mint-500" />
                  Change Password
                </h3>
                
                <div>
                  <label className="input-label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="input-label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="input-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn-primary w-full"
                  disabled={saving}
                >
                  Update Password
                </button>
              </form>
              
              <div className="pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-800 flex items-center gap-2 mb-4">
                  <LogOut className="w-5 h-5 text-red-500" />
                  Session
                </h3>
                
                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-xl font-medium 
                           hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </motion.div>
          )}

          {/* Partner Tab */}
          {activeTab === 'partner' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {user?.partner ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-love mx-auto flex items-center justify-center mb-4">
                    <Heart className="w-10 h-10 text-white fill-white" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-800">You're linked! 💕</h3>
                  <p className="text-gray-500 mt-2">
                    You and {user.partner.display_name || user.partner.username} are partners
                  </p>
                  
                  <div className="card p-4 mt-6 text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center">
                        <span className="text-xl">
                          {user.partner.display_name?.charAt(0) || user.partner.username?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {user.partner.display_name || user.partner.username}
                        </p>
                        <p className="text-sm text-gray-500">@{user.partner.username}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-pink-100 mx-auto flex items-center justify-center mb-4">
                      <Link2 className="w-8 h-8 text-pink-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">Link Your Partner</h3>
                    <p className="text-gray-500 mt-1">
                      Connect your account with your partner to share memories together
                    </p>
                  </div>
                  
                  {/* Your code */}
                  <div className="card p-4 bg-mint-50 border-mint-200">
                    <p className="text-sm text-gray-600 mb-2">Your Username (Share this)</p>
                    <p className="text-2xl font-mono font-bold text-mint-600 text-center">
                      {user?.username || 'LOADING...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Share this username with your partner to link accounts
                    </p>
                  </div>
                  
                  {/* Enter partner's code */}
                  <form onSubmit={handleLinkPartner} className="space-y-4">
                    <div>
                      <label className="input-label">Enter Partner's Username</label>
                      <input
                        type="text"
                        className="input text-center text-lg font-mono"
                        placeholder="partner_username"
                        value={partnerCode}
                        onChange={(e) => setPartnerCode(e.target.value)}
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      disabled={saving}
                    >
                      <Heart className="w-5 h-5" />
                      Link Partner
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4 space-y-2">
        <button 
          onClick={() => navigate('/upload')}
          className="w-full py-3 px-4 bg-gray-50 hover:bg-mint-50 rounded-xl font-medium 
                   text-gray-600 hover:text-mint-700 transition-colors flex items-center gap-3"
        >
          <Camera className="w-5 h-5" />
          Upload New Photos
        </button>
        
        <button 
          onClick={() => navigate('/gallery')}
          className="w-full py-3 px-4 bg-gray-50 hover:bg-sky-50 rounded-xl font-medium 
                   text-gray-600 hover:text-sky-700 transition-colors flex items-center gap-3"
        >
          <Camera className="w-5 h-5" />
          View Gallery
        </button>
      </div>
    </div>
  )
}

export default Profile

import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, Image, Heart, MessageCircle, Calendar, 
  Upload, Clock, User, LogOut, Menu, X, Mail, Bell, Pencil
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { messagesAPI } from '../services/api'

function Layout() {
  const { user, partner, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await messagesAPI.getUnread()
        setUnreadCount(response.data.data.total)
      } catch (error) {
        console.error('Failed to fetch unread:', error)
      }
    }
    
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/gallery', icon: Image, label: 'Gallery' },
    { path: '/memories', icon: Heart, label: 'Memories' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadCount },
    { path: '/love-notes', icon: Mail, label: 'Love Notes' },
    { path: '/anniversaries', icon: Calendar, label: 'Anniversaries' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/heart-canvas', icon: Pencil, label: 'Heart Canvas' },
  ]

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white/80 backdrop-blur-lg border-r border-mint-100 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-mint-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-love flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg gradient-text">MemoryBox</h1>
              <p className="text-xs text-gray-500">💚 Together Forever 💙</p>
            </div>
          </div>
        </div>

        {/* User & Partner */}
        <div className="p-4 border-b border-mint-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-soft">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-mint-300 flex items-center justify-center text-white text-sm font-medium border-2 border-white">
                {user?.display_name?.[0] || 'U'}
              </div>
              {partner && (
                <div className="w-8 h-8 rounded-full bg-sky-300 flex items-center justify-center text-white text-sm font-medium border-2 border-white">
                  {partner.display_name?.[0] || 'P'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user?.display_name}
                {partner && <span className="text-mint-500"> & {partner.display_name}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-love text-white shadow-soft'
                    : 'text-gray-600 hover:bg-mint-50 hover:text-mint-600'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-mint-100 space-y-2">
          <NavLink
            to="/upload"
            className="flex items-center justify-center gap-2 w-full btn-primary"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Memory</span>
          </NavLink>
          
          <div className="flex gap-2">
            <NavLink
              to="/profile"
              className="flex-1 flex items-center justify-center gap-2 btn-secondary"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </NavLink>
            <button
              onClick={logout}
              className="flex items-center justify-center p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-4 transition-all duration-200 ${
        isMobileMenuOpen ? 'bg-transparent' : 'bg-white/80 backdrop-blur-lg border-b border-mint-100'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-love flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-display font-bold gradient-text">MemoryBox</span>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <NavLink to="/messages" className="relative p-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            </NavLink>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-mint-600"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-white/95 backdrop-blur-lg z-30 overflow-y-auto pt-16"
          >
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-love text-white'
                        : 'text-gray-600 hover:bg-mint-50'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
              
              <hr className="my-4 border-mint-100" />
              
              <NavLink
                to="/upload"
                className="flex items-center gap-3 px-4 py-4 rounded-xl bg-gradient-love text-white"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload Memory</span>
              </NavLink>
              
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-gray-600 hover:bg-mint-50"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Profile</span>
              </NavLink>
              
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-red-500 hover:bg-red-50 w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-mint-100 z-40 flex items-center justify-around px-2">
        {[
          { path: '/', icon: Home },
          { path: '/gallery', icon: Image },
          { path: '/upload', icon: Upload },
          { path: '/messages', icon: MessageCircle, badge: unreadCount },
          { path: '/memories', icon: Heart },
        ].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                isActive
                  ? 'bg-gradient-love text-white shadow-soft'
                  : 'text-gray-400 hover:text-mint-600'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout

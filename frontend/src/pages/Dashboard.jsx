import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Heart, Image, Calendar, Clock, MessageCircle, 
  Sparkles, ArrowRight, Camera, Star, TrendingUp 
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { photosAPI, memoriesAPI, anniversariesAPI, FILE_BASE_URL } from '../services/api'
import { format, differenceInDays, parseISO } from 'date-fns'

function Dashboard() {
  const { user, partner } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [onThisDay, setOnThisDay] = useState([])
  const [currentAnniversary, setCurrentAnniversary] = useState(null)
  const [recentPhotos, setRecentPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, onThisDayRes, anniversaryRes, photosRes] = await Promise.all([
          photosAPI.getStats(),
          memoriesAPI.getOnThisDay(),
          anniversariesAPI.getCurrent(),
          photosAPI.getPhotos({ limit: 6 }),
        ])

        setStats(statsRes.data.data)
        setOnThisDay(onThisDayRes.data.data || [])
        setCurrentAnniversary(anniversaryRes.data.data)
        setRecentPhotos(photosRes.data.data || [])
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getDaysUntilAnniversary = () => {
    if (!currentAnniversary) return null
    const days = currentAnniversary.days_until
    if (days === 0) return "Today! 🎉"
    if (days < 0) return `${Math.abs(days)} days ago`
    return `${days} days to go`
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={item} className="card p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-800">
              Welcome back, <span className="gradient-text">{user?.display_name}</span>! 💚
            </h1>
            {partner && (
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
                Together with {partner.display_name}
              </p>
            )}
          </div>
          
          <Link to="/upload" className="btn-primary flex items-center gap-2 self-start">
            <Camera className="w-5 h-5" />
            Add Memories
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Image, label: 'Photos', value: stats?.total_photos || 0, color: 'mint' },
          { icon: Star, label: 'Favorites', value: stats?.favorites || 0, color: 'yellow' },
          { icon: Heart, label: 'Memories', value: stats?.memories || 0, color: 'pink' },
          { icon: MessageCircle, label: 'Messages', value: stats?.messages || 0, color: 'sky' },
        ].map((stat, index) => (
          <div key={index} className="card p-4 lg:p-6">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Anniversary Countdown */}
      {currentAnniversary && (
        <motion.div variants={item}>
          <div className="card overflow-hidden">
            <div className="bg-gradient-love p-6 lg:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-white/80" />
                    <span className="text-white/80 text-sm font-medium">
                      {currentAnniversary.days_until >= 0 ? 'Upcoming Anniversary' : 'Recent Anniversary'}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                    {currentAnniversary.title}
                  </h2>
                  <p className="text-white/80 mt-1">
                    {format(parseISO(currentAnniversary.anniversary_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                
                <div className="text-center md:text-right">
                  <p className="text-4xl md:text-5xl font-bold text-white">
                    {Math.abs(currentAnniversary.days_until)}
                  </p>
                  <p className="text-white/80">{getDaysUntilAnniversary()}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-between bg-white/50">
              <span className="text-sm text-gray-600">
                <span className="font-medium">{currentAnniversary.photo_count || 0}</span> photos in this album
              </span>
              <Link 
                to={`/anniversaries`} 
                className="text-mint-600 hover:text-mint-700 text-sm font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-mint-500" />
              On This Day
            </h2>
          </div>
          
          <div className="space-y-4">
            {onThisDay.map((memory, index) => (
              <div key={index} className="card p-4">
                <p className="text-sm font-medium text-mint-600 mb-2">
                  {memory.years_ago} year{memory.years_ago > 1 ? 's' : ''} ago
                </p>
                
                {memory.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {memory.photos.slice(0, 4).map((photo, pIndex) => (
                      <Link
                        key={pIndex}
                        to={`/photo/${photo.id}`}
                        className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden"
                      >
                        <img
                          src={`${FILE_BASE_URL}/${photo.thumbnail_path || photo.file_path}`}
                          alt=""
                          className="w-full h-full object-cover hover:scale-110 transition-transform"
                        />
                      </Link>
                    ))}
                  </div>
                )}
                
                {memory.memories.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {memory.memories.map((mem, mIndex) => (
                      <div key={mIndex} className="bg-mint-50 rounded-lg p-3">
                        <p className="font-medium text-gray-800">{mem.title}</p>
                        {mem.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mem.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Photos */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Photos</h2>
          <Link to="/gallery" className="text-mint-600 hover:text-mint-700 text-sm font-medium flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {recentPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/photo/${photo.id}`} className="photo-card block">
                <img
                  src={`${FILE_BASE_URL}/${photo.thumbnail_path || photo.file_path}`}
                  alt={photo.caption || ''}
                  className="w-full h-full object-cover"
                />
                <div className="photo-overlay">
                  {photo.is_favorite && (
                    <Heart className="w-4 h-4 text-white fill-white" />
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
          
          {recentPhotos.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-mint-100 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-mint-400" />
              </div>
              <p className="text-gray-500">No photos yet</p>
              <Link to="/upload" className="text-mint-600 hover:text-mint-700 font-medium mt-2 inline-block">
                Upload your first photo
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/upload', icon: Camera, label: 'Upload Memory', color: 'mint' },
            { to: '/messages', icon: MessageCircle, label: 'Send Message', color: 'sky' },
            { to: '/love-notes', icon: Heart, label: 'Write Love Note', color: 'pink' },
            { to: '/memories', icon: Star, label: 'Add Memory', color: 'yellow' },
          ].map((action, index) => (
            <Link key={index} to={action.to} className="card-hover p-4 text-center">
              <div className={`w-12 h-12 rounded-xl bg-${action.color}-100 flex items-center justify-center mx-auto mb-3`}>
                <action.icon className={`w-6 h-6 text-${action.color}-500`} />
              </div>
              <p className="font-medium text-gray-800">{action.label}</p>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Dashboard

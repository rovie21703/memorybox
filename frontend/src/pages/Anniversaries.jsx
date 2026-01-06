import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Plus, Heart, Clock, Image, 
  ChevronRight, X, Trash2, Edit3, Star
} from 'lucide-react'
import { anniversariesAPI, FILE_BASE_URL } from '../services/api'
import { format, parseISO, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

function Anniversaries() {
  const [anniversaries, setAnniversaries] = useState([])
  const [countdowns, setCountdowns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalType, setModalType] = useState('anniversary') // anniversary or countdown
  const [formData, setFormData] = useState({
    title: '',
    anniversary_date: '',
    description: '',
    year_number: 1,
    target_date: '',
    icon: '💚',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [annRes, countRes] = await Promise.all([
        anniversariesAPI.getAll(),
        anniversariesAPI.getCountdowns(),
      ])
      setAnniversaries(annRes.data.data || [])
      setCountdowns(countRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch anniversaries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnniversary = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.anniversary_date) {
      toast.error('Please fill in title and date')
      return
    }

    try {
      await anniversariesAPI.create(formData)
      toast.success('Anniversary added! 🎉')
      setShowCreateModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error('Failed to create anniversary')
    }
  }

  const handleCreateCountdown = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.target_date) {
      toast.error('Please fill in title and date')
      return
    }

    try {
      await anniversariesAPI.createCountdown(formData)
      toast.success('Countdown created! ⏰')
      setShowCreateModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error('Failed to create countdown')
    }
  }

  const handleDeleteAnniversary = async (id) => {
    if (!confirm('Delete this anniversary?')) return
    
    try {
      await anniversariesAPI.delete(id)
      toast.success('Anniversary deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleDeleteCountdown = async (id) => {
    if (!confirm('Delete this countdown?')) return
    
    try {
      await anniversariesAPI.deleteCountdown(id)
      toast.success('Countdown deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      anniversary_date: '',
      description: '',
      year_number: 1,
      target_date: '',
      icon: '💚',
    })
  }

  const openCreateModal = (type) => {
    setModalType(type)
    resetForm()
    setShowCreateModal(true)
  }

  const formatCountdown = (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const icons = ['💚', '💙', '❤️', '💜', '🌈', '✨', '🎉', '🌸', '⭐', '🏠']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-header">Anniversaries</h1>
          <p className="text-gray-500 mt-1">Celebrate every milestone together 🎉</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => openCreateModal('countdown')}
            className="btn-secondary flex items-center gap-2"
          >
            <Clock className="w-5 h-5" />
            Add Countdown
          </button>
          <button
            onClick={() => openCreateModal('anniversary')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Anniversary
          </button>
        </div>
      </div>

      {/* Countdowns */}
      {countdowns.length > 0 && (
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-mint-500" />
            Upcoming Events
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countdowns.map((countdown, index) => (
              <motion.div
                key={countdown.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-5 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{countdown.icon || '💚'}</span>
                    <div>
                      <h3 className="font-medium text-gray-800">{countdown.title}</h3>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(countdown.target_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteCountdown(countdown.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg 
                               opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-3xl font-bold gradient-text">
                    {formatCountdown(countdown.seconds_until)}
                  </p>
                  <p className="text-sm text-gray-500">remaining</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Anniversaries Timeline */}
      <div>
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-mint-500" />
          Our Anniversaries
        </h2>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-6 bg-mint-100 rounded w-1/3 mb-2" />
                <div className="h-4 bg-mint-50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : anniversaries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-love flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">No anniversaries yet</h3>
            <p className="text-gray-500 mb-4">Add your first anniversary to get started!</p>
            <button
              onClick={() => openCreateModal('anniversary')}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Anniversary
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-mint-300 via-sky-300 to-pink-300" />
            
            {anniversaries.map((anniversary, index) => {
              const daysUntil = differenceInDays(parseISO(anniversary.anniversary_date), new Date())
              const isPast = daysUntil < 0
              const isToday = daysUntil === 0
              
              return (
                <motion.div
                  key={anniversary.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-20 pb-8 group"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-5 w-7 h-7 rounded-full flex items-center justify-center text-white font-medium text-sm
                    ${isToday ? 'bg-gradient-love animate-pulse-soft shadow-glow' : 
                      isPast ? 'bg-gray-300' : 'bg-gradient-love'}`}>
                    {anniversary.year_number}
                  </div>
                  
                  <div className={`card overflow-hidden hover:shadow-lg transition-all ${
                    isToday ? 'ring-2 ring-mint-400 shadow-glow' : ''
                  }`}>
                    {/* Cover photo area */}
                    {anniversary.cover_photo ? (
                      <div className="h-32 bg-gradient-love overflow-hidden">
                        <img 
                          src={`${FILE_BASE_URL}/${anniversary.cover_photo}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-24 bg-gradient-love flex items-center justify-center">
                        <Heart className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">{anniversary.title}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            {format(parseISO(anniversary.anniversary_date), 'MMMM d, yyyy')}
                          </p>
                          
                          {anniversary.description && (
                            <p className="text-gray-600 mt-3">{anniversary.description}</p>
                          )}
                        </div>
                        
                        {/* Status badge */}
                        <div className={`badge ${
                          isToday ? 'bg-mint-100 text-mint-700' :
                          isPast ? 'bg-gray-100 text-gray-600' :
                          'bg-sky-100 text-sky-700'
                        }`}>
                          {isToday ? '🎉 Today!' : 
                           isPast ? `${Math.abs(daysUntil)} days ago` :
                           `In ${daysUntil} days`}
                        </div>
                      </div>
                      
                      {/* Photo count */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Image className="w-4 h-4" />
                          {anniversary.photo_count || 0} photos
                        </div>
                        
                        <button
                          onClick={() => handleDeleteAnniversary(anniversary.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg 
                                     opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-gray-800">
                  {modalType === 'anniversary' ? 'Add Anniversary' : 'Add Countdown'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form 
                onSubmit={modalType === 'anniversary' ? handleCreateAnniversary : handleCreateCountdown} 
                className="space-y-4"
              >
                <div>
                  <label className="input-label">Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={modalType === 'anniversary' ? 'Our 2nd Anniversary' : 'Trip to Paris'}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">
                    {modalType === 'anniversary' ? 'Anniversary Date' : 'Event Date & Time'}
                  </label>
                  {modalType === 'anniversary' ? (
                    <input
                      type="date"
                      className="input"
                      value={formData.anniversary_date}
                      onChange={(e) => setFormData({ ...formData, anniversary_date: e.target.value })}
                    />
                  ) : (
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                  )}
                </div>

                {modalType === 'anniversary' && (
                  <div>
                    <label className="input-label">Year Number</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={formData.year_number}
                      onChange={(e) => setFormData({ ...formData, year_number: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                {modalType === 'countdown' && (
                  <div>
                    <label className="input-label">Icon</label>
                    <div className="flex flex-wrap gap-2">
                      {icons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`text-2xl p-2 rounded-lg transition-all ${
                            formData.icon === icon
                              ? 'bg-mint-100 ring-2 ring-mint-400'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="input-label">Description (optional)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Add some notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="w-full btn-primary">
                  {modalType === 'anniversary' ? 'Add Anniversary' : 'Create Countdown'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Anniversaries

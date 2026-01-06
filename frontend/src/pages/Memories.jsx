import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, Plus, Calendar, Sparkles, Clock, 
  Smile, Star, Sun, Mountain, Gift, X, Edit3, Trash2
} from 'lucide-react'
import { memoriesAPI, photosAPI, FILE_BASE_URL } from '../services/api'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const moodIcons = {
  happy: { icon: Smile, color: 'yellow' },
  romantic: { icon: Heart, color: 'pink' },
  adventurous: { icon: Mountain, color: 'mint' },
  peaceful: { icon: Sun, color: 'sky' },
  grateful: { icon: Star, color: 'purple' },
  excited: { icon: Gift, color: 'orange' },
}

function Memories() {
  const [memories, setMemories] = useState([])
  const [milestones, setMilestones] = useState([])
  const [onThisDay, setOnThisDay] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState('memories')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    memory_date: new Date().toISOString().split('T')[0],
    mood: 'happy',
    is_milestone: false,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [memoriesRes, milestonesRes, onThisDayRes] = await Promise.all([
        memoriesAPI.getMemories(),
        memoriesAPI.getMilestones(),
        memoriesAPI.getOnThisDay(),
      ])
      
      setMemories(memoriesRes.data.data || [])
      setMilestones(milestonesRes.data.data || [])
      setOnThisDay(onThisDayRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch memories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMemory = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.memory_date) {
      toast.error('Please fill in title and date')
      return
    }

    try {
      await memoriesAPI.create(formData)
      toast.success('Memory created! 💭')
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        memory_date: new Date().toISOString().split('T')[0],
        mood: 'happy',
        is_milestone: false,
      })
      fetchData()
    } catch (error) {
      toast.error('Failed to create memory')
    }
  }

  const handleDeleteMemory = async (id) => {
    if (!confirm('Delete this memory?')) return
    
    try {
      await memoriesAPI.delete(id)
      toast.success('Memory deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete memory')
    }
  }

  const tabs = [
    { id: 'memories', label: 'All Memories', icon: Heart },
    { id: 'milestones', label: 'Milestones', icon: Star },
    { id: 'on-this-day', label: 'On This Day', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-header">Memories</h1>
          <p className="text-gray-500 mt-1">Cherish every moment together 💚</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus className="w-5 h-5" />
          Add Memory
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-love text-white shadow-soft'
                : 'bg-white text-gray-600 hover:bg-mint-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-mint-100 rounded w-1/3 mb-3" />
              <div className="h-4 bg-mint-50 rounded w-full mb-2" />
              <div className="h-4 bg-mint-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'memories' && (
            <motion.div
              key="memories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {memories.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-mint-100 flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-10 h-10 text-mint-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">No memories yet</h3>
                  <p className="text-gray-500">Start recording your beautiful moments!</p>
                </div>
              ) : (
                memories.map((memory, index) => {
                  const mood = moodIcons[memory.mood] || moodIcons.happy
                  const MoodIcon = mood.icon
                  
                  return (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-${mood.color}-100 flex items-center justify-center flex-shrink-0`}>
                            <MoodIcon className={`w-6 h-6 text-${mood.color}-500`} />
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium text-gray-800">{memory.title}</h3>
                            
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(memory.memory_date), 'MMMM d, yyyy')}
                              </span>
                              
                              {memory.is_milestone && (
                                <span className="badge-mint">
                                  <Star className="w-3 h-3 mr-1" />
                                  Milestone
                                </span>
                              )}
                            </div>
                            
                            {memory.description && (
                              <p className="text-gray-600 mt-3">{memory.description}</p>
                            )}
                            
                            {/* Photos */}
                            {memory.photos && memory.photos.length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {memory.photos.slice(0, 4).map((photo, i) => (
                                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden">
                                    <img
                                      src={`${FILE_BASE_URL}/${photo}`}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteMemory(memory.id)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          )}

          {activeTab === 'milestones' && (
            <motion.div
              key="milestones"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {milestones.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-10 h-10 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">No milestones yet</h3>
                  <p className="text-gray-500">Mark your special achievements!</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-mint-300 to-sky-300" />
                  
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative pl-16 pb-8"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-3.5 w-5 h-5 rounded-full bg-gradient-love border-4 border-white shadow-md" />
                      
                      <div className="card p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{milestone.icon || '💚'}</span>
                          <div>
                            <h3 className="font-medium text-gray-800">{milestone.title}</h3>
                            <p className="text-sm text-gray-500">
                              {format(parseISO(milestone.milestone_date), 'MMMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        
                        {milestone.description && (
                          <p className="text-gray-600 text-sm">{milestone.description}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'on-this-day' && (
            <motion.div
              key="on-this-day"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="card p-6 bg-gradient-love text-white text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2" />
                <h2 className="text-2xl font-display font-bold">
                  {format(new Date(), 'MMMM d')}
                </h2>
                <p className="opacity-80">See what happened on this day in previous years</p>
              </div>
              
              {onThisDay.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No memories from this day yet</p>
                  <p className="text-sm text-gray-400 mt-1">Keep adding memories to see them here next year!</p>
                </div>
              ) : (
                onThisDay.map((yearData, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-mint-500" />
                      {yearData.years_ago} year{yearData.years_ago > 1 ? 's' : ''} ago
                    </h3>
                    
                    {yearData.photos.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {yearData.photos.map((photo) => (
                          <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                            <img
                              src={`${FILE_BASE_URL}/${photo.thumbnail_path || photo.file_path}`}
                              alt=""
                              className="w-full h-full object-cover hover:scale-110 transition-transform"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {yearData.memories.map((memory) => (
                      <div key={memory.id} className="card p-4">
                        <h4 className="font-medium text-gray-800">{memory.title}</h4>
                        {memory.description && (
                          <p className="text-sm text-gray-500 mt-1">{memory.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Create Memory Modal */}
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
                <h2 className="text-xl font-display font-bold text-gray-800">New Memory</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMemory} className="space-y-4">
                <div>
                  <label className="input-label">Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What's this memory about?"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Tell the story..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.memory_date}
                    onChange={(e) => setFormData({ ...formData, memory_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Mood</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(moodIcons).map(([mood, { icon: Icon, color }]) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setFormData({ ...formData, mood })}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          formData.mood === mood
                            ? `bg-${color}-100 ring-2 ring-${color}-400`
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 text-${color}-500`} />
                        <span className="text-xs capitalize text-gray-600">{mood}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_milestone}
                    onChange={(e) => setFormData({ ...formData, is_milestone: e.target.checked })}
                    className="w-5 h-5 rounded border-mint-300 text-mint-500 focus:ring-mint-300"
                  />
                  <span className="text-sm text-gray-700">Mark as milestone ⭐</span>
                </label>

                <button type="submit" className="w-full btn-primary">
                  Create Memory
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Memories

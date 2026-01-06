import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, Heart, Sparkles, Send, X, Clock, 
  Eye, EyeOff, Gift, Feather
} from 'lucide-react'
import { messagesAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const noteTypes = [
  { id: 'appreciation', label: 'Appreciation', icon: Heart, color: 'pink' },
  { id: 'love_letter', label: 'Love Letter', icon: Feather, color: 'red' },
  { id: 'promise', label: 'Promise', icon: Sparkles, color: 'purple' },
  { id: 'memory', label: 'Memory', icon: Clock, color: 'sky' },
  { id: 'random', label: 'Random Love', icon: Gift, color: 'mint' },
]

const bgColors = [
  { color: '#a7f3d0', name: 'Mint' },
  { color: '#a5d8ff', name: 'Sky' },
  { color: '#ffc8dd', name: 'Pink' },
  { color: '#e2d9f3', name: 'Lavender' },
  { color: '#ffd6ba', name: 'Peach' },
  { color: '#fef9ef', name: 'Cream' },
]

function LoveNotes() {
  const { partner } = useAuthStore()
  const [notes, setNotes] = useState({ received: [], sent: [] })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [activeTab, setActiveTab] = useState('received')
  const [formData, setFormData] = useState({
    content: '',
    note_type: 'random',
    background_color: '#a7f3d0',
    deliver_at: '',
  })

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await messagesAPI.getLoveNotes()
      setNotes(response.data.data || { received: [], sent: [] })
    } catch (error) {
      console.error('Failed to fetch love notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenNote = async (note) => {
    if (!note.is_opened && activeTab === 'received') {
      try {
        await messagesAPI.openLoveNote(note.id)
        // Update local state
        setNotes(prev => ({
          ...prev,
          received: prev.received.map(n => 
            n.id === note.id ? { ...n, is_opened: true } : n
          )
        }))
      } catch (error) {
        console.error('Failed to open note:', error)
      }
    }
    setSelectedNote(note)
  }

  const handleCreateNote = async (e) => {
    e.preventDefault()
    
    if (!formData.content.trim()) {
      toast.error('Please write something 💌')
      return
    }

    if (!partner) {
      toast.error('Please link your partner first')
      return
    }

    try {
      await messagesAPI.sendLoveNote(formData)
      toast.success('Love note sent! 💌')
      setShowCreateModal(false)
      setFormData({
        content: '',
        note_type: 'random',
        background_color: '#a7f3d0',
        deliver_at: '',
      })
      fetchNotes()
    } catch (error) {
      toast.error('Failed to send love note')
    }
  }

  const unopenedCount = notes.received.filter(n => !n.is_opened).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-header">
            Love Notes
          </h1>
          <p className="text-gray-500 mt-1">Special messages just for you two 💌</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Feather className="w-5 h-5" />
          Write a Love Note
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'received'
              ? 'bg-gradient-love text-white shadow-soft'
              : 'bg-white text-gray-600 hover:bg-mint-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          Received
          {unopenedCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {unopenedCount}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'sent'
              ? 'bg-gradient-love text-white shadow-soft'
              : 'bg-white text-gray-600 hover:bg-mint-50'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent
        </button>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 h-48 animate-pulse bg-mint-50" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {(activeTab === 'received' ? notes.received : notes.sent).map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleOpenNote(note)}
                className="cursor-pointer group"
              >
                <div 
                  className="card p-6 h-48 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden"
                  style={{ backgroundColor: note.background_color + '40' }}
                >
                  {/* Unopened indicator */}
                  {!note.is_opened && activeTab === 'received' && (
                    <div className="absolute top-3 right-3 bg-pink-500 text-white p-2 rounded-full animate-pulse">
                      <Mail className="w-4 h-4" />
                    </div>
                  )}
                  
                  {/* Note type */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {noteTypes.find(t => t.id === note.note_type)?.label || 'Love Note'}
                  </div>
                  
                  {/* Preview content */}
                  <div className="flex-1 overflow-hidden py-3">
                    {!note.is_opened && activeTab === 'received' ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <EyeOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Click to open</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 line-clamp-3 font-handwriting text-lg">
                        {note.content}
                      </p>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {activeTab === 'received' ? `From ${note.from_name}` : `To ${note.to_name}`}
                    </span>
                    <span>{format(parseISO(note.created_at), 'MMM d')}</span>
                  </div>
                  
                  {/* Shimmer effect for unopened */}
                  {!note.is_opened && activeTab === 'received' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {(activeTab === 'received' ? notes.received : notes.sent).length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-pink-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                {activeTab === 'received' ? 'No love notes yet' : 'You haven\'t sent any notes'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'received' 
                  ? 'Ask your partner to send you one! 💌'
                  : 'Write a love note for your partner!'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* View Note Modal */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="card p-8 relative overflow-hidden"
                style={{ backgroundColor: selectedNote.background_color }}
              >
                <button
                  onClick={() => setSelectedNote(null)}
                  className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white/80 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                
                <div className="text-center mb-6">
                  <span className="text-4xl">
                    {noteTypes.find(t => t.id === selectedNote.note_type)?.id === 'love_letter' ? '💌' :
                     noteTypes.find(t => t.id === selectedNote.note_type)?.id === 'appreciation' ? '💝' :
                     noteTypes.find(t => t.id === selectedNote.note_type)?.id === 'promise' ? '✨' :
                     noteTypes.find(t => t.id === selectedNote.note_type)?.id === 'memory' ? '🌈' : '💚'}
                  </span>
                </div>
                
                <p className="text-xl font-handwriting text-gray-800 text-center leading-relaxed whitespace-pre-wrap">
                  {selectedNote.content}
                </p>
                
                <div className="mt-8 text-center text-sm text-gray-600">
                  <p>
                    {activeTab === 'received' 
                      ? `With love from ${selectedNote.from_name}` 
                      : `Sent to ${selectedNote.to_name}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(parseISO(selectedNote.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Note Modal */}
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
              className="card p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-gray-800 flex items-center gap-2">
                  <Feather className="w-5 h-5 text-mint-500" />
                  Write a Love Note
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-4">
                {/* Note Type */}
                <div>
                  <label className="input-label">Type of Note</label>
                  <div className="grid grid-cols-3 gap-2">
                    {noteTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, note_type: type.id })}
                        className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          formData.note_type === type.id
                            ? `bg-${type.color}-100 ring-2 ring-${type.color}-400`
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <type.icon className={`w-4 h-4 text-${type.color}-500`} />
                        <span className="text-xs text-gray-600">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="input-label">Your Message</label>
                  <textarea
                    className="input font-handwriting text-lg"
                    rows={5}
                    placeholder="Write something from your heart..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    style={{ backgroundColor: formData.background_color + '40' }}
                  />
                </div>

                {/* Background Color */}
                <div>
                  <label className="input-label">Background Color</label>
                  <div className="flex gap-2">
                    {bgColors.map((bg) => (
                      <button
                        key={bg.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, background_color: bg.color })}
                        className={`w-10 h-10 rounded-full transition-all ${
                          formData.background_color === bg.color
                            ? 'ring-2 ring-gray-400 ring-offset-2 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: bg.color }}
                        title={bg.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Schedule (Optional) */}
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Schedule for later (optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.deliver_at}
                    onChange={(e) => setFormData({ ...formData, deliver_at: e.target.value })}
                  />
                </div>

                <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Love Note
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LoveNotes

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Heart, MessageCircle, ArrowLeft, Calendar, MapPin, 
  Trash2, Edit3, X, Send, Download, Share2
} from 'lucide-react'
import { photosAPI, FILE_BASE_URL } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

function PhotoView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchPhoto()
  }, [id])

  const fetchPhoto = async () => {
    try {
      const response = await photosAPI.getPhoto(id)
      setPhoto(response.data.data)
      setEditData({
        caption: response.data.data.caption || '',
        location: response.data.data.location || '',
        photo_date: response.data.data.photo_date || '',
      })
    } catch (error) {
      console.error('Failed to fetch photo:', error)
      toast.error('Photo not found')
      navigate('/gallery')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      const response = await photosAPI.toggleFavorite(id)
      setPhoto({ ...photo, is_favorite: response.data.data.is_favorite })
      toast.success(response.data.message)
    } catch (error) {
      toast.error('Failed to update favorite')
    }
  }

  const handleAddReaction = async (type) => {
    try {
      await photosAPI.addReaction({ photo_id: id, reaction_type: type })
      fetchPhoto()
    } catch (error) {
      toast.error('Failed to add reaction')
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    try {
      await photosAPI.addComment({ photo_id: id, content: newComment })
      setNewComment('')
      fetchPhoto()
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleUpdate = async () => {
    try {
      await photosAPI.update(id, editData)
      setPhoto({ ...photo, ...editData })
      setIsEditing(false)
      toast.success('Photo updated')
    } catch (error) {
      toast.error('Failed to update photo')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return
    
    try {
      await photosAPI.delete(id)
      toast.success('Photo deleted')
      navigate('/gallery')
    } catch (error) {
      toast.error('Failed to delete photo')
    }
  }

  const reactions = ['❤️', '😍', '😊', '🥰', '💚']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-mint-200 border-t-mint-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!photo) return null

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-mint-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Gallery
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Photo */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card overflow-hidden"
          >
            {photo.media_type === 'video' ? (
              <video
                src={`${FILE_BASE_URL}/${photo.file_path}`}
                className="w-full h-auto max-h-[70vh] bg-black"
                controls
                autoPlay
              />
            ) : (
              <img
                src={`${FILE_BASE_URL}/${photo.file_path}`}
                alt={photo.caption || ''}
                className="w-full h-auto max-h-[70vh] object-contain bg-gray-100"
              />
            )}
          </motion.div>

          {/* Quick reactions */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className="text-2xl hover:scale-125 transition-transform p-2"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className={`p-3 rounded-xl transition-colors ${
                    photo.is_favorite 
                      ? 'bg-pink-100 text-pink-500' 
                      : 'bg-gray-100 text-gray-400 hover:bg-pink-50 hover:text-pink-400'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${photo.is_favorite ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-sky-50 hover:text-sky-500 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
              
              {photo.user_id === user?.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-mint-50 hover:text-mint-600 transition-colors"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="card p-4 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="input-label">Caption</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editData.caption}
                    onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                    placeholder="Write a caption..."
                  />
                </div>
                
                <div>
                  <label className="input-label">Location</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    placeholder="Where was this taken?"
                  />
                </div>
                
                <div>
                  <label className="input-label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={editData.photo_date}
                    onChange={(e) => setEditData({ ...editData, photo_date: e.target.value })}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="btn-primary flex-1">
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Uploader */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-love flex items-center justify-center text-white font-medium">
                    {photo.uploader_name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{photo.uploader_name}</p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(photo.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Caption */}
                {photo.caption && (
                  <p className="text-gray-700">{photo.caption}</p>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-sm">
                  {photo.photo_date && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {format(parseISO(photo.photo_date), 'MMMM d, yyyy')}
                    </div>
                  )}
                  
                  {photo.location && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="w-4 h-4" />
                      {photo.location}
                    </div>
                  )}
                  
                  {photo.anniversary_title && (
                    <div className="badge-mint mt-2">
                      {photo.anniversary_title}
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {photo.reactions && photo.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
                    {photo.reactions.map((reaction, i) => (
                      <span key={i} className="text-lg">{reaction.reaction_type}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Comments */}
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="card p-4"
            >
              <h3 className="font-medium text-gray-800 mb-3">Comments</h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {photo.comments && photo.comments.length > 0 ? (
                  photo.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-mint-100 flex items-center justify-center text-mint-600 text-sm font-medium flex-shrink-0">
                        {comment.display_name?.[0]}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-sm font-medium text-gray-800">{comment.display_name}</p>
                        <p className="text-sm text-gray-600">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                )}
              </div>
              
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" className="btn-primary px-4">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoView

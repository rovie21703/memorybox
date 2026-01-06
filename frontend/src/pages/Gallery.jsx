import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Image, Heart, Filter, Grid, Calendar, ChevronDown,
  Search, X, Download, Star, Clock
} from 'lucide-react'
import { photosAPI, FILE_BASE_URL } from '../services/api'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    year: '',
    month: '',
    anniversary_id: '',
    favorites: false,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // grid, timeline
  const [dateGroups, setDateGroups] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    fetchPhotos()
  }, [page, filters])

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30, ...filters }
      
      if (filters.favorites) {
        const response = await photosAPI.getFavorites()
        setPhotos(response.data.data)
        setTotalPages(1)
      } else {
        const response = await photosAPI.getPhotos(params)
        setPhotos(response.data.data)
        setTotalPages(response.data.pagination?.pages || 1)
      }
      
      // Group by date for timeline view
      if (viewMode === 'timeline') {
        groupPhotosByDate()
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  const groupPhotosByDate = () => {
    const groups = {}
    photos.forEach(photo => {
      const date = photo.photo_date || photo.created_at.split(' ')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(photo)
    })
    
    const sortedGroups = Object.entries(groups)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .map(([date, photos]) => ({ date, photos }))
    
    setDateGroups(sortedGroups)
  }

  const handleToggleFavorite = async (photoId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const response = await photosAPI.toggleFavorite(photoId)
      setPhotos(photos.map(p => 
        p.id === photoId ? { ...p, is_favorite: response.data.data.is_favorite } : p
      ))
      toast.success(response.data.message)
    } catch (error) {
      toast.error('Failed to update favorite')
    }
  }

  const clearFilters = () => {
    setFilters({
      year: '',
      month: '',
      anniversary_id: '',
      favorites: false,
    })
    setPage(1)
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-header">Our Gallery</h1>
          <p className="text-gray-500 mt-1">All our beautiful memories in one place 💚</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-mint-100">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-mint-100 text-mint-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'timeline' ? 'bg-mint-100 text-mint-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
          
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-mint-300' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="input-label">Year</label>
                  <select
                    className="input"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  >
                    <option value="">All Years</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="input-label">Month</label>
                  <select
                    className="input"
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  >
                    <option value="">All Months</option>
                    {months.map((month, i) => (
                      <option key={i} value={i + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.favorites}
                      onChange={(e) => setFilters({ ...filters, favorites: e.target.checked })}
                      className="w-5 h-5 rounded border-mint-300 text-mint-500 focus:ring-mint-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Favorites only</span>
                  </label>
                  
                  {(filters.year || filters.month || filters.favorites) && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Grid */}
      {loading ? (
        <div className="photo-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-mint-100 animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-mint-100 flex items-center justify-center mx-auto mb-4">
            <Image className="w-10 h-10 text-mint-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">No memories yet</h3>
          <p className="text-gray-500 mb-4">Start capturing your memories together!</p>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
            Upload Memories
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="photo-grid">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
            >
              <Link to={`/photo/${photo.id}`} className="photo-card block group">
                {photo.media_type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={`${FILE_BASE_URL}/${photo.file_path}`}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseOver={e => e.target.play()}
                      onMouseOut={e => {
                        e.target.pause();
                        e.target.currentTime = 0;
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5"></div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={`${FILE_BASE_URL}/${photo.thumbnail_path || photo.file_path}`}
                    alt={photo.caption || ''}
                    loading="lazy"
                  />
                )}
                <div className="photo-overlay">
                  <button
                    onClick={(e) => handleToggleFavorite(photo.id, e)}
                    className={`p-2 rounded-full transition-colors ${
                      photo.is_favorite 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-white/20 text-white hover:bg-white/40'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${photo.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                  
                  {photo.caption && (
                    <p className="text-white text-xs truncate max-w-[80%]">{photo.caption}</p>
                  )}
                </div>
                
                {/* Date badge */}
                {photo.photo_date && (
                  <div className="absolute top-2 left-2 bg-black/30 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                    {format(parseISO(photo.photo_date), 'MMM d')}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-8">
          {dateGroups.map((group, groupIndex) => (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-love flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">
                    {format(parseISO(group.date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-sm text-gray-500">{group.photos.length} photos</p>
                </div>
              </div>
              
              <div className="photo-grid">
                {group.photos.map((photo) => (
                  <Link
                    key={photo.id}
                    to={`/photo/${photo.id}`}
                    className="photo-card block"
                  >
                    {photo.media_type === 'video' ? (
                      <div className="relative w-full h-full">
                        <video
                          src={`${FILE_BASE_URL}/${photo.file_path}`}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseOver={e => e.target.play()}
                          onMouseOut={e => {
                            e.target.pause();
                            e.target.currentTime = 0;
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full z-10">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5"></div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={`${FILE_BASE_URL}/${photo.thumbnail_path || photo.file_path}`}
                        alt={photo.caption || ''}
                        loading="lazy"
                      />
                    )}
                    {photo.is_favorite && (
                      <div className="absolute top-2 right-2 bg-pink-500 p-1.5 rounded-full">
                        <Heart className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !filters.favorites && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default Gallery

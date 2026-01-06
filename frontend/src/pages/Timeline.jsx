import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, Image, Heart, Calendar, MessageCircle,
  ChevronDown, Filter, Star, Sparkles
} from 'lucide-react'
import { photosAPI, memoriesAPI, anniversariesAPI, FILE_BASE_URL } from '../services/api'
import { Link } from 'react-router-dom'
import { format, parseISO, isValid } from 'date-fns'

function Timeline() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, photos, memories, milestones
  const [year, setYear] = useState(null)
  const [years, setYears] = useState([])

  useEffect(() => {
    fetchTimeline()
  }, [filter, year])

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      // Fetch all data types
      const [photosRes, memoriesRes, anniversariesRes] = await Promise.all([
        photosAPI.getTimeline(),
        memoriesAPI.getTimeline(),
        anniversariesAPI.getAll(),
      ])

      let allEvents = []

      // Process photos
      if (filter === 'all' || filter === 'photos') {
        const photos = photosRes.data.data || []
        photos.forEach(photo => {
          allEvents.push({
            type: 'photo',
            id: photo.id,
            date: photo.taken_at || photo.created_at,
            data: photo,
          })
        })
      }

      // Process memories
      if (filter === 'all' || filter === 'memories') {
        const memories = memoriesRes.data.data || []
        memories.forEach(memory => {
          allEvents.push({
            type: 'memory',
            id: memory.id,
            date: memory.memory_date,
            data: memory,
          })
        })
      }

      // Process milestones
      if (filter === 'all' || filter === 'milestones') {
        const milestonesRes = await memoriesAPI.getMilestones()
        const milestones = milestonesRes.data.data || []
        milestones.forEach(milestone => {
          allEvents.push({
            type: 'milestone',
            id: milestone.id,
            date: milestone.achieved_at,
            data: milestone,
          })
        })
      }

      // Filter out events with invalid dates
      allEvents = allEvents.filter(e => {
        if (!e.date) return false
        const date = new Date(e.date)
        return !isNaN(date.getTime())
      })

      // Sort by date descending
      allEvents.sort((a, b) => new Date(b.date) - new Date(a.date))

      // Get unique years
      const uniqueYears = [...new Set(allEvents.map(e => 
        new Date(e.date).getFullYear()
      ))].sort((a, b) => b - a)
      setYears(uniqueYears)

      // Filter by year if selected
      if (year) {
        allEvents = allEvents.filter(e => 
          new Date(e.date).getFullYear() === year
        )
      }

      setEvents(allEvents)
    } catch (error) {
      console.error('Failed to fetch timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'photo': return <Image className="w-4 h-4" />
      case 'memory': return <Heart className="w-4 h-4" />
      case 'milestone': return <Star className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  const getEventColor = (type) => {
    switch (type) {
      case 'photo': return 'bg-sky-500'
      case 'memory': return 'bg-pink-500'
      case 'milestone': return 'bg-amber-500'
      default: return 'bg-gray-500'
    }
  }

  const getMoodEmoji = (mood) => {
    const moods = {
      happy: '😊',
      love: '🥰',
      excited: '🎉',
      peaceful: '😌',
      grateful: '🙏',
      funny: '😂',
      nostalgic: '🥺',
      romantic: '💕',
    }
    return moods[mood] || '💚'
  }

  // Group events by month/year
  const groupedEvents = events.reduce((groups, event) => {
    try {
      const date = parseISO(event.date)
      if (!isValid(date)) return groups
      
      const monthYear = format(date, 'MMMM yyyy')
      if (!groups[monthYear]) {
        groups[monthYear] = []
      }
      groups[monthYear].push(event)
    } catch (error) {
      console.warn('Skipping event with invalid date:', event)
    }
    return groups
  }, {})

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-header">Our Timeline</h1>
          <p className="text-gray-500 mt-1">Every moment of our journey together ✨</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input !w-auto"
          >
            <option value="all">All Events</option>
            <option value="photos">📷 Photos</option>
            <option value="memories">💕 Memories</option>
            <option value="milestones">⭐ Milestones</option>
          </select>

          {/* Year filter */}
          <select
            value={year || ''}
            onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : null)}
            className="input !w-auto"
          >
            <option value="">All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-2">
            <Image className="w-5 h-5 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {events.filter(e => e.type === 'photo').length}
          </p>
          <p className="text-sm text-gray-500">Photos</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-2">
            <Heart className="w-5 h-5 text-pink-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {events.filter(e => e.type === 'memory').length}
          </p>
          <p className="text-sm text-gray-500">Memories</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {events.filter(e => e.type === 'milestone').length}
          </p>
          <p className="text-sm text-gray-500">Milestones</p>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-mint-100 rounded w-32 mb-4" />
              <div className="card p-4">
                <div className="h-16 bg-mint-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gradient-love flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">Your timeline is empty</h3>
          <p className="text-gray-500">Start adding photos and memories to see them here!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([monthYear, monthEvents], groupIndex) => (
            <motion.div
              key={monthYear}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              {/* Month header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-love flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-display font-bold text-gray-800">{monthYear}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-mint-200 to-transparent" />
              </div>

              {/* Events */}
              <div className="pl-5 border-l-2 border-mint-100 space-y-4">
                {monthEvents.map((event, eventIndex) => (
                  <motion.div
                    key={`${event.type}-${event.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: eventIndex * 0.05 }}
                    className="relative pl-8"
                  >
                    {/* Event dot */}
                    <div className={`absolute -left-3 w-6 h-6 rounded-full ${getEventColor(event.type)} 
                                    flex items-center justify-center text-white`}>
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event content */}
                    {event.type === 'photo' && (
                      <Link to={`/photos/${event.data.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                        <div className="flex gap-4">
                          <img
                            src={`${FILE_BASE_URL}/${event.data.thumbnail || event.data.file_path}`}
                            alt=""
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">
                              {format(parseISO(event.date), 'MMMM d, yyyy • h:mm a')}
                            </p>
                            {event.data.caption && (
                              <p className="text-gray-800 mt-1 line-clamp-2">{event.data.caption}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              {event.data.is_favorite && (
                                <span className="flex items-center gap-1">
                                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" /> Favorite
                                </span>
                              )}
                              {event.data.reaction_count > 0 && (
                                <span>{event.data.reaction_count} reactions</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}

                    {event.type === 'memory' && (
                      <div className="card p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-500">
                              {format(parseISO(event.date), 'MMMM d, yyyy')}
                            </p>
                            <h3 className="font-medium text-gray-800 mt-1">{event.data.title}</h3>
                            <p className="text-gray-600 mt-2 line-clamp-3">{event.data.description}</p>
                          </div>
                          <span className="text-2xl">{getMoodEmoji(event.data.mood)}</span>
                        </div>
                      </div>
                    )}

                    {event.type === 'milestone' && (
                      <div className="card p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{event.data.icon || '⭐'}</span>
                          <div>
                            <p className="text-sm text-amber-600">
                              {format(parseISO(event.date), 'MMMM d, yyyy')}
                            </p>
                            <h3 className="font-medium text-gray-800">{event.data.title}</h3>
                            {event.data.description && (
                              <p className="text-gray-600 text-sm mt-1">{event.data.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Timeline

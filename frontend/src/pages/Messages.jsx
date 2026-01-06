import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Heart, Smile, Image, MoreVertical,
  Trash2, Check, CheckCheck
} from 'lucide-react'
import { messagesAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'

function Messages() {
  const { user, partner } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    
    // Poll for new messages
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await messagesAPI.getConversation()
      setMessages(response.data.data || [])
      await messagesAPI.markAsRead()
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return
    if (!partner) {
      toast.error('Please link your partner first')
      return
    }

    setSending(true)
    try {
      await messagesAPI.send({ content: newMessage })
      setNewMessage('')
      fetchMessages()
      inputRef.current?.focus()
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSendHeart = async () => {
    if (!partner) {
      toast.error('Please link your partner first')
      return
    }

    try {
      await messagesAPI.sendHeart()
      fetchMessages()
      toast.success('Sent a heart! 💚')
    } catch (error) {
      toast.error('Failed to send heart')
    }
  }

  const handleDelete = async (id) => {
    try {
      await messagesAPI.delete(id)
      setMessages(messages.filter(m => m.id !== id))
    } catch (error) {
      toast.error('Failed to delete message')
    }
  }

  const formatMessageTime = (dateStr) => {
    const date = parseISO(dateStr)
    
    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'h:mm a')
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  const quickEmojis = ['💚', '💙', '😘', '🥰', '😍', '❤️', '✨', '🌈']

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {partner ? (
            <>
              <div className="w-12 h-12 rounded-full bg-gradient-love flex items-center justify-center text-white font-medium text-lg">
                {partner.display_name?.[0]}
              </div>
              <div>
                <h2 className="font-medium text-gray-800">{partner.display_name}</h2>
                <p className="text-sm text-gray-500">Your partner 💚</p>
              </div>
            </>
          ) : (
            <div>
              <h2 className="font-medium text-gray-800">No partner linked</h2>
              <p className="text-sm text-gray-500">Link your partner in Profile settings</p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleSendHeart}
          className="p-3 rounded-full bg-pink-50 hover:bg-pink-100 transition-colors"
        >
          <Heart className="w-6 h-6 text-pink-500 fill-pink-500 animate-heart-beat" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 card p-4 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-mint-200 border-t-mint-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-love flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">Start a conversation</h3>
            <p className="text-gray-500">Send your first message to {partner?.display_name || 'your partner'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isSent = message.sender_id === user?.id
              const showDate = index === 0 || 
                format(parseISO(messages[index - 1].created_at), 'yyyy-MM-dd') !== 
                format(parseISO(message.created_at), 'yyyy-MM-dd')
              
              return (
                <div key={message.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        {isToday(parseISO(message.created_at)) 
                          ? 'Today' 
                          : isYesterday(parseISO(message.created_at))
                            ? 'Yesterday'
                            : format(parseISO(message.created_at), 'MMMM d, yyyy')
                        }
                      </span>
                    </div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="group relative max-w-[80%]">
                      {/* Heart message */}
                      {message.message_type === 'heart' ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5 }}
                          className={`text-5xl text-center py-2 ${isSent ? 'ml-auto' : 'mr-auto'}`}
                        >
                          💚
                        </motion.div>
                      ) : (
                        <div className={isSent ? 'message-sent' : 'message-received'}>
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      )}
                      
                      {/* Time & status */}
                      <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${
                        isSent ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{formatMessageTime(message.created_at)}</span>
                        {isSent && (
                          message.is_read 
                            ? <CheckCheck className="w-3 h-3 text-mint-500" />
                            : <Check className="w-3 h-3" />
                        )}
                      </div>

                      {/* Delete button (on hover) */}
                      {isSent && (
                        <button
                          onClick={() => handleDelete(message.id)}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 
                                     hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 
                                     group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick emoji picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="card p-3 mt-2"
          >
            <div className="flex gap-2 justify-center">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage(prev => prev + emoji)
                    setShowEmojiPicker(false)
                    inputRef.current?.focus()
                  }}
                  className="text-2xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-4">
        <div className="card p-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Smile className="w-6 h-6" />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
            placeholder={partner ? `Message ${partner.display_name}...` : 'Link your partner to chat'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!partner}
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !partner}
            className="p-3 rounded-full bg-gradient-love text-white disabled:opacity-50 
                       hover:shadow-glow transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default Messages

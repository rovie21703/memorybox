import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Download, Palette, Sparkles } from 'lucide-react'

const HEART_EMOJIS = ['💚', '💙', '💜', '💖', '💝', '💗', '💕', '💞', '💓', '💛', '🧡', '❤️', '💘', '💟', '✨', '🌟']
const HEART_SIZES = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl']

function HeartCanvas() {
  const [hearts, setHearts] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState('💚')
  const [trailMode, setTrailMode] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const canvasRef = useRef(null)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const heartIdRef = useRef(0)

  const addHeart = useCallback((x, y) => {
    const randomSize = HEART_SIZES[Math.floor(Math.random() * HEART_SIZES.length)]
    const randomRotation = Math.random() * 60 - 30
    const randomScale = 0.8 + Math.random() * 0.6
    
    const newHeart = {
      id: heartIdRef.current++,
      x,
      y,
      emoji: selectedEmoji,
      size: randomSize,
      rotation: randomRotation,
      scale: randomScale,
    }
    
    setHearts(prev => [...prev, newHeart])
  }, [selectedEmoji])

  const handleStart = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    setIsDrawing(true)
    lastPosRef.current = { x, y }
    addHeart(x, y)
  }, [addHeart])

  const handleMove = useCallback((clientX, clientY) => {
    if (!isDrawing || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    // Calculate distance from last position
    const dx = x - lastPosRef.current.x
    const dy = y - lastPosRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Add hearts along the path if distance is enough
    const spacing = trailMode ? 20 : 40
    if (distance >= spacing) {
      const steps = Math.floor(distance / spacing)
      for (let i = 1; i <= steps; i++) {
        const ratio = i / steps
        const hx = lastPosRef.current.x + dx * ratio
        const hy = lastPosRef.current.y + dy * ratio
        addHeart(hx, hy)
      }
      lastPosRef.current = { x, y }
    }
  }, [isDrawing, addHeart, trailMode])

  const handleEnd = useCallback(() => {
    setIsDrawing(false)
  }, [])

  // Mouse events
  const handleMouseDown = (e) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e) => {
    handleMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Touch events
  const handleTouchStart = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Clear canvas
  const clearCanvas = () => {
    setHearts([])
    heartIdRef.current = 0
  }

  // Download as image
  const downloadCanvas = async () => {
    if (!canvasRef.current) return
    
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#fff5f5',
        scale: 2,
      })
      
      const link = document.createElement('a')
      link.download = `love-drawing-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Failed to download:', error)
      // Fallback: just show a message
      alert('Download feature requires html2canvas. Your beautiful art is displayed on screen!')
    }
  }

  // Add mouseleave handler to stop drawing when cursor leaves canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleLeave = () => setIsDrawing(false)
    canvas.addEventListener('mouseleave', handleLeave)
    
    return () => {
      canvas.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-2">
          💕 Heart Canvas 💕
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Draw with love! Click and drag to create heart trails ✨
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center justify-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft"
      >
        {/* Emoji Picker */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-soft rounded-xl hover:shadow-md transition-all"
          >
            <span className="text-2xl">{selectedEmoji}</span>
            <Palette className="w-4 h-4 text-gray-500" />
          </button>
          
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-white rounded-xl shadow-xl z-50 grid grid-cols-4 gap-2 min-w-[200px]"
            >
              {HEART_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setSelectedEmoji(emoji)
                    setShowEmojiPicker(false)
                  }}
                  className={`text-2xl p-2 rounded-lg hover:bg-pink-50 transition-colors ${
                    selectedEmoji === emoji ? 'bg-pink-100' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Trail Mode Toggle */}
        <button
          onClick={() => setTrailMode(!trailMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            trailMode 
              ? 'bg-gradient-love text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Dense Trail</span>
        </button>

        {/* Clear Button */}
        <button
          onClick={clearCanvas}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Clear</span>
        </button>

        {/* Download Button */}
        <button
          onClick={downloadCanvas}
          className="flex items-center gap-2 px-4 py-2 bg-mint-50 text-mint-600 rounded-xl hover:bg-mint-100 transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Save</span>
        </button>


      </motion.div>

      {/* Canvas Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <div
          ref={canvasRef}
          className="relative w-full h-[50vh] md:h-[60vh] min-h-[300px] md:min-h-[400px] bg-gradient-to-br from-pink-50 via-white to-sky-50 rounded-2xl shadow-soft overflow-hidden cursor-crosshair select-none touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-4 left-4 text-4xl opacity-20">💕</div>
            <div className="absolute top-4 right-4 text-4xl opacity-20">💖</div>
            <div className="absolute bottom-4 left-4 text-4xl opacity-20">💗</div>
            <div className="absolute bottom-4 right-4 text-4xl opacity-20">💝</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-10">
              ✨
            </div>
          </div>

          {/* Hearts */}
          {hearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: heart.scale, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className={`absolute ${heart.size} select-none pointer-events-none`}
              style={{
                left: heart.x,
                top: heart.y,
                transform: `translate(-50%, -50%) rotate(${heart.rotation}deg)`,
              }}
            >
              {heart.emoji}
            </motion.div>
          ))}

          {/* Empty State */}
          {hearts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <p className="text-lg mb-2">🎨 Start drawing!</p>
                <p className="text-sm">Click and drag to create heart trails</p>
                <p className="text-xs mt-1 text-gray-300">Works on mobile too! 📱</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>


    </div>
  )
}

export default HeartCanvas

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload as UploadIcon, Image, X, Calendar, MapPin, 
  Tag, Check, Loader2, Camera, Sparkles
} from 'lucide-react'
import { photosAPI, anniversariesAPI } from '../services/api'
import toast from 'react-hot-toast'

function Upload() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [anniversaries, setAnniversaries] = useState([])
  const [commonData, setCommonData] = useState({
    anniversary_id: '',
    location: '',
  })

  useEffect(() => {
    fetchAnniversaries()
  }, [])

  const fetchAnniversaries = async () => {
    try {
      const response = await anniversariesAPI.getAll()
      setAnniversaries(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch anniversaries:', error)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      caption: '',
      photo_date: new Date().toISOString().split('T')[0],
      status: 'pending', // pending, uploading, success, error
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    }
  })

  const removeFile = (id) => {
    setFiles(files.filter(f => f.id !== id))
  }

  const updateFileData = (id, data) => {
    setFiles(files.map(f => f.id === id ? { ...f, ...data } : f))
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Please add some memories first')
      return
    }

    setUploading(true)
    let successCount = 0
    let errorCount = 0

    for (const fileData of files) {
      if (fileData.status === 'success') continue
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'uploading' } : f
      ))

      try {
        const formData = new FormData()
        formData.append('photo', fileData.file)
        formData.append('caption', fileData.caption)
        formData.append('photo_date', fileData.photo_date)
        
        if (commonData.anniversary_id) {
          formData.append('anniversary_id', commonData.anniversary_id)
        }
        if (commonData.location) {
          formData.append('location', commonData.location)
        }

        await photosAPI.upload(formData)
        
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'success' } : f
        ))
        successCount++
      } catch (error) {
        console.error('Upload failed:', error)
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'error' } : f
        ))
        errorCount++
      }
    }

    setUploading(false)
    
    if (successCount > 0) {
      toast.success(`${successCount} memor${successCount > 1 ? 'ies' : 'y'} uploaded! 📸`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} memor${errorCount > 1 ? 'ies' : 'y'} failed to upload`)
    }
    
    if (successCount > 0 && errorCount === 0) {
      setTimeout(() => navigate('/gallery'), 1500)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="page-header">Upload Memories</h1>
        <p className="text-gray-500 mt-2">Add new memories to your collection 💚</p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`card p-8 lg:p-12 text-center cursor-pointer border-2 border-dashed transition-all ${
          isDragActive 
            ? 'border-mint-400 bg-mint-50' 
            : 'border-mint-200 hover:border-mint-300 hover:bg-mint-50/50'
        }`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className="w-16 h-16 rounded-full bg-gradient-love flex items-center justify-center mb-4"
          >
            <Camera className="w-8 h-8 text-white" />
          </motion.div>
          
          <h3 className="text-xl font-medium text-gray-800 mb-2">
            {isDragActive ? 'Drop your memories here!' : 'Drag & drop memories here'}
          </h3>
          <p className="text-gray-500 mb-4">or click to browse</p>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Image className="w-4 h-4" />
            <span>Photos & Videos • No size limit</span>
          </div>
        </div>
      </div>

      {/* Common Settings */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-mint-500" />
            Apply to all memories
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Anniversary Album</label>
              <select
                className="input"
                value={commonData.anniversary_id}
                onChange={(e) => setCommonData({ ...commonData, anniversary_id: e.target.value })}
              >
                <option value="">No specific anniversary</option>
                {anniversaries.map(ann => (
                  <option key={ann.id} value={ann.id}>{ann.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="input-label">Location</label>
              <div className="relative">
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Where were these taken?"
                  value={commonData.location}
                  onChange={(e) => setCommonData({ ...commonData, location: e.target.value })}
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Files Preview */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">
                {files.length} memor{files.length > 1 ? 'ies' : 'y'} selected
              </h3>
              
              <button
                onClick={() => setFiles([])}
                className="text-sm text-gray-500 hover:text-red-500"
              >
                Clear all
              </button>
            </div>

            <div className="grid gap-4">
              {files.map((fileData, index) => (
                <motion.div
                  key={fileData.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card p-4 ${
                    fileData.status === 'success' ? 'ring-2 ring-green-400' :
                    fileData.status === 'error' ? 'ring-2 ring-red-400' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Preview */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {fileData.file.type.startsWith('video/') ? (
                        <video
                          src={fileData.preview}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={fileData.preview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Status overlay */}
                      {fileData.status !== 'pending' && (
                        <div className={`absolute inset-0 flex items-center justify-center ${
                          fileData.status === 'uploading' ? 'bg-black/50' :
                          fileData.status === 'success' ? 'bg-green-500/50' :
                          'bg-red-500/50'
                        }`}>
                          {fileData.status === 'uploading' && (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          )}
                          {fileData.status === 'success' && (
                            <Check className="w-8 h-8 text-white" />
                          )}
                          {fileData.status === 'error' && (
                            <X className="w-8 h-8 text-white" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800 text-sm truncate max-w-[200px]">
                            {fileData.file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        
                        {fileData.status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileData.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {fileData.status === 'pending' && (
                        <div className="grid md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            className="input text-sm py-2"
                            placeholder="Caption..."
                            value={fileData.caption}
                            onChange={(e) => updateFileData(fileData.id, { caption: e.target.value })}
                          />
                          
                          <div className="relative">
                            <input
                              type="date"
                              className="input text-sm py-2 pl-10"
                              value={fileData.photo_date}
                              onChange={(e) => updateFileData(fileData.id, { photo_date: e.target.value })}
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            <button
              onClick={uploadFiles}
              disabled={uploading || files.every(f => f.status === 'success')}
              className="w-full btn-primary py-4 text-lg disabled:opacity-50"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </span>
              ) : files.every(f => f.status === 'success') ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  All uploaded!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  Upload {files.filter(f => f.status === 'pending').length} Memor{files.filter(f => f.status === 'pending').length > 1 ? 'ies' : 'y'}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Upload

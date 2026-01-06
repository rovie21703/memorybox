import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import PhotoView from './pages/PhotoView'
import Upload from './pages/Upload'
import Memories from './pages/Memories'
import Messages from './pages/Messages'
import LoveNotes from './pages/LoveNotes'
import Anniversaries from './pages/Anniversaries'
import Profile from './pages/Profile'
import Timeline from './pages/Timeline'
import HeartCanvas from './pages/HeartCanvas'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'white',
            color: '#374151',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="photo/:id" element={<PhotoView />} />
          <Route path="upload" element={<Upload />} />
          <Route path="memories" element={<Memories />} />
          <Route path="messages" element={<Messages />} />
          <Route path="love-notes" element={<LoveNotes />} />
          <Route path="anniversaries" element={<Anniversaries />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="heart-canvas" element={<HeartCanvas />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

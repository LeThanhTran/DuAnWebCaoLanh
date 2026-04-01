import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './components/HomePage'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import UserList from './components/UserList'
import UserForm from './components/UserForm'
import ArticleList from './components/ArticleList'
import ArticleForm from './components/ArticleForm'
import ArticleDetail from './components/ArticleDetail'
import ServiceList from './components/ServiceList'
import Dashboard from './components/Dashboard'
import Gallery from './components/Gallery'
import ContactPage from './components/ContactPage'
import ApplicationManagement from './components/ApplicationManagement'
import ApplicationForm from './components/ApplicationForm'
import PermissionMatrixPanel from './components/PermissionMatrixPanel'
import ContactMessagesAdmin from './components/ContactMessagesAdmin'
import ContactMessagesBubble from './components/ContactMessagesBubble'
import AdminActivityLog from './components/AdminActivityLog'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userRefreshKey, setUserRefreshKey] = useState(0)
  const [articleRefreshKey, setArticleRefreshKey] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      setIsLoggedIn(true)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  useEffect(() => {
    // Update active tab based on pathname
    if (location.pathname.includes('/articles') && !location.pathname.includes('/dashboard')) {
      setActiveTab('articles')
    } else if (location.pathname.includes('/contact')) {
      setActiveTab('contact')
    } else if (location.pathname.includes('/services')) {
      setActiveTab('services')
    } else if (location.pathname.includes('/users')) {
      setActiveTab('users')
    } else if (location.pathname.includes('/gallery')) {
      setActiveTab('gallery')
    } else if (location.pathname.includes('/dashboard')) {
      setActiveTab('dashboard')
    }
  }, [location])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    setUser(null)
  }

  const handleUserCreated = () => {
    setUserRefreshKey(prev => prev + 1)
  }

  const handleArticleCreated = () => {
    setArticleRefreshKey(prev => prev + 1)
  }

  if (!isLoggedIn) {
    return (
      <>
        <Navbar isLoggedIn={false} user={null} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <div className="container mx-auto px-4 pt-8 pb-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <div className="mb-6 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-800">Vào Hệ Thống</h2>
                      </div>
                      <LoginForm onLoginSuccess={handleLoginSuccess} />
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tin Tức Mới Nhất</h2>
                      <ArticleList key={articleRefreshKey} />
                    </div>
                  </div>
                </div>
                <HomePage />
              </div>
            }
          />
          <Route
            path="/register"
            element={
              <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                  <h1 className="text-4xl font-bold text-gray-800">Ward Website</h1>
                  <p className="text-gray-600 mt-2">Phần mềm quản lý phường xã</p>
                </div>
                <RegisterForm onRegisterSuccess={handleLoginSuccess} />
              </div>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </>
    )
  }

  return (
    <>
      <Navbar isLoggedIn={true} user={user} onLogout={handleLogout} />
      <div className="min-h-screen bg-gray-100">
        {/* Content */}
        <Routes>
        {/* Article Detail Page */}
        <Route path="/articles/:id" element={<ArticleDetail />} />

        {/* Dashboard Page */}
        <Route
          path="/dashboard"
          element={
            <div className="container mx-auto py-12 px-4">
              <Dashboard />
            </div>
          }
        />

        {/* Gallery Page */}
        <Route
          path="/gallery"
          element={
            <div className="container mx-auto py-12 px-4">
              <Gallery />
            </div>
          }
        />

        {/* Contact Page */}
        <Route
          path="/contact"
          element={
            <div className="container mx-auto py-12 px-4">
              <ContactPage />
            </div>
          }
        />

        {/* Main Pages */}
        <Route
          path="/articles"
          element={
            <div className="container mx-auto py-12 px-4">
              {(user?.role === 'Admin' || user?.role === 'Editor') ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <ArticleForm onArticleCreated={handleArticleCreated} />
                  </div>
                  <div className="lg:col-span-2">
                    <ArticleList key={articleRefreshKey} />
                  </div>
                </div>
              ) : (
                <ArticleList key={articleRefreshKey} />
              )}
            </div>
          }
        />

        <Route
          path="/services"
          element={
            <div className="container mx-auto py-12 px-4">
              <ServiceList />
            </div>
          }
        />

        <Route
          path="/submit-application"
          element={
            <div className="container mx-auto py-12 px-4">
              <ApplicationForm />
            </div>
          }
        />

        <Route
          path="/users"
          element={
            (user?.role === 'Admin') ? (
              <div className="container mx-auto py-12 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <UserForm onUserCreated={handleUserCreated} />
                  </div>
                  <div className="lg:col-span-2">
                    <UserList key={userRefreshKey} />
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/applications"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <ApplicationManagement />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Home Page */}
        <Route
          path="/"
          element={
            <div>
              <div className="container mx-auto py-12 px-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Tin Tức Mới Nhất</h2>
                <ArticleList key={articleRefreshKey} />
              </div>
              <HomePage />
            </div>
          }
        />

        <Route
          path="/phan-quyen"
          element={
            (user?.role === 'Admin') ? (
              <div className="container mx-auto py-12 px-4">
                <PermissionMatrixPanel />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/tin-nhan-lien-he"
          element={
            (user?.role === 'Admin') ? (
              <div className="container mx-auto py-12 px-4">
                <ContactMessagesAdmin />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/nhat-ky-he-thong"
          element={
            (user?.role === 'Admin') ? (
              <div className="container mx-auto py-12 px-4">
                <AdminActivityLog />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        </Routes>
      </div>
      <ContactMessagesBubble />
    </>
  )
}

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
import CategoryManagement from './components/CategoryManagement'
import ServiceManagement from './components/ServiceManagement'
import Dashboard from './components/Dashboard'
import Gallery from './components/Gallery'
import ContactPage from './components/ContactPage'
import AboutPage from './components/AboutPage'
import ApplicationManagement from './components/ApplicationManagement'
import ApplicationLookup from './components/ApplicationLookup'
import PermissionMatrixPanel from './components/PermissionMatrixPanel'
import ContactMessagesAdmin from './components/ContactMessagesAdmin'
import ContactMessagesBubble from './components/ContactMessagesBubble'
import AdminActivityLog from './components/AdminActivityLog'
import HomeBannerEditor from './components/HomeBannerEditor'
import HomeIntroEditor from './components/HomeIntroEditor'
import CommentModeration from './components/CommentModeration'
import DownloadFormsPublic from './components/DownloadFormsPublic'
import DownloadFormsManagement from './components/DownloadFormsManagement'
import ProfilePage from './components/ProfilePage'

const defaultSeo = {
  title: 'Phường Cao Lãnh - Cổng thông tin và dịch vụ công trực tuyến',
  description:
    'Cổng thông tin điện tử Phường Cao Lãnh: tin tức địa phương, tra cứu hồ sơ, nộp hồ sơ trực tuyến và biểu mẫu hành chính.'
}

const seoRules = [
  {
    test: (pathname) => pathname === '/',
    title: 'Trang chủ - Phường Cao Lãnh',
    description:
      'Tin tức mới nhất, thông báo và thông tin hành chính dành cho người dân Phường Cao Lãnh.'
  },
  {
    test: (pathname) => pathname === '/gioi-thieu',
    title: 'Giới thiệu - Phường Cao Lãnh',
    description: 'Thông tin tổng quan, lịch sử hình thành và định hướng phát triển của Phường Cao Lãnh.'
  },
  {
    test: (pathname) => pathname === '/articles' || /^\/articles\/\d+$/.test(pathname),
    title: 'Tin tức - Phường Cao Lãnh',
    description: 'Cập nhật tin tức, thông báo và các hoạt động nổi bật của địa phương.'
  },
  {
    test: (pathname) => pathname === '/services',
    title: 'Dịch vụ hành chính - Phường Cao Lãnh',
    description: 'Danh mục dịch vụ hành chính công và thông tin thủ tục tại Phường Cao Lãnh.'
  },
  {
    test: (pathname) => pathname === '/submit-application',
    title: 'Nộp hồ sơ trực tuyến - Phường Cao Lãnh',
    description: 'Nộp hồ sơ hành chính trực tuyến nhanh chóng, minh bạch và thuận tiện cho người dân.'
  },
  {
    test: (pathname) => pathname === '/tra-cuu-ho-so',
    title: 'Tra cứu hồ sơ - Phường Cao Lãnh',
    description: 'Tra cứu trạng thái xử lý hồ sơ theo mã tra cứu và số điện thoại đã đăng ký.'
  },
  {
    test: (pathname) => pathname === '/bieu-mau',
    title: 'Biểu mẫu tải về - Phường Cao Lãnh',
    description: 'Tải biểu mẫu hành chính phục vụ nộp hồ sơ và giao dịch hành chính công.'
  },
  {
    test: (pathname) => pathname === '/contact',
    title: 'Liên hệ - Phường Cao Lãnh',
    description: 'Gửi phản ánh, kiến nghị và liên hệ với bộ phận tiếp nhận thông tin của địa phương.'
  }
]

const getSeoForPath = (pathname) => {
  const matchedRule = seoRules.find((rule) => rule.test(pathname))
  return matchedRule ? { title: matchedRule.title, description: matchedRule.description } : defaultSeo
}

const ensureMetaTag = (selector, attributes) => {
  let element = document.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value)
    })
    document.head.appendChild(element)
  }
  return element
}

const ensureCanonicalTag = () => {
  let element = document.querySelector("link[rel='canonical']")
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  return element
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userRefreshKey, setUserRefreshKey] = useState(0)
  const [articleRefreshKey, setArticleRefreshKey] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  const getAuthenticatedLandingPath = (userData) => {
    const role = userData?.role
    if (role === 'Admin' || role === 'Editor') {
      return '/dashboard'
    }

    return '/'
  }

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

  useEffect(() => {
    const pathname = location.pathname || '/'
    const seo = getSeoForPath(pathname)
    const absoluteUrl = `${window.location.origin}${pathname}`

    document.title = seo.title

    const descriptionMeta = ensureMetaTag("meta[name='description']", { name: 'description' })
    descriptionMeta.setAttribute('content', seo.description)

    const ogTitleMeta = ensureMetaTag("meta[property='og:title']", { property: 'og:title' })
    ogTitleMeta.setAttribute('content', seo.title)

    const ogDescriptionMeta = ensureMetaTag("meta[property='og:description']", { property: 'og:description' })
    ogDescriptionMeta.setAttribute('content', seo.description)

    const ogUrlMeta = ensureMetaTag("meta[property='og:url']", { property: 'og:url' })
    ogUrlMeta.setAttribute('content', absoluteUrl)

    const twitterTitleMeta = ensureMetaTag("meta[name='twitter:title']", { name: 'twitter:title' })
    twitterTitleMeta.setAttribute('content', seo.title)

    const twitterDescriptionMeta = ensureMetaTag("meta[name='twitter:description']", { name: 'twitter:description' })
    twitterDescriptionMeta.setAttribute('content', seo.description)

    const canonicalTag = ensureCanonicalTag()
    canonicalTag.setAttribute('href', absoluteUrl)
  }, [location.pathname])

  const handleLoginSuccess = (userData, options = {}) => {
    setUser(userData)
    setIsLoggedIn(true)

    if (options.stayOnCurrentPath) {
      return
    }

    navigate(getAuthenticatedLandingPath(userData), { replace: true })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    setUser(null)
  }

  const handleUserUpdated = (updatedUser) => {
    setUser((previousUser) => {
      const nextUser = {
        ...(previousUser || {}),
        ...(updatedUser || {})
      }

      localStorage.setItem('user', JSON.stringify(nextUser))
      return nextUser
    })
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
              <div className="public-entry-page">
                <div className="container mx-auto px-4 pt-8 pb-10">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5">
                      <div className="entry-headline mb-6 text-center lg:text-left fx-fade-up">
                        <p className="entry-eyebrow">Hệ thống trực tuyến</p>
                        <h2>Vào hệ thống</h2>
                        <p>Truy cập nhanh các dịch vụ công, tra cứu hồ sơ và quản lý thông tin cá nhân.</p>
                      </div>
                      <LoginForm onLoginSuccess={handleLoginSuccess} />
                    </div>
                    <div className="lg:col-span-7 public-news-card fx-fade-up">
                      <ArticleList key={articleRefreshKey} />
                    </div>
                  </div>
                </div>
                <HomePage />
              </div>
            }
          />

          <Route
            path="/articles"
            element={
              <div className="public-window-shell container mx-auto py-12 px-4">
                <ArticleList key={articleRefreshKey} />
              </div>
            }
          />

          <Route path="/articles/:id" element={<ArticleDetail onLoginSuccess={handleLoginSuccess} />} />

          <Route path="/gioi-thieu" element={<AboutPage />} />

          <Route
            path="/contact"
            element={
              <div className="public-window-shell container mx-auto py-12 px-4">
                <ContactPage />
              </div>
            }
          />

          <Route
            path="/services"
            element={
              <div className="public-window-shell container mx-auto py-12 px-4">
                <ServiceList isLoggedIn={false} />
              </div>
            }
          />

          <Route
            path="/submit-application"
            element={<Navigate to="/services" replace />}
          />

          <Route
            path="/gallery"
            element={
              <div className="public-window-shell container mx-auto py-12 px-4">
                <Gallery user={null} />
              </div>
            }
          />

          <Route
            path="/tra-cuu-ho-so"
            element={
              <div className="public-window-shell container mx-auto py-12 px-4">
                <ApplicationLookup />
              </div>
            }
          />

          <Route
            path="/bieu-mau"
            element={
              <div className="public-window-shell container mx-auto py-12 px-4">
                <DownloadFormsPublic />
              </div>
            }
          />

          <Route
            path="/register"
            element={
              <div className="register-page-bg min-h-screen flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-6xl">
                <div className="mb-8 text-center fx-fade-up">
                  <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-blue-700 font-semibold">Cổng thông tin điện tử</p>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-2">Ward Website</h1>
                  <p className="text-slate-600 mt-2">Hệ thống đăng ký tài khoản và đồng bộ hồ sơ công dân</p>
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
        <Route path="/register" element={<Navigate to={getAuthenticatedLandingPath(user)} replace />} />

        {/* Article Detail Page */}
        <Route path="/articles/:id" element={<ArticleDetail onLoginSuccess={handleLoginSuccess} />} />

        {/* Dashboard Page */}
        <Route
          path="/dashboard"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <Dashboard />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Gallery Page */}
        <Route
          path="/gallery"
          element={
            <div className="container mx-auto py-12 px-4">
              <Gallery user={user} />
            </div>
          }
        />

        <Route
          path="/gallery/banner-editor/:mediaId"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <HomeBannerEditor user={user} />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/gallery/intro-editor/:mediaId"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <HomeIntroEditor user={user} />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
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

        <Route path="/gioi-thieu" element={<AboutPage />} />

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
                    <ArticleList key={articleRefreshKey} moderationMode={true} />
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
              <ServiceList isLoggedIn={true} />
            </div>
          }
        />

        <Route
          path="/submit-application"
          element={<Navigate to="/services" replace />}
        />

        <Route
          path="/tra-cuu-ho-so"
          element={
            <div className="container mx-auto py-12 px-4">
              <ApplicationLookup />
            </div>
          }
        />

        <Route
          path="/bieu-mau"
          element={
            <div className="container mx-auto py-12 px-4">
              <DownloadFormsPublic />
            </div>
          }
        />

        <Route
          path="/ho-so-ca-nhan"
          element={
            <div className="container mx-auto py-12 px-4">
              <ProfilePage user={user} onUserUpdated={handleUserUpdated} />
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

        <Route
          path="/quan-ly-danh-muc"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <CategoryManagement />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/quan-ly-dich-vu"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <ServiceManagement />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/quan-ly-bieu-mau"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <DownloadFormsManagement />
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

        <Route
          path="/kiem-duyet-binh-luan"
          element={
            (user?.role === 'Admin' || user?.role === 'Editor') ? (
              <div className="container mx-auto py-12 px-4">
                <CommentModeration />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <ContactMessagesBubble />
    </>
  )
}

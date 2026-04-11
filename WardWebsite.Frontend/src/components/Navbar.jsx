import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'

export default function Navbar({ isLoggedIn, user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)
  const [isInfoMenuOpen, setIsInfoMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    setIsOpen(false)
    setIsAdminMenuOpen(false)
    setIsInfoMenuOpen(false)
    navigate('/')
  }

  const primaryLinks = [
    { label: 'Tin tức', path: '/articles' },
    { label: 'Dịch vụ', path: '/services' },
    { label: 'Tra cứu hồ sơ', path: '/tra-cuu-ho-so' },
    { label: 'Biểu mẫu', path: '/bieu-mau' },
  ]

  const infoLinks = [
    { label: 'Giới thiệu', path: '/gioi-thieu' },
    { label: 'Thư viện', path: '/gallery' },
    { label: 'Liên hệ', path: '/contact' },
  ]

  const canAccessManagement = user?.role === 'Admin' || user?.role === 'Editor'
  const adminMenu = []

  if (isLoggedIn && canAccessManagement) {
    adminMenu.push({ label: 'Bảng điều khiển', path: '/dashboard' })
    adminMenu.push({ label: 'Quản lý hồ sơ', path: '/applications' })
    adminMenu.push({ label: 'Quản lý biểu mẫu', path: '/quan-ly-bieu-mau' })
    adminMenu.push({ label: 'Quản lý danh mục', path: '/quan-ly-danh-muc' })
    adminMenu.push({ label: 'Quản lý dịch vụ', path: '/quan-ly-dich-vu' })
    adminMenu.push({ label: 'Kiểm duyệt bình luận', path: '/kiem-duyet-binh-luan' })

    if (user?.role === 'Admin') {
      adminMenu.push({ label: 'Phân quyền', path: '/phan-quyen' })
      adminMenu.push({ label: 'Tin nhắn liên hệ', path: '/tin-nhan-lien-he' })
      adminMenu.push({ label: 'Nhật ký hệ thống', path: '/nhat-ky-he-thong' })
    }
  }

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3 select-none">
            <Link
              to="/"
              className="group relative h-11 w-11 shrink-0 rounded-full flex items-center justify-center"
              aria-label="Về trang chủ"
              title="Về trang chủ"
            >
              <span className="absolute -inset-1 rounded-full bg-yellow-300/35 blur-[1px] animate-pulse" aria-hidden="true" />
              <span className="absolute -inset-2 rounded-full border border-yellow-300/40 animate-ping [animation-duration:2.2s]" aria-hidden="true" />
              <span className="relative h-11 w-11 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 border border-yellow-300/80 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.6)] transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                <span className="h-8 w-8 rounded-full bg-red-600 border border-yellow-300/90 shadow-inner flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.95)]" aria-hidden="true">
                    <path d="M12 2l2.35 4.76 5.25.76-3.8 3.7.9 5.22L12 14l-4.7 2.47.9-5.22-3.8-3.7 5.25-.76L12 2z" />
                  </svg>
                </span>
              </span>
            </Link>
            <div className="leading-tight">
              <p className="font-bold text-xl">Phường Cao Lãnh</p>
              <p className="text-[11px] uppercase tracking-wider text-blue-100">Cổng thông tin điện tử</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-2 flex-1 justify-center items-center">
            {primaryLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-4 py-2 rounded-lg hover:bg-blue-500 transition text-sm font-medium fx-button-pop"
                onMouseEnter={() => {
                  setIsInfoMenuOpen(false)
                  setIsAdminMenuOpen(false)
                }}
              >
                {link.label}
              </Link>
            ))}

            <div className="relative group">
              <button
                type="button"
                className="px-4 py-2 rounded-lg hover:bg-blue-500 transition text-sm font-medium fx-button-pop"
                onClick={() => {
                  setIsInfoMenuOpen((value) => !value)
                  setIsAdminMenuOpen(false)
                }}
                onMouseEnter={() => {
                  setIsInfoMenuOpen(true)
                  setIsAdminMenuOpen(false)
                }}
              >
                Thông tin ▾
              </button>
              {isInfoMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 z-50"
                  onMouseLeave={() => setIsInfoMenuOpen(false)}
                >
                  {infoLinks.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-4 py-2 hover:bg-blue-50"
                      onClick={() => setIsInfoMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {isLoggedIn && adminMenu.length > 0 && (
              <div className="relative group">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg hover:bg-blue-500 transition text-sm font-medium fx-button-pop"
                  onClick={() => {
                    setIsAdminMenuOpen((v) => !v)
                    setIsInfoMenuOpen(false)
                  }}
                  onMouseEnter={() => {
                    setIsAdminMenuOpen(true)
                    setIsInfoMenuOpen(false)
                  }}
                >
                  Quản trị ▾
                </button>
                {isAdminMenuOpen && (
                  <div
                    className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 z-50"
                    onMouseLeave={() => setIsAdminMenuOpen(false)}
                  >
                    {adminMenu.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="block px-4 py-2 hover:bg-blue-50"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Link
                  to="/ho-so-ca-nhan"
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition fx-button-pop"
                >
                  Hồ sơ
                </Link>

                <NotificationBell user={user} />

                <div className="flex items-center space-x-2 bg-blue-500 px-4 py-2 rounded-lg">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-blue-200"
                    />
                  ) : (
                    <span className="font-medium">👤</span>
                  )}
                  <span className="font-medium">{user?.fullName || user?.username}</span>
                  <span className="px-2 py-1 bg-blue-600 rounded text-xs font-bold">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition fx-button-pop"
                >
                  Đăng Xuất
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-medium transition fx-button-pop"
              >
                Đăng Nhập
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden hover:bg-blue-500 p-2 rounded-lg transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-blue-700 pb-4">
            {primaryLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 hover:bg-blue-600 rounded font-medium"
              >
                {item.label}
              </Link>
            ))}

            <details className="px-4 py-2">
              <summary className="cursor-pointer font-medium">Thông tin</summary>
              <div className="mt-2 space-y-1">
                {infoLinks.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 hover:bg-blue-600 rounded"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>

            {isLoggedIn && adminMenu.length > 0 && (
              <details className="px-4 py-2">
                <summary className="cursor-pointer font-medium">Quản trị</summary>
                <div className="mt-2 space-y-1">
                  {adminMenu.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 hover:bg-blue-600 rounded"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            )}

            <div className="border-t border-blue-500 pt-4 mt-4 px-4">
              {isLoggedIn ? (
                <>
                  <div className="mb-3 text-sm">
                    <p className="font-medium">{user?.fullName || user?.username}</p>
                    <p className="text-blue-200 text-xs">Vai trò: {user?.role}</p>
                  </div>

                  <div className="mb-3">
                    <NotificationBell
                      user={user}
                      onItemClick={() => setIsOpen(false)}
                    />
                  </div>

                  <Link
                    to="/ho-so-ca-nhan"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition mb-2"
                  >
                    Hồ sơ cá nhân
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition"
                  >
                    Đăng Xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-medium transition"
                >
                  Đăng Nhập
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

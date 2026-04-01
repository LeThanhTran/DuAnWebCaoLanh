import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar({ isLoggedIn, user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    setIsOpen(false)
    navigate('/')
  }

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Tin tức', path: '/articles' },
    { label: 'Dịch vụ', path: '/services' },
    { label: 'Thư viện', path: '/gallery' },
    { label: 'Liên hệ', path: '/contact' },
  ]

  const adminMenu = []

  if (isLoggedIn) {
    adminMenu.push({ label: 'Bảng điều khiển', path: '/dashboard' })
    if (user?.role === 'Admin' || user?.role === 'Editor') {
      adminMenu.push({ label: 'Quản lý hồ sơ', path: '/applications' })
    }
    if (user?.role === 'Admin') {
      adminMenu.push({ label: 'Phân quyền', path: '/phan-quyen' })
      adminMenu.push({ label: 'Tin nhắn liên hệ', path: '/tin-nhan-lien-he' })
      adminMenu.push({ label: 'Nhật ký hệ thống', path: '/nhat-ky-he-thong' })
    }
  } else {
    navLinks.push({ label: 'Nộp hồ sơ', path: '/submit-application' })
  }

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="font-bold text-2xl hover:text-blue-100 transition">
            Cao Lãnh
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-2 flex-1 justify-center items-center">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-4 py-2 rounded-lg hover:bg-blue-500 transition text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}

            {isLoggedIn && adminMenu.length > 0 && (
              <div className="relative group">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg hover:bg-blue-500 transition text-sm font-medium"
                  onClick={() => setIsAdminMenuOpen((v) => !v)}
                  onMouseEnter={() => setIsAdminMenuOpen(true)}
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
                <div className="flex items-center space-x-2 bg-blue-500 px-4 py-2 rounded-lg">
                  <span className="font-medium">👤 {user?.username}</span>
                  <span className="px-2 py-1 bg-blue-600 rounded text-xs font-bold">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition"
                >
                  Đăng Xuất
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-medium transition"
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
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 hover:bg-blue-600 rounded font-medium"
              >
                {link.label}
              </Link>
            ))}

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
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-blue-200 text-xs">Vai trò: {user?.role}</p>
                  </div>
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

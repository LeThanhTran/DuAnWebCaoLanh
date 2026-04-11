import { useState } from 'react'
import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { validateVietnamPhone } from '../utils/phone'

export default function RegisterForm({ onRegisterSuccess }) {
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    passwordConfirm: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!form.username || !form.fullName || !form.email || !form.phoneNumber || !form.address || !form.password) {
      setError('Vui lòng điền đầy đủ thông tin tài khoản và hồ sơ')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Email không hợp lệ')
      return
    }

    const phoneValidation = validateVietnamPhone(form.phoneNumber, { required: true })
    if (!phoneValidation.isValid) {
      setError(phoneValidation.message)
      return
    }

    if (form.password !== form.passwordConfirm) {
      setError('Mật khẩu không trùng khớp')
      return
    }

    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    try {
      setLoading(true)
      await axios.post('/api/register', {
        username: form.username,
        fullName: form.fullName,
        email: form.email,
        phoneNumber: phoneValidation.normalized,
        address: form.address,
        password: form.password,
        confirmPassword: form.passwordConfirm
      })
      
      // Auto-login after successful registration
      const loginResponse = await axios.post('/api/auth/login', {
        username: form.username,
        password: form.password
      })
      
      if (loginResponse.data.success) {
        localStorage.setItem('token', loginResponse.data.token)
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user))
        setMessage('✅ Đăng ký thành công! Đang vào hệ thống...')
        setForm({
          username: '',
          fullName: '',
          email: '',
          phoneNumber: '',
          address: '',
          password: '',
          passwordConfirm: ''
        })
        setTimeout(() => {
          onRegisterSuccess(loginResponse.data.user)
        }, 1000)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi đăng ký'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-shell w-full max-w-6xl">
      <div className="register-card fx-fade-up">
        <aside className="register-aside">
          <p className="register-aside-eyebrow">Cổng dịch vụ công</p>
          <h3>Tạo tài khoản công dân</h3>
          <p>
            Thông tin đăng ký sẽ được đồng bộ trực tiếp vào hồ sơ cá nhân để sử dụng xuyên suốt trong toàn bộ dịch vụ.
          </p>

          <div className="register-aside-list">
            <div>
              <span>01</span>
              <p>Điền thông tin hồ sơ chuẩn ngay từ bước đầu</p>
            </div>
            <div>
              <span>02</span>
              <p>Dùng email hoặc số điện thoại để đăng nhập</p>
            </div>
            <div>
              <span>03</span>
              <p>Quản lý chỉnh sửa hồ sơ linh hoạt trong trang cá nhân</p>
            </div>
          </div>
        </aside>

        <div className="register-main">
          <div className="register-heading">
            <h2>Đăng Ký Tài Khoản</h2>
            <p>Tạo tài khoản và khởi tạo hồ sơ cá nhân ngay từ đầu để sử dụng dịch vụ thuận tiện hơn.</p>
          </div>

          {message && (
            <div className="register-alert register-alert-success">
              {message}
            </div>
          )}

          {error && (
            <div className="register-alert register-alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="register-section">
              <p className="register-section-title">Thông tin hồ sơ</p>
              <div className="register-grid">
                <div>
                  <label className="register-label">Họ và tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="register-input"
                  />
                </div>

                <div>
                  <label className="register-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@email.com"
                    className="register-input"
                  />
                </div>

                <div>
                  <label className="register-label">Số điện thoại</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="09xxxxxxxx"
                    className="register-input"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="register-label">Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Số nhà, đường, phường/xã..."
                    className="register-input"
                  />
                </div>
              </div>
            </section>

            <section className="register-section">
              <p className="register-section-title">Thông tin tài khoản</p>
              <div className="register-grid">
                <div>
                  <label className="register-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Nhập username"
                    className="register-input"
                  />
                </div>

                <div>
                  <label className="register-label">Mật khẩu</label>
                  <div className="password-field-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Ít nhất 6 ký tự"
                      className="register-input password-field-input"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="register-full">
                  <label className="register-label">Xác nhận mật khẩu</label>
                  <div className="password-field-wrap">
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      name="passwordConfirm"
                      value={form.passwordConfirm}
                      onChange={handleChange}
                      placeholder="Nhập lại mật khẩu"
                      className="register-input password-field-input"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPasswordConfirm((previous) => !previous)}
                      aria-label={showPasswordConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="register-submit"
              >
                {loading ? 'Đang xử lý...' : 'Đăng Ký'}
              </button>
            </div>

            <p className="register-login-link">
              Đã có tài khoản?{' '}
              <a href="/" className="text-blue-600 hover:underline font-semibold">
                Đăng nhập
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

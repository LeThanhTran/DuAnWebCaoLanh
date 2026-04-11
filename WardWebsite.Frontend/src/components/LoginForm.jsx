import { useEffect, useState } from 'react'
import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { validateVietnamPhone } from '../utils/phone'

const REMEMBER_LOGIN_KEY = 'remembered_login_credentials'

export default function LoginForm({ onLoginSuccess, loginSuccessOptions = {} }) {
  const initialLoginForm = {
    username: '',
    password: ''
  }

  const initialForgotForm = {
    identifier: '',
    email: '',
    phoneNumber: '',
    newPassword: '',
    confirmNewPassword: ''
  }

  const [form, setForm] = useState({
    username: '',
    password: ''
  })
  const [forgotForm, setForgotForm] = useState(initialForgotForm)
  const [loading, setLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [showForgotForm, setShowForgotForm] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false)

  useEffect(() => {
    try {
      const rememberedRaw = localStorage.getItem(REMEMBER_LOGIN_KEY)
      if (!rememberedRaw) {
        return
      }

      const remembered = JSON.parse(rememberedRaw)
      if (remembered?.username) {
        setForm({
          username: remembered.username,
          password: ''
        })
        setRememberPassword(true)

        // Keep only username in remember-me to avoid storing raw password.
        localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({
          username: remembered.username
        }))
      }
    } catch {
      localStorage.removeItem(REMEMBER_LOGIN_KEY)
    }
  }, [])

  const syncRememberedCredentials = (username) => {
    if (rememberPassword) {
      localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ username }))
      return
    }

    localStorage.removeItem(REMEMBER_LOGIN_KEY)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.username || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    try {
      setLoading(true)
      const loginPayload = {
        username: form.username.trim(),
        password: form.password
      }
      const response = await axios.post('/api/auth/login', loginPayload)
      
      if (response.data.success) {
        // Lưu token vào localStorage
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        syncRememberedCredentials(loginPayload.username)
        
        // Reset form
        setForm(initialLoginForm)
        
        // Callback
        onLoginSuccess(response.data.user, loginSuccessOptions)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault()
    setForgotError('')
    setForgotMessage('')

    if (
      !forgotForm.identifier
      || !forgotForm.email
      || !forgotForm.phoneNumber
      || !forgotForm.newPassword
      || !forgotForm.confirmNewPassword
    ) {
      setForgotError('Vui lòng nhập đầy đủ thông tin xác thực và mật khẩu mới')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forgotForm.email)) {
      setForgotError('Email không hợp lệ')
      return
    }

    const phoneValidation = validateVietnamPhone(forgotForm.phoneNumber, { required: true })
    if (!phoneValidation.isValid) {
      setForgotError(phoneValidation.message)
      return
    }

    if (forgotForm.newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (forgotForm.newPassword !== forgotForm.confirmNewPassword) {
      setForgotError('Xác nhận mật khẩu mới không khớp')
      return
    }

    try {
      setForgotLoading(true)
      const response = await axios.post('/api/auth/forgot-password', {
        identifier: forgotForm.identifier.trim(),
        email: forgotForm.email.trim(),
        phoneNumber: phoneValidation.normalized,
        newPassword: forgotForm.newPassword,
        confirmNewPassword: forgotForm.confirmNewPassword
      })

      setForgotMessage(response.data?.message || 'Đặt lại mật khẩu thành công')
      setForgotForm(initialForgotForm)
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Không thể đặt lại mật khẩu lúc này')
    } finally {
      setForgotLoading(false)
    }
  }

  const toggleForgotMode = () => {
    setShowForgotForm((previous) => !previous)
    setError('')
    setForgotError('')
    setForgotMessage('')
  }

  const updateForgotField = (field, value) => {
    setForgotForm((previous) => ({
      ...previous,
      [field]: value
    }))
  }

  return (
    <div className="auth-shell fx-fade-up">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-eyebrow">Cổng dịch vụ công</p>
          <h2>{showForgotForm ? 'Khôi phục mật khẩu' : 'Đăng nhập tài khoản'}</h2>
          <p>
            {showForgotForm
              ? 'Xác thực bằng thông tin đã đăng ký để đặt lại mật khẩu nhanh chóng.'
              : 'Đăng nhập bằng username, email hoặc số điện thoại để truy cập hệ thống.'}
          </p>
        </div>

        {!showForgotForm && error && (
          <div className="auth-alert auth-alert-error">{error}</div>
        )}

        {!showForgotForm ? (
          <form onSubmit={handleSubmit} className="auth-form space-y-4" autoComplete="on">
            <div>
              <label className="auth-label">Tài khoản</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="auth-input"
                placeholder="Username / Email / Số điện thoại"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="auth-label">Mật khẩu</label>
              <div className="password-field-wrap">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="auth-input password-field-input"
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowLoginPassword((previous) => !previous)}
                  aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-remember-row">
              <label className="auth-remember-label">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setRememberPassword(checked)
                    if (!checked) {
                      localStorage.removeItem(REMEMBER_LOGIN_KEY)
                    }
                  }}
                />
                Ghi nhớ tài khoản
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-primary-btn"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

          </form>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="auth-form space-y-4">
            {forgotMessage && <div className="auth-alert auth-alert-success">{forgotMessage}</div>}
            {forgotError && <div className="auth-alert auth-alert-error">{forgotError}</div>}

            <div>
              <label className="auth-label">Định danh tài khoản</label>
              <input
                type="text"
                value={forgotForm.identifier}
                onChange={(e) => updateForgotField('identifier', e.target.value)}
                className="auth-input"
                placeholder="Username hoặc email hoặc số điện thoại"
              />
            </div>

            <div className="auth-grid-2">
              <div>
                <label className="auth-label">Email đã đăng ký</label>
                <input
                  type="email"
                  value={forgotForm.email}
                  onChange={(e) => updateForgotField('email', e.target.value)}
                  className="auth-input"
                  placeholder="name@email.com"
                />
              </div>

              <div>
                <label className="auth-label">Số điện thoại đã đăng ký</label>
                <input
                  type="text"
                  value={forgotForm.phoneNumber}
                  onChange={(e) => updateForgotField('phoneNumber', e.target.value)}
                  className="auth-input"
                  placeholder="09xxxxxxxx"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="auth-grid-2">
              <div>
                <label className="auth-label">Mật khẩu mới</label>
                <div className="password-field-wrap">
                  <input
                    type={showForgotNewPassword ? 'text' : 'password'}
                    value={forgotForm.newPassword}
                    onChange={(e) => updateForgotField('newPassword', e.target.value)}
                    className="auth-input password-field-input"
                    placeholder="Ít nhất 6 ký tự"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowForgotNewPassword((previous) => !previous)}
                    aria-label={showForgotNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="auth-label">Xác nhận mật khẩu mới</label>
                <div className="password-field-wrap">
                  <input
                    type={showForgotConfirmPassword ? 'text' : 'password'}
                    value={forgotForm.confirmNewPassword}
                    onChange={(e) => updateForgotField('confirmNewPassword', e.target.value)}
                    className="auth-input password-field-input"
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowForgotConfirmPassword((previous) => !previous)}
                    aria-label={showForgotConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showForgotConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="auth-primary-btn"
            >
              {forgotLoading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <div className="auth-switch-row">
          <button type="button" onClick={toggleForgotMode} className="auth-text-btn">
            {showForgotForm ? 'Quay về đăng nhập' : 'Quên mật khẩu?'}
          </button>

          {!showForgotForm && (
            <p className="auth-note">
              Chưa có tài khoản?{' '}
              <a href="/register" className="auth-link-inline">
                Đăng ký ngay
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

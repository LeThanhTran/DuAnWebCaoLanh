import { useEffect, useState } from 'react'
import axios from 'axios'
import AuthActionLoginModal from './AuthActionLoginModal'
import { validateVietnamPhone } from '../utils/phone'

export default function ContactPage({
  user = null,
  isAuthenticated = false,
  onLoginSuccess,
  onUnauthorized,
  requireLoginOnEnter = false
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const token = localStorage.getItem('token')
  const isLoggedIn = Boolean(isAuthenticated && token)

  useEffect(() => {
    if (!user) {
      return
    }

    setForm((previous) => ({
      ...previous,
      name: previous.name || user.fullName || user.username || '',
      email: previous.email || user.email || '',
      phone: previous.phone || user.phoneNumber || ''
    }))
  }, [user])

  useEffect(() => {
    if (requireLoginOnEnter && !isLoggedIn) {
      setShowLoginModal(true)
    }
  }, [requireLoginOnEnter, isLoggedIn])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isLoggedIn) {
      setShowLoginModal(true)
      return
    }

    if (!form.name || !form.email || !form.message) return

    const phoneValidation = validateVietnamPhone(form.phone, { required: false })
    if (!phoneValidation.isValid) {
      alert(phoneValidation.message)
      return
    }

    try {
      await axios.post('/api/contactmessages', {
        name: form.name,
        email: form.email,
        phone: phoneValidation.normalized || null,
        message: form.message
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSubmitted(true)
      setForm((previous) => ({
        ...previous,
        message: ''
      }))
      setTimeout(() => setSubmitted(false), 3000)
    } catch (error) {
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        onUnauthorized?.()
        setShowLoginModal(true)
        return
      }

      alert(error.response?.data?.message || 'Gửi liên hệ thất bại')
    }
  }

  const closeLoginModal = () => {
    setShowLoginModal(false)
  }

  const handleLoginSuccess = (userData, options) => {
    onLoginSuccess?.(userData, {
      stayOnCurrentPath: true,
      ...(options || {})
    })
    setShowLoginModal(false)
  }

  return (
    <div className="contact-page space-y-6">
      <section className="contact-hero fx-fade-up">
        <div>
          <p className="contact-eyebrow">Kênh hỗ trợ công dân</p>
          <h2>Liên hệ UBND Phường Cao Lãnh</h2>
          <p>
            Gửi phản ánh, kiến nghị hoặc câu hỏi hành chính. Bộ phận tiếp nhận sẽ phản hồi trong thời gian sớm nhất.
          </p>
        </div>
        <div className="contact-hero-chip">
          <span>08:00 - 17:00</span>
          <small>Thứ Hai đến Thứ Sáu</small>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="contact-info-card fx-fade-up">
            <h3>Thông tin liên hệ</h3>

            <div className="contact-info-list">
              <div>
                <p>Địa chỉ</p>
                <strong>Phường Cao Lãnh, Thành phố Cao Lãnh, Tỉnh Đồng Tháp</strong>
              </div>

              <div>
                <p>Điện thoại</p>
                <strong>
                  <a href="tel:02773888888">0277 388 8888</a>
                </strong>
              </div>

              <div>
                <p>Email</p>
                <strong>
                  <a href="mailto:ubnd@caolanhward.gov.vn">ubnd@caolanhward.gov.vn</a>
                </strong>
              </div>

              <div>
                <p>Giờ làm việc</p>
                <strong>Thứ Hai - Thứ Sáu: 8:00 - 17:00</strong>
                <span>Thứ Bảy: 8:00 - 12:00 | Chủ Nhật: Nghỉ</span>
              </div>
            </div>
          </div>

          <div className="contact-map-card fx-fade-up">
            <iframe
              className="contact-map-iframe"
              title="UBND Cao Lãnh"
              src="https://www.google.com/maps?q=UBND+Th%C3%A0nh+ph%E1%BB%91+Cao+L%C3%A3nh,+%C4%90%E1%BB%93ng+Th%C3%A1p&output=embed"
              allowFullScreen=""
              loading="lazy"
            ></iframe>
          </div>
        </div>

        <div className="contact-form-card fx-fade-up">
          <h3>Gửi tin nhắn</h3>

          {submitted && (
            <div className="contact-success-message">
              Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.
            </div>
          )}

          {!isLoggedIn ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
              <p className="text-sm font-semibold">Bạn cần đăng nhập trước khi gửi liên hệ.</p>
              <p className="mt-1 text-xs text-amber-800">Vui lòng đăng nhập để hệ thống ghi nhận đúng thông tin người gửi.</p>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Đăng nhập để tiếp tục
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="contact-label">Họ tên *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nhập họ tên"
                  className="contact-input"
                  required
                />
              </div>

              <div className="contact-grid-2">
                <div>
                  <label className="contact-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Nhập email"
                    className="contact-input"
                    required
                  />
                </div>

                <div>
                  <label className="contact-label">Điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Nhập số điện thoại"
                    className="contact-input"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="contact-label">Tin nhắn *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Nhập nội dung tin nhắn"
                  rows="6"
                  className="contact-input contact-textarea"
                  required
                ></textarea>
              </div>

              <button type="submit" className="contact-submit-btn">
                Gửi liên hệ
              </button>
            </form>
          )}
        </div>
      </div>

      <AuthActionLoginModal
        open={showLoginModal}
        actionLabel="gửi liên hệ"
        onClose={closeLoginModal}
        onLoginSuccess={handleLoginSuccess}
        loginSuccessOptions={{ stayOnCurrentPath: true }}
      />
    </div>
  )
}

import { useState } from 'react'
import axios from 'axios'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return

    try {
      await axios.post('/api/contactmessages', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message
      })
      setSubmitted(true)
      setForm({ name: '', email: '', phone: '', message: '' })
      setTimeout(() => setSubmitted(false), 3000)
    } catch (error) {
      alert(error.response?.data?.message || 'Gửi liên hệ thất bại')
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-12">📞 Liên Hệ</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div>
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">UBND Phường Cao Lãnh</h3>

            <div className="space-y-6">
              <div>
                <p className="text-gray-600 font-medium">📍 Địa chỉ</p>
                <p className="text-gray-800 mt-1">Phường Cao Lãnh, Thành phố Cao Lãnh, Tỉnh Đồng Tháp</p>
              </div>

              <div>
                <p className="text-gray-600 font-medium">📱 Điện thoại</p>
                <p className="text-gray-800 mt-1">
                  <a href="tel:02773888888" className="text-blue-600 hover:underline">
                    0277 388 8888
                  </a>
                </p>
              </div>

              <div>
                <p className="text-gray-600 font-medium">✉️ Email</p>
                <p className="text-gray-800 mt-1">
                  <a href="mailto:ubnd@caolanhward.gov.vn" className="text-blue-600 hover:underline">
                    ubnd@caolanhward.gov.vn
                  </a>
                </p>
              </div>

              <div>
                <p className="text-gray-600 font-medium">🕐 Giờ làm việc</p>
                <p className="text-gray-800 mt-1">Thứ Hai - Thứ Sáu: 8:00 - 17:00</p>
                <p className="text-gray-800">Thứ Bảy: 8:00 - 12:00</p>
                <p className="text-gray-800">Chủ Nhật: Nghỉ</p>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-lg shadow overflow-hidden h-96">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              title="UBND Cao Lãnh"
              src="https://www.google.com/maps?q=UBND+Th%C3%A0nh+ph%E1%BB%91+Cao+L%C3%A3nh,+%C4%90%E1%BB%93ng+Th%C3%A1p&output=embed"
              allowFullScreen=""
              loading="lazy"
            ></iframe>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Gửi Tin Nhắn</h3>

          {submitted && (
            <div className="bg-green-100 text-green-800 p-4 rounded mb-6">
              ✅ Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Họ Tên *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nhập họ tên"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Nhập email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Điện Thoại</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Nhập số điện thoại"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Tin Nhắn *</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Nhập nội dung tin nhắn"
                rows="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

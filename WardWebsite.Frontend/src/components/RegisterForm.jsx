import { useState } from 'react'
import axios from 'axios'

export default function RegisterForm({ onRegisterSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', passwordConfirm: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!form.username || !form.password) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (form.password !== form.passwordConfirm) {
      setError('Mật khẩu không trùng khớp')
      return
    }

    try {
      setLoading(true)
      await axios.post('/api/register', {
        username: form.username,
        password: form.password
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
        setForm({ username: '', password: '', passwordConfirm: '' })
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
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Đăng Ký Tài Khoản</h2>

        {message && (
          <div className="bg-green-100 text-green-800 p-4 rounded mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Nhập username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Mật Khẩu</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Xác Nhận Mật Khẩu</label>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="Xác nhận mật khẩu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Ký'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-4">
          Đã có tài khoản?{' '}
          <a href="/" className="text-blue-600 hover:underline">
            Đăng nhập
          </a>
        </p>
      </div>
    </div>
  )
}

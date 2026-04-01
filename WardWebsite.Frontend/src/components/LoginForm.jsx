import { useState } from 'react'
import axios from 'axios'

export default function LoginForm({ onLoginSuccess }) {
  const [form, setForm] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.username || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('/api/auth/login', form)
      
      if (response.data.success) {
        // Lưu token vào localStorage
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        // Reset form
        setForm({ username: '', password: '' })
        
        // Callback
        onLoginSuccess(response.data.user)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    try {
      setLoading(true)
      const response = await axios.post('/api/auth/login', {
        username: 'demo',
        password: '123456'
      })
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setForm({ username: '', password: '' })
        onLoginSuccess(response.data.user)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đăng nhập Demo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-3xl font-bold mb-2 text-gray-800">Đăng Nhập</h2>
      <p className="text-gray-600 mb-6">Vào hệ thống quản lý Cao Lãnh</p>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tài khoản
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nhập tài khoản"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mật khẩu
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nhập mật khẩu"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 font-bold text-lg transition shadow-md hover:shadow-lg"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 font-bold text-lg transition shadow-md hover:shadow-lg"
        >
          {loading ? 'Đang vào...' : 'Đăng nhập nhanh'}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Chưa có tài khoản?{' '}
        <a href="/register" className="text-blue-600 hover:text-blue-800 font-bold">
          Đăng ký ngay
        </a>
      </p>
    </div>
  )
}

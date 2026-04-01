import { useState } from 'react'
import axios from 'axios'

export default function UserForm({ onUserCreated }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    roleId: 3 // Default: Viewer
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      alert('Vui lòng nhập đầy đủ thông tin')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      await axios.post('/api/users', form, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setForm({ username: '', password: '', roleId: 3 })
      onUserCreated()
      alert('Tạo user thành công')
    } catch (error) {
      alert('Lỗi: ' + error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Tạo User Mới</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={form.roleId}
            onChange={(e) => setForm({ ...form, roleId: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Admin</option>
            <option value={2}>Editor</option>
            <option value={3}>Viewer</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Đang tạo...' : 'Tạo User'}
        </button>
      </form>
    </div>
  )
}

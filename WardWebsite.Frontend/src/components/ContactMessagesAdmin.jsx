import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

export default function ContactMessagesAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/contactmessages', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setItems(response.data?.data || [])
    } catch (error) {
      alert(error.response?.data?.message || 'Không tải được danh sách liên hệ')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkHandled = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`/api/contactmessages/${id}/handled`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      fetchItems()
    } catch (error) {
      alert(error.response?.data?.message || 'Cập nhật trạng thái thất bại')
    }
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tin nhắn liên hệ</h2>
        <p className="text-red-600">Chỉ Admin mới có quyền xem phần này.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Tin nhắn liên hệ</h2>
      {loading ? (
        <p className="text-gray-600">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Người gửi</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Điện thoại</th>
                <th className="px-4 py-3 text-left">Nội dung</th>
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.phone || '-'}</td>
                  <td className="px-4 py-3 max-w-xs">{item.message}</td>
                  <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    {item.isHandled ? (
                      <span className="text-green-700 font-medium">Đã xử lý</span>
                    ) : (
                      <button
                        onClick={() => handleMarkHandled(item.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Đánh dấu đã xử lý
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">Chưa có tin nhắn liên hệ nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

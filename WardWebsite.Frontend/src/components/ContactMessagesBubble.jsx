import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

export default function ContactMessagesBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])

  const isAdmin = currentUser?.role === 'Admin'

  useEffect(() => {
    if (!isAdmin) return
    fetchMessages()
    const timer = setInterval(fetchMessages, 30000)
    return () => clearInterval(timer)
  }, [isAdmin])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/contactmessages', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setMessages(res.data?.data || [])
    } catch {
      // Keep bubble silent on fetch failure to avoid interrupting the user.
    } finally {
      setLoading(false)
    }
  }

  const markHandled = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`/api/contactmessages/${id}/handled`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      fetchMessages()
    } catch {
      alert('Không thể cập nhật trạng thái tin nhắn')
    }
  }

  if (!isAdmin) return null

  const unhandled = messages.filter((m) => !m.isHandled)

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-96 max-w-[92vw] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
            <h3 className="font-semibold">Tin nhắn liên hệ</h3>
            <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white">✕</button>
          </div>

          <div className="max-h-96 overflow-y-auto p-3 space-y-3">
            {loading && <p className="text-sm text-gray-500">Đang tải...</p>}
            {!loading && messages.length === 0 && <p className="text-sm text-gray-500">Chưa có tin nhắn.</p>}

            {messages.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${item.isHandled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.isHandled ? 'Đã xử lý' : 'Chưa xử lý'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{item.email} {item.phone ? `- ${item.phone}` : ''}</p>
                <p className="text-sm text-gray-800 mt-2">{item.message}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                  {!item.isHandled && (
                    <button
                      onClick={() => markHandled(item.id)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Đánh dấu đã xử lý
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition"
        title="Tin nhắn liên hệ"
      >
        📨
        {unhandled.length > 0 && (
          <span className="absolute -top-1 -right-1 h-6 min-w-[24px] px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unhandled.length}
          </span>
        )}
      </button>
    </div>
  )
}

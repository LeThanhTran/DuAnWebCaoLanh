import { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [targetFilter, setTargetFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, actionFilter, targetFilter, keyword, fromDate, toDate])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })

      if (keyword.trim()) params.append('keyword', keyword.trim())
      if (actionFilter !== 'ALL') params.append('action', actionFilter)
      if (targetFilter !== 'ALL') params.append('targetType', targetFilter)
      if (fromDate) params.append('startDate', fromDate)
      if (toDate) params.append('endDate', toDate)

      const response = await axios.get(`/api/adminlogs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setLogs(response.data?.data || [])
      setTotalPages(response.data?.pagination?.totalPages || 1)
    } catch (error) {
      setError(error.response?.data?.message || 'Không tải được nhật ký hệ thống')
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setKeyword('')
    setActionFilter('ALL')
    setTargetFilter('ALL')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Nhật ký thao tác quản trị</h2>
      <p className="text-gray-600 mb-6">Theo dõi hành động của quản trị viên theo thời gian thực.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
          placeholder="Tìm theo người dùng, hành động, chi tiết"
          className="border border-gray-300 rounded px-3 py-2"
        />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="ALL">Tất cả hành động</option>
          <option value="Tạo bài viết">Tạo bài viết</option>
          <option value="Cập nhật bài viết">Cập nhật bài viết</option>
          <option value="Xóa bài viết">Xóa bài viết</option>
          <option value="Đổi vai trò người dùng">Đổi vai trò người dùng</option>
          <option value="Tạo người dùng">Tạo người dùng</option>
          <option value="Xóa người dùng">Xóa người dùng</option>
          <option value="Cập nhật trạng thái hồ sơ">Cập nhật trạng thái hồ sơ</option>
          <option value="Xóa hồ sơ">Xóa hồ sơ</option>
          <option value="Đánh dấu liên hệ đã xử lý">Đánh dấu liên hệ đã xử lý</option>
        </select>
        <select
          value={targetFilter}
          onChange={(e) => { setTargetFilter(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="ALL">Tất cả đối tượng</option>
          <option value="Article">Bài viết</option>
          <option value="User">Người dùng</option>
          <option value="Application">Hồ sơ</option>
          <option value="ContactMessage">Liên hệ</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1) }}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Bộ lọc đang áp dụng</span>
        </div>
        <div className="flex gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>{size} bản ghi</option>
            ))}
          </select>
          <button onClick={resetFilters} className="px-3 py-2 border rounded hover:bg-gray-100 text-sm">Xóa bộ lọc</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="mb-4 border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Chưa có bản ghi nhật ký nào.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-left">Quản trị viên</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                  <th className="px-4 py-3 text-left">Đối tượng</th>
                  <th className="px-4 py-3 text-left">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3">{item.adminUsername}</td>
                    <td className="px-4 py-3">{item.action}</td>
                    <td className="px-4 py-3">{item.targetType}{item.targetId ? ` #${item.targetId}` : ''}</td>
                    <td className="px-4 py-3">{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">Trang {page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </>
      )}
    </div>
  )
}

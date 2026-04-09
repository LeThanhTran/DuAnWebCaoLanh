import { useEffect, useState } from 'react'
import axios from 'axios'

const undoTypeLabels = {
  SERVICE_SOFT_DELETE: 'Khôi phục dịch vụ đã xóa',
  CATEGORY_SOFT_DELETE: 'Khôi phục danh mục đã xóa',
  ARTICLE_SOFT_DELETE: 'Khôi phục bài viết đã xóa',
  DOWNLOAD_FORM_SOFT_DELETE: 'Khôi phục biểu mẫu đã xóa'
}

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
  const [retentionDays, setRetentionDays] = useState(90)
  const [retentionLoading, setRetentionLoading] = useState(false)
  const [undoLoading, setUndoLoading] = useState(false)
  const [bulkUndoLoading, setBulkUndoLoading] = useState(false)
  const [retentionMessage, setRetentionMessage] = useState('')
  const [retentionError, setRetentionError] = useState('')
  const [retentionPreview, setRetentionPreview] = useState(null)
  const [selectedLogIds, setSelectedLogIds] = useState([])
  const [undoActionMessage, setUndoActionMessage] = useState('')
  const [undoActionError, setUndoActionError] = useState('')

  const getAuthConfig = () => {
    const token = localStorage.getItem('token')
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, actionFilter, targetFilter, keyword, fromDate, toDate])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })

      if (keyword.trim()) params.append('keyword', keyword.trim())
      if (actionFilter !== 'ALL') params.append('action', actionFilter)
      if (targetFilter !== 'ALL') params.append('targetType', targetFilter)
      if (fromDate) params.append('startDate', fromDate)
      if (toDate) params.append('endDate', toDate)

      const response = await axios.get(`/api/adminlogs?${params.toString()}`, getAuthConfig())
      setLogs(response.data?.data || [])
      setTotalPages(response.data?.pagination?.totalPages || 1)
      setSelectedLogIds([])
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
    setSelectedLogIds([])
  }

  const handlePreviewRetention = async () => {
    const parsedDays = Number(retentionDays)
    if (!Number.isInteger(parsedDays) || parsedDays < 7) {
      setRetentionError('Số ngày lưu phải là số nguyên từ 7 trở lên')
      return
    }

    try {
      setRetentionLoading(true)
      setRetentionError('')
      setRetentionMessage('')

      const response = await axios.get(
        `/api/adminlogs/retention/preview?retentionDays=${parsedDays}`,
        getAuthConfig()
      )

      setRetentionPreview(response.data)
    } catch (previewError) {
      setRetentionError(previewError.response?.data?.message || 'Không thể xem trước dữ liệu dọn nhật ký')
    } finally {
      setRetentionLoading(false)
    }
  }

  const handlePurgeRetention = async () => {
    const parsedDays = Number(retentionDays)
    if (!Number.isInteger(parsedDays) || parsedDays < 7) {
      setRetentionError('Số ngày lưu phải là số nguyên từ 7 trở lên')
      return
    }

    const confirmed = window.confirm(
      `Xóa toàn bộ nhật ký cũ hơn ${parsedDays} ngày? Hành động này không thể hoàn tác.`
    )
    if (!confirmed) {
      return
    }

    try {
      setRetentionLoading(true)
      setRetentionError('')
      setRetentionMessage('')

      const response = await axios.delete(
        `/api/adminlogs/retention/purge?retentionDays=${parsedDays}`,
        getAuthConfig()
      )

      setRetentionMessage(response.data?.message || 'Đã dọn nhật ký thành công')
      await Promise.all([fetchLogs(), handlePreviewRetention()])
    } catch (purgeError) {
      setRetentionError(purgeError.response?.data?.message || 'Không thể dọn nhật ký lúc này')
    } finally {
      setRetentionLoading(false)
    }
  }

  const handleUndoRetention = async () => {
    const confirmed = window.confirm(
      'Hoàn tác lần xóa nhật ký gần nhất? Hệ thống sẽ khôi phục lại các bản ghi vừa bị xóa.'
    )
    if (!confirmed) {
      return
    }

    try {
      setUndoLoading(true)
      setRetentionError('')
      setRetentionMessage('')

      const response = await axios.post('/api/adminlogs/retention/undo-last', {}, getAuthConfig())

      setRetentionMessage(response.data?.message || 'Đã hoàn tác lần dọn nhật ký gần nhất')
      await Promise.all([fetchLogs(), handlePreviewRetention()])
    } catch (undoError) {
      setRetentionError(undoError.response?.data?.message || 'Không thể hoàn tác lúc này')
    } finally {
      setUndoLoading(false)
    }
  }

  const selectableLogIds = logs.filter((item) => item.canUndo).map((item) => item.id)
  const selectedUndoableIds = selectedLogIds.filter((id) => selectableLogIds.includes(id))
  const allUndoableSelected =
    selectableLogIds.length > 0 && selectedUndoableIds.length === selectableLogIds.length

  const handleToggleLogSelection = (logId) => {
    setSelectedLogIds((prev) => (
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    ))
  }

  const handleToggleSelectAllUndoable = () => {
    if (allUndoableSelected) {
      setSelectedLogIds([])
      return
    }

    setSelectedLogIds(selectableLogIds)
  }

  const handleUndoSelectedLogs = async () => {
    if (selectedUndoableIds.length === 0) {
      setUndoActionError('Vui lòng chọn ít nhất một thao tác có thể hoàn tác')
      setUndoActionMessage('')
      return
    }

    const confirmed = window.confirm(
      `Hoàn tác ${selectedUndoableIds.length} thao tác đã chọn? Hệ thống sẽ cố gắng khôi phục các mục tương ứng.`
    )

    if (!confirmed) {
      return
    }

    try {
      setBulkUndoLoading(true)
      setUndoActionError('')
      setUndoActionMessage('')

      const response = await axios.post(
        '/api/adminlogs/undo',
        { logIds: selectedUndoableIds },
        getAuthConfig()
      )

      const restoredCount = response.data?.restoredCount || 0
      const failedCount = response.data?.failedCount || 0
      const unsupportedCount = response.data?.unsupportedCount || 0
      const message = response.data?.message || 'Đã xử lý yêu cầu hoàn tác'
      const failedPreview = (response.data?.results || [])
        .filter((result) => !result.success)
        .slice(0, 3)
        .map((result) => `- Log #${result.logId}: ${result.message}`)
      const detailText = failedPreview.length > 0
        ? `\nChi tiết:\n${failedPreview.join('\n')}`
        : ''

      setUndoActionMessage(
        `${message}. Thành công: ${restoredCount}. Thất bại: ${failedCount}. Không hỗ trợ: ${unsupportedCount}.${detailText}`
      )
      setSelectedLogIds([])
      await fetchLogs()
    } catch (undoError) {
      setUndoActionError(undoError.response?.data?.message || 'Không thể hoàn tác thao tác đã chọn')
    } finally {
      setBulkUndoLoading(false)
    }
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
          <option value="Hoàn tác xóa bài viết">Hoàn tác xóa bài viết</option>
          <option value="Tạo danh mục">Tạo danh mục</option>
          <option value="Cập nhật danh mục">Cập nhật danh mục</option>
          <option value="Xóa danh mục">Xóa danh mục</option>
          <option value="Hoàn tác xóa danh mục">Hoàn tác xóa danh mục</option>
          <option value="Tải biểu mẫu">Tải biểu mẫu</option>
          <option value="Cập nhật biểu mẫu">Cập nhật biểu mẫu</option>
          <option value="Xóa biểu mẫu">Xóa biểu mẫu</option>
          <option value="Hoàn tác xóa biểu mẫu">Hoàn tác xóa biểu mẫu</option>
          <option value="Đổi vai trò người dùng">Đổi vai trò người dùng</option>
          <option value="Tạo người dùng">Tạo người dùng</option>
          <option value="Xóa người dùng">Xóa người dùng</option>
          <option value="Cập nhật trạng thái hồ sơ">Cập nhật trạng thái hồ sơ</option>
          <option value="Xóa hồ sơ">Xóa hồ sơ</option>
          <option value="Xóa dịch vụ">Xóa dịch vụ</option>
          <option value="Hoàn tác xóa dịch vụ">Hoàn tác xóa dịch vụ</option>
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
          <option value="Service">Dịch vụ</option>
          <option value="Category">Danh mục</option>
          <option value="DownloadForm">Biểu mẫu</option>
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

      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Dọn nhật ký cũ (Retention)</p>
        <p className="text-xs text-amber-800 mt-1">
          Khuyến nghị giữ 60-90 ngày. Hệ thống sẽ chỉ xóa bản ghi cũ hơn số ngày bạn chọn.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={7}
            value={retentionDays}
            onChange={(event) => setRetentionDays(event.target.value)}
            className="w-28 border border-amber-300 rounded px-3 py-2 text-sm"
          />
          <span className="text-sm text-amber-900">ngày</span>

          <button
            type="button"
            onClick={handlePreviewRetention}
            disabled={retentionLoading}
            className="px-3 py-2 text-sm rounded border border-amber-300 bg-white hover:bg-amber-100 disabled:opacity-60"
          >
            Xem trước
          </button>

          <button
            type="button"
            onClick={handlePurgeRetention}
            disabled={retentionLoading || undoLoading}
            className="px-3 py-2 text-sm rounded border border-red-300 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {retentionLoading ? 'Đang xử lý...' : 'Xóa log cũ'}
          </button>

          <button
            type="button"
            onClick={handleUndoRetention}
            disabled={retentionLoading || undoLoading}
            className="px-3 py-2 text-sm rounded border border-sky-300 bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {undoLoading ? 'Đang hoàn tác...' : 'Hoàn tác lần xóa gần nhất'}
          </button>
        </div>

        {retentionPreview && (
          <div className="mt-2 text-xs text-amber-900">
            Dự kiến xóa: <strong>{retentionPreview.deleteCount || 0}</strong> bản ghi
            {retentionPreview.cutoffUtc && (
              <span> (cũ hơn {new Date(retentionPreview.cutoffUtc).toLocaleString('vi-VN')})</span>
            )}
          </div>
        )}

        {retentionMessage && <p className="mt-2 text-xs text-green-700">{retentionMessage}</p>}
        {retentionError && <p className="mt-2 text-xs text-red-700">{retentionError}</p>}
      </div>

      <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm font-semibold text-sky-900">Hoàn tác thao tác từ nhật ký</p>
        <p className="text-xs text-sky-800 mt-1">
          Tích chọn các bản ghi có thể hoàn tác rồi bấm nút bên dưới. Hiện hỗ trợ: xóa dịch vụ, xóa danh mục, xóa bài viết, xóa biểu mẫu.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndoSelectedLogs}
            disabled={
              bulkUndoLoading
              || retentionLoading
              || undoLoading
              || selectedUndoableIds.length === 0
            }
            className="px-3 py-2 text-sm rounded border border-sky-300 bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {bulkUndoLoading ? 'Đang hoàn tác...' : `Hoàn tác đã chọn (${selectedUndoableIds.length})`}
          </button>

          <button
            type="button"
            onClick={handleToggleSelectAllUndoable}
            disabled={selectableLogIds.length === 0 || bulkUndoLoading}
            className="px-3 py-2 text-sm rounded border border-sky-300 bg-white hover:bg-sky-100 disabled:opacity-60"
          >
            {allUndoableSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả có thể hoàn tác'}
          </button>

          <span className="text-xs text-sky-900">
            Có thể hoàn tác trên trang này: <strong>{selectableLogIds.length}</strong>
          </span>
        </div>

        {undoActionMessage && <p className="mt-2 text-xs text-green-700 whitespace-pre-line">{undoActionMessage}</p>}
        {undoActionError && <p className="mt-2 text-xs text-red-700">{undoActionError}</p>}
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
                  <th className="px-4 py-3 text-left w-14">
                    <input
                      type="checkbox"
                      checked={allUndoableSelected}
                      onChange={handleToggleSelectAllUndoable}
                      disabled={selectableLogIds.length === 0 || bulkUndoLoading}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-left">Quản trị viên</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                  <th className="px-4 py-3 text-left">Đối tượng</th>
                  <th className="px-4 py-3 text-left">Trạng thái hoàn tác</th>
                  <th className="px-4 py-3 text-left">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => {
                  const undoTypeLabel = item.undoType ? (undoTypeLabels[item.undoType] || item.undoType) : null
                  const undoReason = item.undoReason || 'Hành động này hiện chưa hỗ trợ hoàn tác'

                  return (
                    <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLogIds.includes(item.id)}
                          onChange={() => handleToggleLogSelection(item.id)}
                          disabled={!item.canUndo || bulkUndoLoading}
                          title={item.canUndo ? 'Chọn để hoàn tác' : undoReason}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.adminUsername}</td>
                      <td className="px-4 py-3">{item.action}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.targetType}{item.targetId ? ` #${item.targetId}` : ''}</td>
                      <td className="px-4 py-3 min-w-[300px]">
                        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${item.canUndo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                          {item.canUndo ? 'Có thể hoàn tác' : 'Không thể hoàn tác'}
                        </div>

                        {undoTypeLabel && (
                          <div className="mt-1 text-xs text-sky-700 font-medium">{undoTypeLabel}</div>
                        )}

                        {!item.canUndo && (
                          <div className="mt-1 text-xs text-amber-700">{undoReason}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[300px] text-gray-700">{item.details || '-'}</td>
                    </tr>
                  )
                })}
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

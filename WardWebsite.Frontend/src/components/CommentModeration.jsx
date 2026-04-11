import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteCommentById,
  getCommentsForModeration,
  updateCommentStatus
} from '../services/articleService'
import Toast from './Toast'

const moderationStatuses = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
  { value: 'Hidden', label: 'Ẩn' }
]

const statusClassMap = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Hidden: 'bg-gray-100 text-gray-700'
}

const statusLabelMap = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Hidden: 'Ẩn'
}

export default function CommentModeration() {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [selectedCommentIds, setSelectedCommentIds] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [toast, setToast] = useState({ message: '', type: 'info' })

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selectedCount = selectedCommentIds.length
  const isBusy = processingId !== null
  const isAllCurrentPageSelected = comments.length > 0
    && comments.every((item) => selectedCommentIds.includes(item.id))

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    window.setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
  }

  useEffect(() => {
    fetchComments()
  }, [page, statusFilter, searchTerm])

  useEffect(() => {
    setSelectedCommentIds((previous) => previous.filter((id) => comments.some((item) => item.id === id)))
  }, [comments])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await getCommentsForModeration(page, pageSize, {
        status: statusFilter === 'ALL' ? null : statusFilter,
        search: searchTerm
      })
      setComments(response.data || [])
      setTotal(response.total || 0)
    } catch (error) {
      showToast(error || 'Không tải được danh sách bình luận', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleModerate = async (id, status) => {
    try {
      const note = status === 'Rejected' || status === 'Hidden'
        ? window.prompt('Ghi chú kiểm duyệt (không bắt buộc):', '') || ''
        : ''

      setProcessingId(id)
      await updateCommentStatus(id, status, note)
      showToast('Cập nhật kiểm duyệt thành công', 'success')
      await fetchComments()
    } catch (error) {
      showToast(error || 'Cập nhật kiểm duyệt thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bình luận này?')) {
      return
    }

    try {
      setProcessingId(id)
      await deleteCommentById(id)
      showToast('Đã xóa bình luận', 'success')
      await fetchComments()
    } catch (error) {
      showToast(error || 'Xóa bình luận thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleSelectComment = (commentId, checked) => {
    setSelectedCommentIds((previous) => {
      if (checked) {
        return previous.includes(commentId) ? previous : [...previous, commentId]
      }

      return previous.filter((id) => id !== commentId)
    })
  }

  const toggleSelectCommentByClick = (commentId) => {
    setSelectedCommentIds((previous) => {
      if (previous.includes(commentId)) {
        return previous.filter((id) => id !== commentId)
      }

      return [...previous, commentId]
    })
  }

  const shouldIgnoreSelectionAreaClick = (event) => {
    const target = event.target
    if (target instanceof Element && target.closest('a, button, input, select, textarea, label')) {
      return true
    }

    const selectedText = window.getSelection?.().toString().trim()
    return Boolean(selectedText)
  }

  const handleSelectionAreaClick = (event, commentId) => {
    if (isBusy || shouldIgnoreSelectionAreaClick(event)) {
      return
    }

    toggleSelectCommentByClick(commentId)
  }

  const toggleSelectAllCurrentPage = (checked) => {
    setSelectedCommentIds((previous) => {
      if (checked) {
        const merged = new Set([...previous, ...comments.map((item) => item.id)])
        return Array.from(merged)
      }

      const currentPageIdSet = new Set(comments.map((item) => item.id))
      return previous.filter((id) => !currentPageIdSet.has(id))
    })
  }

  const handleBulkModerate = async (status) => {
    if (selectedCount === 0) {
      showToast('Vui lòng chọn ít nhất 1 bình luận', 'error')
      return
    }

    const actionLabelMap = {
      Approved: 'duyệt',
      Rejected: 'từ chối',
      Hidden: 'ẩn'
    }

    let note = ''
    if (status === 'Rejected' || status === 'Hidden') {
      const promptResult = window.prompt('Ghi chú kiểm duyệt cho các bình luận đã chọn (không bắt buộc):', '')
      if (promptResult === null) {
        return
      }

      note = promptResult
    }

    if (!window.confirm(`Xác nhận ${actionLabelMap[status]} ${selectedCount} bình luận đã chọn?`)) {
      return
    }

    const selectedIdsSnapshot = [...selectedCommentIds]
    let successCount = 0
    const failedIds = []

    try {
      setProcessingId('bulk-moderate')

      for (const commentId of selectedIdsSnapshot) {
        try {
          await updateCommentStatus(commentId, status, note)
          successCount += 1
        } catch {
          failedIds.push(commentId)
        }
      }

      if (failedIds.length === 0) {
        showToast(`Đã ${actionLabelMap[status]} ${successCount} bình luận`, 'success')
        setSelectedCommentIds([])
      } else {
        showToast(`Đã xử lý ${successCount}/${selectedIdsSnapshot.length}. ${failedIds.length} bình luận thất bại.`, 'error')
        setSelectedCommentIds(failedIds)
      }

      await fetchComments()
    } finally {
      setProcessingId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCount === 0) {
      showToast('Vui lòng chọn ít nhất 1 bình luận', 'error')
      return
    }

    if (!window.confirm(`Xóa ${selectedCount} bình luận đã chọn? Hành động này không thể hoàn tác.`)) {
      return
    }

    const selectedIdsSnapshot = [...selectedCommentIds]
    let successCount = 0
    const failedIds = []

    try {
      setProcessingId('bulk-delete')

      for (const commentId of selectedIdsSnapshot) {
        try {
          await deleteCommentById(commentId)
          successCount += 1
        } catch {
          failedIds.push(commentId)
        }
      }

      if (failedIds.length === 0) {
        showToast(`Đã xóa ${successCount} bình luận`, 'success')
        setSelectedCommentIds([])
      } else {
        showToast(`Đã xóa ${successCount}/${selectedIdsSnapshot.length}. ${failedIds.length} bình luận thất bại.`, 'error')
        setSelectedCommentIds(failedIds)
      }

      await fetchComments()
    } finally {
      setProcessingId(null)
    }
  }

  const onSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSelectedCommentIds([])
    setSearchTerm(searchInput.trim())
  }

  const onResetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setStatusFilter('Pending')
    setSelectedCommentIds([])
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Kiểm duyệt bình luận</h1>
        <p className="mt-1 text-amber-100">
          Duyệt, từ chối, ẩn hoặc xóa bình luận trước khi hiển thị công khai.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo nội dung, tài khoản bình luận hoặc tiêu đề bài viết"
            className="md:col-span-7 border border-gray-300 rounded-lg px-3 py-2"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="md:col-span-3 border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            {moderationStatuses.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <button
            type="submit"
            className="md:col-span-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
          >
            Tìm
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            className="md:col-span-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50"
          >
            Xóa
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        {!loading && comments.length > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Đã chọn: <strong>{selectedCount}</strong></span>
              <button
                type="button"
                onClick={() => handleBulkModerate('Approved')}
                disabled={isBusy || selectedCount === 0}
                className="px-3 py-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
              >
                Duyệt đã chọn
              </button>
              <button
                type="button"
                onClick={() => handleBulkModerate('Rejected')}
                disabled={isBusy || selectedCount === 0}
                className="px-3 py-1.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
              >
                Từ chối đã chọn
              </button>
              <button
                type="button"
                onClick={() => handleBulkModerate('Hidden')}
                disabled={isBusy || selectedCount === 0}
                className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Ẩn đã chọn
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBusy || selectedCount === 0}
                className="px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
              >
                Xóa đã chọn
              </button>
              <button
                type="button"
                onClick={() => setSelectedCommentIds([])}
                disabled={isBusy || selectedCount === 0}
                className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500">Không có bình luận nào phù hợp.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left w-[52px]">
                    <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={(event) => toggleSelectAllCurrentPage(event.target.checked)}
                        disabled={isBusy || comments.length === 0}
                        aria-label="Chọn tất cả bình luận ở trang hiện tại"
                        className="h-4 w-4"
                      />
                    </label>
                  </th>
                  <th className="px-4 py-3 text-left">Bình luận</th>
                  <th className="px-4 py-3 text-left">Tài khoản bình luận</th>
                  <th className="px-4 py-3 text-left">Bài viết</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 align-top hover:bg-gray-50">
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={(event) => handleSelectionAreaClick(event, item.id)}
                    >
                      <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={selectedCommentIds.includes(item.id)}
                          onChange={(event) => toggleSelectComment(item.id, event.target.checked)}
                          onClick={(event) => event.stopPropagation()}
                          disabled={isBusy}
                          aria-label={`Chọn bình luận ${item.id}`}
                          className="h-4 w-4"
                        />
                      </label>
                    </td>
                    <td
                      className="px-4 py-3 min-w-[320px] cursor-pointer"
                      onClick={(event) => handleSelectionAreaClick(event, item.id)}
                    >
                      <p className="font-medium text-gray-800">#{item.id}</p>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">{item.content}</p>
                      {item.reviewNote && (
                        <p className="mt-1 text-xs text-gray-500">Ghi chú: {item.reviewNote}</p>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 min-w-[170px] text-gray-700 font-medium cursor-pointer"
                      onClick={(event) => handleSelectionAreaClick(event, item.id)}
                    >
                      {item.createdByUsername || 'Không xác định'}
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <Link
                        to={`/articles/${item.articleId}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {item.articleTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusClassMap[item.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabelMap[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 min-w-[160px]">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 min-w-[280px]">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleModerate(item.id, 'Approved')}
                          disabled={isBusy}
                          className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate(item.id, 'Rejected')}
                          disabled={isBusy}
                          className="px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate(item.id, 'Hidden')}
                          disabled={isBusy}
                          className="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Ẩn
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="mt-5 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Trang {page}/{totalPages} - Tổng {total} bình luận
            </p>
            <div className="space-x-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

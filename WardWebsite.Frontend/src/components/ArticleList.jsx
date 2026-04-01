import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getArticles, deleteArticle } from '../services/articleService'
import Toast from './Toast'

export default function ArticleList({ refreshKey }) {
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const pageSize = 10

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    window.setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
  }

  useEffect(() => {
    fetchArticles()
  }, [page, refreshKey])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getArticles(page, pageSize)
      setArticles(data.data)
      setTotal(data.total)
    } catch (error) {
      setError('Không tải được danh sách tin tức. Vui lòng kiểm tra backend đang chạy.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bài viết này?')) return
    try {
      await deleteArticle(id)
      showToast('Đã xóa bài viết', 'success')
      fetchArticles()
    } catch (error) {
      showToast('Xóa bài viết thất bại', 'error')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Danh sách bài viết</h2>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-center py-4 text-gray-500">Chưa có bài viết nào</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(article => (
                  <tr key={article.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{article.id}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        onClick={() => navigate(`/articles/${article.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium truncate"
                      >
                        {article.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">{article.category}</td>
                    <td className="px-4 py-3">{new Date(article.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Hiển thị trang {page} của {totalPages} (Tổng {total} bài)
            </p>
            <div className="space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

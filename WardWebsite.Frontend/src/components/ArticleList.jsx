import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteArticle,
  getFeaturedArticles,
  getArticles,
  getCategories,
  publishArticle,
  reviewArticle,
  submitArticleForReview,
  unpublishArticle
} from '../services/articleService'
import Toast from './Toast'

const statusOptions = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'Draft', label: 'Nháp' },
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Bị từ chối' },
  { value: 'Published', label: 'Đã xuất bản' }
]

const statusBadgeClass = {
  Draft: 'bg-gray-100 text-gray-700',
  PendingReview: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Published: 'bg-blue-100 text-blue-700'
}

const statusLabel = {
  Draft: 'Nháp',
  PendingReview: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Published: 'Đã xuất bản'
}

const extractImageSources = (html) => {
  const content = String(html || '')
  const matches = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || []

  return matches
    .map((tag) => {
      const srcMatch = tag.match(/src=["']([^"']+)["']/i)
      return srcMatch ? srcMatch[1] : ''
    })
    .filter(Boolean)
}

const toPlainText = (html) => {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString('vi-VN')
}

export default function ArticleList({ refreshKey, moderationMode = false }) {
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [featuredArticles, setFeaturedArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0)
  const pageSize = 10

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])

  const canDeleteArticle = currentUser?.role === 'Admin' || currentUser?.role === 'Editor'
  const canModerateArticle = moderationMode && canDeleteArticle
  const showActionColumn = canDeleteArticle || canModerateArticle
  const filtersActive =
    Boolean(searchTerm) ||
    categoryFilter !== 'ALL' ||
    (canModerateArticle && statusFilter !== 'ALL')

  const toSearchable = (value) => {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  const selectedCategoryName = useMemo(() => {
    if (categoryFilter === 'ALL') return ''
    const selected = categories.find((cat) => String(cat.id) === String(categoryFilter))
    return selected?.name || ''
  }, [categories, categoryFilter])

  const displayArticles = useMemo(() => {
    const normalizedTerm = toSearchable(searchTerm)
    const normalizedCategory = toSearchable(selectedCategoryName)

    return articles.filter((article) => {
      const title = toSearchable(article.title)
      const content = toSearchable(article.content)
      const category = toSearchable(article.category)

      const matchSearch =
        !normalizedTerm ||
        title.includes(normalizedTerm) ||
        content.includes(normalizedTerm) ||
        category.includes(normalizedTerm)

      const matchCategory = categoryFilter === 'ALL' || category === normalizedCategory
      const matchStatus = !canModerateArticle || statusFilter === 'ALL' || article.status === statusFilter

      return matchSearch && matchCategory && matchStatus
    })
  }, [articles, searchTerm, selectedCategoryName, categoryFilter, canModerateArticle, statusFilter])

  const featuredShowcase = useMemo(() => {
    if (canModerateArticle || featuredArticles.length === 0) {
      return []
    }

    return featuredArticles
      .map((article, index) => {
        const images = extractImageSources(article.content)
        const summary = toPlainText(article.content)

        return {
          ...article,
          rank: index + 1,
          image: images[0] || '',
          summary: summary.length > 180 ? `${summary.slice(0, 177)}...` : summary,
          viewCount: Number(article.viewCount || 0),
          commentCount: Number(article.commentCount || 0),
          engagement: Number(article.viewCount || 0) + Number(article.commentCount || 0)
        }
      })
      .slice(0, 5)
  }, [featuredArticles, canModerateArticle])

  const activeFeaturedArticle = useMemo(() => {
    if (featuredShowcase.length === 0) {
      return null
    }

    return featuredShowcase[activeFeaturedIndex % featuredShowcase.length]
  }, [featuredShowcase, activeFeaturedIndex])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    window.setTimeout(() => setToast({ message: '', type: 'info' }), 2500)
  }

  useEffect(() => {
    fetchArticles()
  }, [page, refreshKey, searchTerm, categoryFilter, statusFilter, canModerateArticle])

  useEffect(() => {
    if (canModerateArticle) {
      setFeaturedArticles([])
      return
    }

    fetchFeatured()
  }, [refreshKey, canModerateArticle])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (canModerateArticle || featuredShowcase.length <= 1) {
      return undefined
    }

    const randomDelay = 5000 + Math.floor(Math.random() * 5001)
    const timer = window.setTimeout(() => {
      setActiveFeaturedIndex((previous) => (previous + 1) % featuredShowcase.length)
    }, randomDelay)

    return () => window.clearTimeout(timer)
  }, [canModerateArticle, featuredShowcase.length, activeFeaturedIndex])

  useEffect(() => {
    if (activeFeaturedIndex < featuredShowcase.length) {
      return
    }

    setActiveFeaturedIndex(0)
  }, [activeFeaturedIndex, featuredShowcase.length])

  const fetchFeatured = async () => {
    try {
      const data = await getFeaturedArticles(5)
      setFeaturedArticles(Array.isArray(data) ? data : [])
      setActiveFeaturedIndex(0)
    } catch {
      setFeaturedArticles([])
      setActiveFeaturedIndex(0)
    }
  }

  const handleFeaturedSelect = (index) => {
    if (featuredShowcase.length === 0) {
      return
    }

    const safeIndex = (index + featuredShowcase.length) % featuredShowcase.length
    setActiveFeaturedIndex(safeIndex)
  }

  const handleFeaturedPrevious = () => {
    handleFeaturedSelect(activeFeaturedIndex - 1)
  }

  const handleFeaturedNext = () => {
    handleFeaturedSelect(activeFeaturedIndex + 1)
  }

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data || [])
    } catch {
      setCategories([])
    }
  }

  const fetchArticles = async () => {
    try {
      setLoading(true)
      setError('')
      const categoryId = categoryFilter === 'ALL' ? null : Number(categoryFilter)
      const requestPage = filtersActive ? 1 : page
      const requestPageSize = filtersActive ? 100 : pageSize

      const data = await getArticles(requestPage, requestPageSize, {
        search: searchTerm,
        categoryId,
        status: canModerateArticle && statusFilter !== 'ALL' ? statusFilter : null,
        includeUnpublished: canModerateArticle
      })

      setArticles(data.data || [])
      setTotal(filtersActive ? (data.data?.length || 0) : data.total)
    } catch (err) {
      setError('Không tải được danh sách tin tức. Vui lòng kiểm tra backend đang chạy.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!canDeleteArticle) {
      return
    }

    if (!window.confirm('Xóa bài viết này?')) return
    try {
      setProcessingId(id)
      await deleteArticle(id)
      showToast('Đã xóa bài viết', 'success')
      await fetchArticles()
    } catch (err) {
      showToast('Xóa bài viết thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSubmitForReview = async (id) => {
    try {
      setProcessingId(id)
      await submitArticleForReview(id)
      showToast('Đã gửi bài viết chờ duyệt', 'success')
      await fetchArticles()
    } catch (err) {
      showToast(err || 'Gửi duyệt thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReview = async (id, decision) => {
    try {
      const note = decision === 'Rejected'
        ? window.prompt('Nhập lý do từ chối (không bắt buộc):', '') || ''
        : ''

      setProcessingId(id)
      await reviewArticle(id, decision, note)
      showToast(decision === 'Approved' ? 'Đã duyệt bài viết' : 'Đã từ chối bài viết', 'success')
      await fetchArticles()
    } catch (err) {
      showToast(err || 'Kiểm duyệt thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handlePublish = async (id) => {
    try {
      setProcessingId(id)
      await publishArticle(id)
      showToast('Xuất bản bài viết thành công', 'success')
      await fetchArticles()
    } catch (err) {
      showToast(err || 'Xuất bản thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleUnpublish = async (id) => {
    try {
      setProcessingId(id)
      await unpublishArticle(id)
      showToast('Đã gỡ xuất bản bài viết', 'success')
      await fetchArticles()
    } catch (err) {
      showToast(err || 'Gỡ xuất bản thất bại', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setCategoryFilter('ALL')
    setStatusFilter('ALL')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rowOffset = filtersActive ? 0 : (page - 1) * pageSize

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Danh sách bài viết</h2>

      <form onSubmit={handleSearchSubmit} className="mb-4 grid grid-cols-1 lg:grid-cols-12 gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo tiêu đề hoặc nội dung..."
          className={canModerateArticle ? 'lg:col-span-5 border border-gray-300 rounded-lg px-3 py-2' : 'lg:col-span-6 border border-gray-300 rounded-lg px-3 py-2'}
        />

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="lg:col-span-3 border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="ALL">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {canModerateArticle && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="lg:col-span-2 border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        )}

        <button
          type="submit"
          className="lg:col-span-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700"
        >
          Tìm
        </button>

        <button
          type="button"
          onClick={handleResetFilters}
          className="lg:col-span-1 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          Xóa
        </button>
      </form>

      {(searchTerm || categoryFilter !== 'ALL' || (canModerateArticle && statusFilter !== 'ALL')) && (
        <div className="mb-4 text-sm text-gray-600">
          Đang lọc: {searchTerm ? `Từ khóa "${searchTerm}"` : 'Không có từ khóa'}
          {categoryFilter !== 'ALL' ? ' | Theo danh mục đã chọn' : ''}
          {canModerateArticle && statusFilter !== 'ALL' ? ' | Theo trạng thái đã chọn' : ''}
        </div>
      )}

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

      {!loading && !error && displayArticles.length === 0 && (
        <p className="text-center py-4 text-gray-500">
          {filtersActive ? 'Không tìm thấy bài viết phù hợp bộ lọc' : 'Chưa có bài viết nào'}
        </p>
      )}

      {!loading && !error && displayArticles.length > 0 && (
        <>
          {!canModerateArticle && featuredShowcase.length > 0 && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800">Tin Tức Mới Nhất</h3>
              </div>

              {activeFeaturedArticle && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  <article className="xl:col-span-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-56 md:h-72 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400">
                      {activeFeaturedArticle.image ? (
                        <img
                          src={activeFeaturedArticle.image}
                          alt={activeFeaturedArticle.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center px-6 text-center text-sm text-slate-700">
                          Bài viết chưa có ảnh trong nội dung.
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">
                          {activeFeaturedArticle.category || 'Danh mục khác'}
                        </span>
                        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                          Top #{activeFeaturedArticle.rank}
                        </span>
                      </div>

                      <div className="absolute right-4 bottom-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFeaturedPrevious}
                          className="h-10 w-10 rounded-full bg-white/85 text-slate-700 hover:bg-white"
                          aria-label="Bài trước"
                        >
                          {'<'}
                        </button>
                        <button
                          type="button"
                          onClick={handleFeaturedNext}
                          className="h-10 w-10 rounded-full bg-white/85 text-slate-700 hover:bg-white"
                          aria-label="Bài sau"
                        >
                          {'>'}
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/articles/${activeFeaturedArticle.id}`)}
                        className="text-left text-lg md:text-xl font-bold text-slate-800 hover:text-blue-700 leading-tight"
                      >
                        {activeFeaturedArticle.title}
                      </button>

                      {activeFeaturedArticle.summary && (
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                          {activeFeaturedArticle.summary}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {formatNumber(activeFeaturedArticle.viewCount)} lượt xem
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {formatNumber(activeFeaturedArticle.commentCount)} bình luận
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                          Điểm nổi bật: {formatNumber(activeFeaturedArticle.engagement)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {featuredShowcase.map((item, index) => (
                          <button
                            key={`featured-dot-${item.id}`}
                            type="button"
                            onClick={() => handleFeaturedSelect(index)}
                            className={`h-2 rounded-full transition-all ${index === activeFeaturedIndex ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                            aria-label={`Xem bài top ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </article>

                  <aside className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Top 5 theo lượt xem và bình luận</h4>

                    <div className="space-y-2">
                      {featuredShowcase.map((item, index) => (
                        <button
                          key={`featured-rank-${item.id}`}
                          type="button"
                          onClick={() => handleFeaturedSelect(index)}
                          className={`w-full rounded-lg border p-3 text-left transition ${index === activeFeaturedIndex ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-800 px-2 text-xs font-semibold text-white">
                              {item.rank}
                            </span>
                            <span className="text-xs text-slate-500">{item.category || 'Khác'}</span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                            {item.title}
                          </p>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <span className="rounded bg-slate-100 px-2 py-1 text-center">{formatNumber(item.viewCount)} lượt xem</span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-center">{formatNumber(item.commentCount)} bình luận</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </aside>
                </div>
              )}
            </section>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Danh mục</th>
                  {canModerateArticle && <th className="px-4 py-3">Trạng thái</th>}
                  <th className="px-4 py-3">Ngày tạo</th>
                  {showActionColumn && <th className="px-4 py-3">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {displayArticles.map((article, index) => (
                  <tr key={article.id} className="border-t hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">{total - rowOffset - index}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        onClick={() => navigate(`/articles/${article.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium truncate"
                      >
                        {article.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">{article.category}</td>
                    {canModerateArticle && (
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[article.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabel[article.status] || article.status || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">{new Date(article.createdAt).toLocaleDateString('vi-VN')}</td>
                    {showActionColumn && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canModerateArticle && (article.status === 'Draft' || article.status === 'Rejected') && (
                            <button
                              onClick={() => handleSubmitForReview(article.id)}
                              disabled={processingId === article.id}
                              className="text-amber-700 bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 disabled:opacity-50"
                            >
                              Gửi duyệt
                            </button>
                          )}

                          {canModerateArticle && article.status === 'PendingReview' && (
                            <>
                              <button
                                onClick={() => handleReview(article.id, 'Approved')}
                                disabled={processingId === article.id}
                                className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded hover:bg-emerald-200 disabled:opacity-50"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleReview(article.id, 'Rejected')}
                                disabled={processingId === article.id}
                                className="text-rose-700 bg-rose-100 px-2 py-1 rounded hover:bg-rose-200 disabled:opacity-50"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {canModerateArticle && article.status === 'Approved' && (
                            <button
                              onClick={() => handlePublish(article.id)}
                              disabled={processingId === article.id}
                              className="text-blue-700 bg-blue-100 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                            >
                              Xuất bản
                            </button>
                          )}

                          {canModerateArticle && article.status === 'Published' && (
                            <button
                              onClick={() => handleUnpublish(article.id)}
                              disabled={processingId === article.id}
                              className="text-gray-700 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              Gỡ xuất bản
                            </button>
                          )}

                          {canDeleteArticle && (
                            <button
                              onClick={() => handleDelete(article.id)}
                              disabled={processingId === article.id}
                              className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtersActive ? (
            <p className="mt-6 text-sm text-gray-600">
              Tìm thấy {displayArticles.length} bài viết phù hợp.
            </p>
          ) : (
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
          )}
        </>
      )}
    </div>
  )
}

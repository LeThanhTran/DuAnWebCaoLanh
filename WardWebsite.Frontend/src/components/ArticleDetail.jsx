import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArticleById } from '../services/articleService'
import CommentList from './CommentList'
import CommentForm from './CommentForm'
import DOMPurify from 'dompurify'

export default function ArticleDetail({ onLoginSuccess }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentRefreshKey, setCommentRefreshKey] = useState(0)
  const [shareMessage, setShareMessage] = useState('')
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()
  const isModerator = currentUser?.role === 'Admin' || currentUser?.role === 'Editor'

  useEffect(() => {
    fetchArticle()
  }, [id])

  const fetchArticle = async () => {
    try {
      setLoading(true)
      const data = await getArticleById(id)
      setArticle(data)
      setError('')
    } catch (err) {
      setError('Lỗi: ' + err)
      setArticle(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentCreated = () => {
    setCommentRefreshKey(prev => prev + 1)
  }

  const articleUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/articles/${id}`
    : ''

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`
  const zaloChatUrl = 'https://chat.zalo.me'

  const showShareMessage = (message) => {
    setShareMessage(message)
    window.setTimeout(() => setShareMessage(''), 2500)
  }

  const copyArticleLink = async (options = {}) => {
    const { silent = false } = options

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(articleUrl)
        if (!silent) {
          showShareMessage('Đã sao chép liên kết bài viết')
        }
        return
      }

      const textArea = document.createElement('textarea')
      textArea.value = articleUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (copied) {
        if (!silent) {
          showShareMessage('Đã sao chép liên kết bài viết')
        }
      } else {
        showShareMessage('Không thể sao chép liên kết lúc này')
      }
    } catch {
      showShareMessage('Không thể sao chép liên kết lúc này')
    }
  }

  const handleZaloShare = async () => {
    await copyArticleLink({ silent: true })

    if (typeof window !== 'undefined') {
      window.open(zaloChatUrl, '_blank', 'noopener,noreferrer')
    }

    showShareMessage('Đã sao chép liên kết. Hãy dán vào khung chat Zalo để chia sẻ.')
  }

  const handleNativeShare = async () => {
    if (!article) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: `Xem tin tức: ${article.title}`,
          url: articleUrl
        })
        return
      }

      await copyArticleLink()
    } catch {
      showShareMessage('Chia sẻ chưa thành công')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Đang tải...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/articles')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Không tìm thấy bài viết</p>
      </div>
    )
  }

  const statusClassMap = {
    Draft: 'bg-gray-100 text-gray-700',
    PendingReview: 'bg-amber-100 text-amber-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-rose-100 text-rose-700',
    Published: 'bg-blue-100 text-blue-700'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/articles')}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Quay lại
        </button>

        <article className="bg-white rounded-lg shadow-lg p-8">
          {/* Category Badge */}
          <div className="mb-4">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {article.category}
            </span>
            {isModerator && article.status && (
              <span className={`inline-block ml-2 px-3 py-1 rounded-full text-sm font-medium ${statusClassMap[article.status] || 'bg-gray-100 text-gray-700'}`}>
                {article.status}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{article.title}</h1>

          {/* Meta Info */}
          <div className="flex items-center text-gray-500 text-sm space-x-4 mb-8">
            <span>ID: {article.id}</span>
            <span>•</span>
            <span>{new Date(article.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(article.content || '')
            }}
          >
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 mt-8 pt-8">
            <p className="text-sm text-gray-500">
              Đăng lúc: {new Date(article.createdAt).toLocaleString('vi-VN')}
            </p>
            {article.publishedAt && (
              <p className="text-sm text-gray-500 mt-1">
                Xuất bản lúc: {new Date(article.publishedAt).toLocaleString('vi-VN')}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Chia sẻ nhanh
              </button>

              <button
                type="button"
                onClick={copyArticleLink}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Sao chép liên kết
              </button>

              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm hover:bg-blue-50"
              >
                Facebook
              </a>

              <button
                type="button"
                onClick={handleZaloShare}
                className="px-3 py-2 rounded-lg border border-sky-200 text-sky-700 text-sm hover:bg-sky-50"
              >
                Zalo
              </button>
            </div>

            {shareMessage && (
              <p className="mt-2 text-sm text-emerald-700">{shareMessage}</p>
            )}
          </div>

          {/* Comments Section */}
          <CommentForm
            articleId={article.id}
            onCommentCreated={handleCommentCreated}
            onLoginSuccess={onLoginSuccess}
          />
          <CommentList key={commentRefreshKey} articleId={article.id} refreshKey={commentRefreshKey} />
        </article>
      </div>
    </div>
  )
}

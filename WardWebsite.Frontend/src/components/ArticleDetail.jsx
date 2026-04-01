import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArticleById } from '../services/articleService'
import CommentList from './CommentList'
import CommentForm from './CommentForm'

export default function ArticleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentRefreshKey, setCommentRefreshKey] = useState(0)

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
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {article.content}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 mt-8 pt-8">
            <p className="text-sm text-gray-500">
              Đăng lúc: {new Date(article.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>

          {/* Comments Section */}
          <CommentForm articleId={article.id} onCommentCreated={handleCommentCreated} />
          <CommentList key={commentRefreshKey} articleId={article.id} refreshKey={commentRefreshKey} />
        </article>
      </div>
    </div>
  )
}

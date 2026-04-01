import { useState } from 'react'
import { createComment } from '../services/articleService'

export default function CommentForm({ articleId, onCommentCreated }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!content.trim()) {
      alert('Vui lòng nhập bình luận')
      return
    }

    try {
      setLoading(true)
      await createComment(articleId, content)
      setContent('')
      onCommentCreated()
      alert('Bình luận thành công')
    } catch (error) {
      alert('Lỗi: ' + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Viết bình luận</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            rows={4}
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập bình luận của bạn..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {content.length}/5000 ký tự
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Đang gửi...' : 'Gửi bình luận'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { getComments } from '../services/articleService'

export default function CommentList({ articleId, refreshKey }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [articleId, refreshKey])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const data = await getComments(articleId)
      setComments(data)
    } catch (error) {
      console.error('Lỗi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p className="text-center text-gray-500 py-4">Đang tải bình luận...</p>
  }

  if (comments.length === 0) {
    return <p className="text-center text-gray-500 py-8">Chưa có bình luận nào</p>
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Bình luận ({comments.length})</h3>
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-gray-600">
                Bình luận #{comment.id}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

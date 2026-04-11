import { useEffect, useMemo, useState } from 'react'
import { createComment, getComments, reactToComment } from '../services/articleService'
import AuthActionLoginModal from './AuthActionLoginModal'

const toTimestamp = (value) => {
  const result = new Date(value).getTime()
  return Number.isFinite(result) ? result : 0
}

export default function CommentList({ articleId, refreshKey, onLoginSuccess }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [reactingCommentId, setReactingCommentId] = useState(null)
  const [replyingCommentId, setReplyingCommentId] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginActionLabel, setLoginActionLabel] = useState('bình luận')

  const isLoggedIn = Boolean(localStorage.getItem('token'))

  useEffect(() => {
    fetchComments()
  }, [articleId, refreshKey])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const data = await getComments(articleId)
      setComments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Lỗi:', error)
    } finally {
      setLoading(false)
    }
  }

  const openLoginModal = (actionLabel) => {
    setLoginActionLabel(actionLabel || 'bình luận')
    setShowLoginModal(true)
  }

  const closeLoginModal = () => {
    setShowLoginModal(false)
  }

  const handleLoginSuccess = (userData, options) => {
    onLoginSuccess?.(userData, options)
    setShowLoginModal(false)
  }

  const requireLoginForInteraction = (actionLabel) => {
    if (isLoggedIn) {
      return true
    }

    openLoginModal(actionLabel)
    return false
  }

  const groupedComments = useMemo(() => {
    const commentsByParent = new Map()

    comments.forEach((comment) => {
      const parentKey = Number(comment.parentCommentId || 0)
      if (!commentsByParent.has(parentKey)) {
        commentsByParent.set(parentKey, [])
      }
      commentsByParent.get(parentKey).push(comment)
    })

    const topLevelComments = commentsByParent.get(0) || []
    topLevelComments.sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))

    commentsByParent.forEach((items, key) => {
      if (key === 0) {
        return
      }

      items.sort((left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt))
    })

    return {
      topLevelComments,
      commentsByParent
    }
  }, [comments])

  const handleReaction = async (commentId, reactionType) => {
    if (!requireLoginForInteraction('tương tác bình luận')) {
      return
    }

    try {
      setReactingCommentId(commentId)
      const response = await reactToComment(commentId, reactionType)
      const reactionData = response?.data || {}

      setComments((previous) => previous.map((item) => {
        if (item.id !== commentId) {
          return item
        }

        return {
          ...item,
          likeCount: Number(reactionData.likeCount || 0),
          dislikeCount: Number(reactionData.dislikeCount || 0),
          currentUserReaction: reactionData.currentUserReaction || null
        }
      }))
    } catch (error) {
      alert(error || 'Không thể tương tác bình luận lúc này')
    } finally {
      setReactingCommentId(null)
    }
  }

  const openReplyBox = (commentId) => {
    if (!requireLoginForInteraction('trả lời bình luận')) {
      return
    }

    setReplyingCommentId(commentId)
    setReplyContent('')
  }

  const submitReply = async (parentCommentId) => {
    if (!requireLoginForInteraction('trả lời bình luận')) {
      return
    }

    if (!replyContent.trim()) {
      alert('Vui lòng nhập nội dung trả lời')
      return
    }

    try {
      setSendingReply(true)
      await createComment(articleId, replyContent.trim(), parentCommentId)
      setReplyContent('')
      setReplyingCommentId(null)
      await fetchComments()
      alert('Đã gửi trả lời. Quản trị viên sẽ kiểm duyệt trước khi hiển thị.')
    } catch (error) {
      alert(error || 'Không thể gửi trả lời lúc này')
    } finally {
      setSendingReply(false)
    }
  }

  const renderComment = (comment, depth = 0) => {
    const replies = groupedComments.commentsByParent.get(Number(comment.id)) || []
    const isLiked = comment.currentUserReaction === 'Like'
    const isDisliked = comment.currentUserReaction === 'Dislike'

    return (
      <div
        key={comment.id}
        className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${depth > 0 ? 'ml-4 sm:ml-8 border-l-4 border-l-blue-200' : ''}`}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <p className="text-sm font-semibold text-gray-700">
            {comment.createdByDisplayName || comment.createdByUsername || 'Người dùng'}
          </p>
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(comment.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>

        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleReaction(comment.id, 'Like')}
            disabled={reactingCommentId === comment.id}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${isLiked ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            Thích ({Number(comment.likeCount || 0)})
          </button>

          <button
            type="button"
            onClick={() => handleReaction(comment.id, 'Dislike')}
            disabled={reactingCommentId === comment.id}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${isDisliked ? 'bg-rose-100 text-rose-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            Không thích ({Number(comment.dislikeCount || 0)})
          </button>

          <button
            type="button"
            onClick={() => openReplyBox(comment.id)}
            className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Trả lời
          </button>
        </div>

        {replyingCommentId === comment.id && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3">
            <textarea
              rows={3}
              maxLength={5000}
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập nội dung trả lời..."
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyingCommentId(null)
                  setReplyContent('')
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => submitReply(comment.id)}
                disabled={sendingReply}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {sendingReply ? 'Đang gửi...' : 'Gửi trả lời'}
              </button>
            </div>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <p className="text-center text-gray-500 py-4">Đang tải bình luận...</p>
  }

  if (groupedComments.topLevelComments.length === 0) {
    return <p className="text-center text-gray-500 py-8">Chưa có bình luận nào</p>
  }

  return (
    <>
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Bình luận ({comments.length})</h3>
        <div className="space-y-4">
          {groupedComments.topLevelComments.map((comment) => renderComment(comment))}
        </div>
      </div>

      <AuthActionLoginModal
        open={showLoginModal && !isLoggedIn}
        actionLabel={loginActionLabel}
        onClose={closeLoginModal}
        onLoginSuccess={handleLoginSuccess}
        loginSuccessOptions={{ stayOnCurrentPath: true }}
      />
    </>
  )
}

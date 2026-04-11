import axios from 'axios'

const API_URL = '/api/articles'

// Helper: lấy token từ localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// GET tất cả articles (có phân trang, tìm kiếm, lọc danh mục)
export const getArticles = async (page = 1, pageSize = 10, filters = {}) => {
  try {
    const params = { page, pageSize }

    if (filters.search?.trim()) {
      params.search = filters.search.trim()
    }

    if (filters.categoryId) {
      params.categoryId = filters.categoryId
    }

    if (filters.status) {
      params.status = filters.status
    }

    if (filters.includeUnpublished) {
      params.includeUnpublished = true
    }

    const response = await axios.get(API_URL, {
      params,
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy danh sách articles'
  }
}

// GET top bài viết nổi bật
export const getFeaturedArticles = async (take = 5) => {
  try {
    const response = await axios.get(`${API_URL}/featured`, {
      params: { take }
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy bài viết nổi bật'
  }
}

// GET danh mục bài viết
export const getCategories = async () => {
  try {
    const response = await axios.get('/api/categories')
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy danh mục'
  }
}

// GET article theo ID
export const getArticleById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy article'
  }
}

// POST tạo article mới
export const createArticle = async (data) => {
  try {
    const response = await axios.post(API_URL, data, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tạo article'
  }
}

// PUT cập nhật article
export const updateArticle = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, data, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi cập nhật article'
  }
}

// DELETE xóa article
export const deleteArticle = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi xóa article'
  }
}

// GET comments của article
export const getComments = async (articleId) => {
  try {
    const response = await axios.get(`${API_URL}/${articleId}/comments`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy comments'
  }
}

// POST tạo comment
export const createComment = async (articleId, content, parentCommentId = null) => {
  try {
    const payload = { content }
    if (Number.isInteger(parentCommentId) && parentCommentId > 0) {
      payload.parentCommentId = parentCommentId
    }

    const response = await axios.post(`${API_URL}/${articleId}/comments`, payload, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tạo comment'
  }
}

// POST like/dislike comment
export const reactToComment = async (commentId, reactionType) => {
  try {
    const response = await axios.post(`/api/comments/${commentId}/reaction`, { reactionType }, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tương tác bình luận'
  }
}

// PUT gửi duyệt bài viết
export const submitArticleForReview = async (id) => {
  try {
    const response = await axios.put(`${API_URL}/${id}/submit`, {}, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi gửi duyệt bài viết'
  }
}

// PUT kiểm duyệt bài viết
export const reviewArticle = async (id, decision, note = '') => {
  try {
    const response = await axios.put(`${API_URL}/${id}/review`, { decision, note }, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi kiểm duyệt bài viết'
  }
}

// PUT xuất bản bài viết
export const publishArticle = async (id) => {
  try {
    const response = await axios.put(`${API_URL}/${id}/publish`, {}, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi xuất bản bài viết'
  }
}

// PUT gỡ xuất bản bài viết
export const unpublishArticle = async (id) => {
  try {
    const response = await axios.put(`${API_URL}/${id}/unpublish`, {}, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi gỡ xuất bản bài viết'
  }
}

// GET danh sách bình luận cho kiểm duyệt
export const getCommentsForModeration = async (page = 1, pageSize = 20, filters = {}) => {
  try {
    const params = { page, pageSize }

    if (filters.status) {
      params.status = filters.status
    }

    if (filters.search?.trim()) {
      params.search = filters.search.trim()
    }

    const response = await axios.get('/api/comments/moderation', {
      params,
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tải danh sách bình luận cần duyệt'
  }
}

// PUT cập nhật trạng thái bình luận
export const updateCommentStatus = async (id, status, note = '') => {
  try {
    const response = await axios.put(`/api/comments/${id}/status`, { status, note }, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi cập nhật trạng thái bình luận'
  }
}

// DELETE xóa bình luận
export const deleteCommentById = async (id) => {
  try {
    const response = await axios.delete(`/api/comments/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi xóa bình luận'
  }
}

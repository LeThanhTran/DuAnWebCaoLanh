import axios from 'axios'

const API_URL = '/api/articles'

// Helper: lấy token từ localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// GET tất cả articles (có phân trang)
export const getArticles = async (page = 1, pageSize = 10) => {
  try {
    const response = await axios.get(API_URL, {
      params: { page, pageSize }
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy danh sách articles'
  }
}

// GET article theo ID
export const getArticleById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`)
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
    const response = await axios.get(`${API_URL}/${articleId}/comments`)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy comments'
  }
}

// POST tạo comment
export const createComment = async (articleId, content) => {
  try {
    const response = await axios.post(`${API_URL}/${articleId}/comments`, { content }, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tạo comment'
  }
}

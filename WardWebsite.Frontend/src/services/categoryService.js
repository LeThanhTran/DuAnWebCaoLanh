import axios from 'axios'

const API_URL = '/api/categories'

const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getCategories = async () => {
  try {
    const response = await axios.get(API_URL)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy danh mục'
  }
}

export const createCategory = async (data) => {
  try {
    const response = await axios.post(API_URL, data, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tạo danh mục'
  }
}

export const updateCategory = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, data, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi cập nhật danh mục'
  }
}

export const deleteCategory = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi xóa danh mục'
  }
}

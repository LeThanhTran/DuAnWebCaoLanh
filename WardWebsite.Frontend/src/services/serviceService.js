import axios from 'axios'

const API_URL = '/api'

const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// GET danh sách services
export const getServices = async () => {
  try {
    const response = await axios.get(`${API_URL}/services`)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy dịch vụ'
  }
}

// POST tạo service
export const createService = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/services`, data, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi tạo dịch vụ'
  }
}

// PUT cập nhật service
export const updateService = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/services/${id}`, data, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi cập nhật dịch vụ'
  }
}

// DELETE xóa service
export const deleteService = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/services/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi xóa dịch vụ'
  }
}

// POST tạo application (nộp hồ sơ)
export const createApplication = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/applications`, data)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi nộp hồ sơ'
  }
}

// GET application theo ID
export const getApplicationById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/applications/${id}`)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy hồ sơ'
  }
}

// GET tất cả applications (admin)
export const getAllApplications = async () => {
  try {
    const response = await axios.get(`${API_URL}/applications`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy danh sách hồ sơ'
  }
}

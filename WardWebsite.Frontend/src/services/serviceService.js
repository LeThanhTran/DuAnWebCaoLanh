import axios from 'axios'

const API_URL = '/api'

// GET danh sách services
export const getServices = async () => {
  try {
    const response = await axios.get(`${API_URL}/services`)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy dịch vụ'
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
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/applications`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy danh sách hồ sơ'
  }
}

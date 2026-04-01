import axios from 'axios'

const API_URL = '/api/stats'

// GET thống kê
export const getStats = async () => {
  try {
    const response = await axios.get(API_URL)
    return response.data
  } catch (error) {
    throw error.response?.data?.message || 'Lỗi lấy thống kê'
  }
}

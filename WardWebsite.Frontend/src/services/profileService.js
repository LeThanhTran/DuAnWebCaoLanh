import axios from 'axios'

const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const getApiErrorMessage = (error, fallbackMessage) => {
  const status = error?.response?.status
  if (status === 401 || status === 403) {
    return 'Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.'
  }

  const responseData = error?.response?.data

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData
  }

  if (responseData?.message) {
    return responseData.message
  }

  return fallbackMessage
}

export const getMyProfile = async () => {
  try {
    const response = await axios.get('/api/profile/me', {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Không thể tải hồ sơ cá nhân')
  }
}

export const updateMyProfile = async (payload) => {
  try {
    const response = await axios.put('/api/profile/me', payload, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Cập nhật hồ sơ thất bại')
  }
}

export const uploadMyAvatar = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post('/api/profile/avatar', formData, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Cập nhật ảnh đại diện thất bại')
  }
}

export const changeMyPassword = async (payload) => {
  try {
    const response = await axios.put('/api/profile/change-password', payload, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Đổi mật khẩu thất bại')
  }
}

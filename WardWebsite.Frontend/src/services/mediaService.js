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

export const getMedia = async () => {
  const response = await axios.get('/api/media')
  return response.data
}

export const getMediaById = async (id) => {
  const response = await axios.get(`/api/media/${id}`)
  return response.data
}

export const getHomepageMedia = async () => {
  const response = await axios.get('/api/media/homepage')
  return response.data
}

export const uploadMedia = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post('/api/media/upload', formData, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Tải media thất bại')
  }
}

export const deleteMedia = async (mediaId) => {
  try {
    const response = await axios.delete(`/api/media/${mediaId}`, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Xóa media thất bại')
  }
}

export const setHomepageImage = async (mediaId, slot, options = {}) => {
  try {
    const payload = {
      slot,
      bannerOffsetX: options.bannerOffsetX,
      bannerOffsetY: options.bannerOffsetY,
      bannerZoom: options.bannerZoom,
      introOffsetX: options.introOffsetX,
      introOffsetY: options.introOffsetY,
      introZoom: options.introZoom
    }

    const response = await axios.put(
      `/api/media/${mediaId}/set-home-image`,
      payload,
      {
        headers: getAuthHeader()
      }
    )

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Cập nhật ảnh trang chủ thất bại')
  }
}

export const setHomepageVideo = async (mediaId) => {
  try {
    const response = await axios.put(
      `/api/media/${mediaId}/set-home-video`,
      {},
      {
        headers: getAuthHeader()
      }
    )

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Cập nhật video trang chủ thất bại')
  }
}

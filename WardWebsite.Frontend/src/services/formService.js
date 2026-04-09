import axios from 'axios'

const API_URL = '/api/forms'

const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData
  }

  if (responseData?.message) {
    return responseData.message
  }

  return fallbackMessage
}

export const getPublicForms = async ({ serviceId = null, search = '' } = {}) => {
  try {
    const params = new URLSearchParams()

    if (serviceId) {
      params.append('serviceId', String(serviceId))
    }

    if (search.trim()) {
      params.append('search', search.trim())
    }

    const query = params.toString()
    const response = await axios.get(`${API_URL}/public${query ? `?${query}` : ''}`)
    return response.data || []
  } catch (error) {
    throw getApiErrorMessage(error, 'Không tải được danh sách biểu mẫu')
  }
}

export const getAllForms = async ({ includeInactive = true } = {}) => {
  try {
    const response = await axios.get(`${API_URL}?includeInactive=${includeInactive}`, {
      headers: getAuthHeader()
    })
    return response.data || []
  } catch (error) {
    throw getApiErrorMessage(error, 'Không tải được danh sách biểu mẫu quản trị')
  }
}

export const uploadForm = async ({ file, title, description, serviceId, isActive, sortOrder }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description || '')
    if (serviceId) {
      formData.append('serviceId', String(serviceId))
    }
    formData.append('isActive', String(Boolean(isActive)))
    formData.append('sortOrder', String(Number(sortOrder) || 0))

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Tải biểu mẫu thất bại')
  }
}

export const updateForm = async (id, payload) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, payload, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Cập nhật biểu mẫu thất bại')
  }
}

export const deleteForm = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeader()
    })

    return response.data
  } catch (error) {
    throw getApiErrorMessage(error, 'Xóa biểu mẫu thất bại')
  }
}

export const getDownloadUrl = (form) => form?.downloadEndpoint || `/api/forms/${form?.id}/download`

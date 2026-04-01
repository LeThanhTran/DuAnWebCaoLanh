import axios from 'axios'

export const getMedia = async () => {
  const response = await axios.get('/api/media')
  return response.data
}

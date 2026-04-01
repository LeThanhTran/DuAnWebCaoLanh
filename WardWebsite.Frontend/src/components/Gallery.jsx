import { useState, useEffect } from 'react'
import { getMedia } from '../services/mediaService'

export default function Gallery() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const data = await getMedia()
      setMedia(data)
    } catch (error) {
      console.error('Lỗi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Đang tải...</div>
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">🖼️ Thư Viện Ảnh</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {media.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
            <img
              src={item.url}
              alt={`Media ${item.id}`}
              className="w-full h-64 object-cover hover:scale-105 transition duration-300"
            />
          </div>
        ))}
      </div>

      {media.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-600">Chưa có ảnh</div>
      )}
    </div>
  )
}

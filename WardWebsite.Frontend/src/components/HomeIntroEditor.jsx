import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getHomepageMedia, getMediaById, setHomepageImage } from '../services/mediaService'

export default function HomeIntroEditor({ user }) {
  const { mediaId } = useParams()
  const navigate = useNavigate()

  const [media, setMedia] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [zoom, setZoom] = useState(1)

  const canEdit = user?.role === 'Admin' || user?.role === 'Editor'

  const toObjectPosition = (offset) => Math.max(0, Math.min(100, 50 + offset))

  useEffect(() => {
    if (!canEdit) {
      navigate('/', { replace: true })
      return
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId, canEdit])

  const fetchData = async () => {
    try {
      setLoading(true)
      setMessage('')

      const [mediaData, homepageData] = await Promise.all([
        getMediaById(mediaId),
        getHomepageMedia()
      ])

      setMedia(mediaData)

      const isCurrentIntro = Number(homepageData?.introMediaId) === Number(mediaId)
      if (isCurrentIntro) {
        setOffsetX(homepageData?.introOffsetX ?? 0)
        setOffsetY(homepageData?.introOffsetY ?? 0)
        setZoom(homepageData?.introZoom ?? 1)
      } else {
        setOffsetX(0)
        setOffsetY(0)
        setZoom(1)
      }
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Không tải được ảnh để chỉnh')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!media) return

    try {
      setSaving(true)
      setMessage('')

      await setHomepageImage(media.id, 'intro', {
        introOffsetX: offsetX,
        introOffsetY: offsetY,
        introZoom: zoom
      })

      navigate('/gallery')
    } catch (error) {
      setMessage(error || 'Lưu ảnh giới thiệu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setOffsetX(0)
    setOffsetY(0)
    setZoom(1)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Đang tải trình chỉnh ảnh giới thiệu...</div>
  }

  if (!media) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Không tìm thấy ảnh cần chỉnh.</p>
        <button
          type="button"
          onClick={() => navigate('/gallery')}
          className="mt-4 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Quay lại thư viện
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Chỉnh ảnh giới thiệu trang chủ</h2>
        <button
          type="button"
          onClick={() => navigate('/gallery')}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
        >
          Quay lại thư viện
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <p className="text-gray-600">
          Chỉnh vùng hiển thị của ảnh giới thiệu bằng cách kéo thanh trượt vị trí và thu phóng.
        </p>

        <div className="relative w-full h-80 md:h-[28rem] overflow-hidden rounded-lg bg-gray-100">
          <img
            src={media.url}
            alt="Intro Preview"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${toObjectPosition(offsetX)}% ${toObjectPosition(offsetY)}%`,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dịch ngang: {offsetX.toFixed(1)}%
            </label>
            <input
              type="range"
              min="-40"
              max="40"
              step="0.5"
              value={offsetX}
              onChange={(e) => setOffsetX(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dịch dọc: {offsetY.toFixed(1)}%
            </label>
            <input
              type="range"
              min="-40"
              max="40"
              step="0.5"
              value={offsetY}
              onChange={(e) => setOffsetY(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thu phóng: {zoom.toFixed(2)}x
            </label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {message && (
          <p className="text-sm text-red-600">{message}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 text-white px-5 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu ảnh giới thiệu'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="bg-gray-100 text-gray-700 px-5 py-2 rounded hover:bg-gray-200"
          >
            Đặt lại mặc định
          </button>
        </div>
      </div>
    </div>
  )
}

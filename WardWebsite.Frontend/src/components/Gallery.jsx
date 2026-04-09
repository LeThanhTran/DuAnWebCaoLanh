import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMedia, getHomepageMedia, uploadMedia, deleteMedia, setHomepageVideo } from '../services/mediaService'

export default function Gallery({ user }) {
  const [media, setMedia] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadKind, setUploadKind] = useState('image')
  const [uploadMessage, setUploadMessage] = useState('')
  const [homeMedia, setHomeMedia] = useState({ bannerUrl: '', introUrl: '', featuredVideoUrl: '' })
  const [deletingId, setDeletingId] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const navigate = useNavigate()

  const canUpload = user?.role === 'Admin' || user?.role === 'Editor'

  const imageAccept = 'image/*,.jpg,.jpeg,.png,.webp,.gif'
  const videoAccept = 'video/*,.mp4,.webm,.mov,.m4v'

  const isImageItem = (item) => {
    const type = String(item?.type || '').toLowerCase()
    return type === 'image' || type === 'homebanner' || type === 'homeintro'
  }

  const isVideoItem = (item) => {
    const type = String(item?.type || '').toLowerCase()
    return type === 'video' || type === 'homefeaturedvideo'
  }

  const mediaByTab = media.filter((item) => {
    if (activeTab === 'image') {
      return isImageItem(item)
    }

    if (activeTab === 'video') {
      return isVideoItem(item)
    }

    return true
  })

  useEffect(() => {
    fetchMedia()
    fetchHomeMedia()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewImage(null)
        setOpenMenuId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  const fetchHomeMedia = async () => {
    try {
      const data = await getHomepageMedia()
      setHomeMedia({
        bannerUrl: data?.bannerUrl || '',
        introUrl: data?.introUrl || '',
        featuredVideoUrl: data?.featuredVideoUrl || ''
      })
    } catch (error) {
      console.error('Lỗi lấy ảnh trang chủ:', error)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (!selectedFile) {
      setUploadMessage(uploadKind === 'video' ? 'Vui lòng chọn video trước khi tải lên' : 'Vui lòng chọn ảnh trước khi tải lên')
      return
    }

    try {
      setUploading(true)
      setUploadMessage('')

      const newMedia = await uploadMedia(selectedFile)
      setMedia(prev => [newMedia, ...prev])
      setSelectedFile(null)
      setUploadMessage('Tải media thành công')

      e.target.reset()
    } catch (error) {
      setUploadMessage(error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMedia = async (item) => {
    const itemLabel = isVideoItem(item) ? 'video' : 'ảnh'
    const confirmed = window.confirm(`Bạn có chắc muốn xóa ${itemLabel} này? Thao tác này không thể hoàn tác.`)
    if (!confirmed) {
      return
    }

    try {
      setUploadMessage('')
      setDeletingId(item.id)
      await deleteMedia(item.id)
      setMedia(prev => prev.filter(mediaItem => mediaItem.id !== item.id))
      await fetchHomeMedia()
      setUploadMessage('Đã xóa media thành công')
      setOpenMenuId(null)
    } catch (error) {
      setUploadMessage(error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetHomepageVideo = async (item) => {
    try {
      setUploadMessage('')
      setDeletingId(item.id)
      await setHomepageVideo(item.id)
      await fetchHomeMedia()
      setUploadMessage('Gắn video trang chủ thành công')
      setOpenMenuId(null)
    } catch (error) {
      setUploadMessage(error)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Đang tải...</div>
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">🖼️ Thư Viện Media</h2>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            activeTab === 'all'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Tất cả ({media.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            activeTab === 'image'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Ảnh ({media.filter(item => isImageItem(item)).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            activeTab === 'video'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Video ({media.filter(item => isVideoItem(item)).length})
        </button>
      </div>

      {homeMedia.featuredVideoUrl && (
        <div className="mb-8 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
          Video nổi bật trang chủ đã được thiết lập. Bạn có thể đổi video trực tiếp trong danh sách bên dưới.
        </div>
      )}

      {canUpload && (
        <div className="bg-white rounded-lg shadow p-6 mb-8 fx-fade-up">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Tải media mới</h3>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setUploadKind('image')
                setSelectedFile(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                uploadKind === 'image'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tải ảnh
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadKind('video')
                setSelectedFile(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                uploadKind === 'video'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tải video
            </button>
          </div>

          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {uploadKind === 'video' ? 'Chọn file video (tối đa 100MB)' : 'Chọn file ảnh (tối đa 10MB)'}
              </label>
              <input
                type="file"
                accept={uploadKind === 'video' ? videoAccept : imageAccept}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Đang tải...' : (uploadKind === 'video' ? 'Tải video' : 'Tải ảnh')}
            </button>
          </form>

          {uploadMessage && (
            <p className={`mt-3 text-sm ${uploadMessage.includes('thành công') ? 'text-green-600' : 'text-red-600'}`}>
              {uploadMessage}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mediaByTab.map(item => (
          <div
            key={item.id}
            className="group relative bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition fx-card-lift"
            onMouseLeave={() => {
              if (openMenuId === item.id) {
                setOpenMenuId(null)
              }
            }}
          >
            {isVideoItem(item) ? (
              <div className="relative block w-full bg-black">
                <video
                  src={item.url}
                  controls
                  preload="metadata"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 left-2 text-xs text-white bg-purple-600/90 px-2 py-1 rounded-full">
                  Video
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewImage(item)}
                className="relative block w-full"
              >
                <img
                  src={item.url}
                  alt={`Media ${item.id}`}
                  className="w-full h-64 object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/55 px-2 py-1 rounded">
                  Bấm để phóng to
                </div>
              </button>
            )}

            {(isImageItem(item) && (homeMedia.bannerUrl === item.url || homeMedia.introUrl === item.url)) && (
              <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 text-xs">
                {homeMedia.bannerUrl === item.url && (
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Ảnh bìa hiện tại</span>
                )}
                {homeMedia.introUrl === item.url && (
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Ảnh giới thiệu hiện tại</span>
                )}
              </div>
            )}

            {(isVideoItem(item) && homeMedia.featuredVideoUrl === item.url) && (
              <div className="absolute top-10 left-2 z-20 text-xs">
                <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">Video trang chủ</span>
              </div>
            )}

            {canUpload && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(prev => (prev === item.id ? null : item.id))
                  }}
                  disabled={deletingId === item.id}
                  className="absolute top-2 right-2 z-30 h-9 w-9 rounded-full bg-black/55 text-white text-xl leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/70 transition disabled:opacity-60"
                  aria-label="Tùy chọn media"
                  title="Tùy chọn media"
                >
                  ⋮
                </button>

                <div
                  className={`absolute right-2 top-12 z-30 w-52 rounded-lg bg-white/95 backdrop-blur border border-gray-200 shadow-lg p-2 transition ${
                    openMenuId === item.id
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
                  }`}
                >
                  {isImageItem(item) && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(null)
                          navigate(`/gallery/banner-editor/${item.id}`)
                        }}
                        disabled={deletingId === item.id}
                        className="w-full text-left text-sm px-3 py-2 rounded hover:bg-blue-50 text-blue-700 disabled:opacity-50"
                      >
                        Chỉnh ảnh bìa
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(null)
                          navigate(`/gallery/intro-editor/${item.id}`)
                        }}
                        disabled={deletingId === item.id}
                        className="w-full text-left text-sm px-3 py-2 rounded hover:bg-emerald-50 text-emerald-700 disabled:opacity-50"
                      >
                        Chỉnh ảnh giới thiệu
                      </button>
                    </>
                  )}

                  {isVideoItem(item) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetHomepageVideo(item)
                      }}
                      disabled={deletingId !== null || homeMedia.featuredVideoUrl === item.url}
                      className="w-full text-left text-sm px-3 py-2 rounded hover:bg-purple-50 text-purple-700 disabled:opacity-50"
                    >
                      {homeMedia.featuredVideoUrl === item.url ? 'Đang hiển thị trang chủ' : 'Đặt video trang chủ'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteMedia(item)
                    }}
                    disabled={deletingId !== null}
                    className="w-full text-left text-sm px-3 py-2 rounded hover:bg-red-50 text-red-700 disabled:opacity-50"
                  >
                    {deletingId === item.id ? 'Đang xóa...' : (isVideoItem(item) ? 'Xóa video' : 'Xóa ảnh')}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 h-12 w-12 rounded-full bg-white text-gray-800 text-2xl leading-none flex items-center justify-center hover:bg-gray-100"
            aria-label="Đóng ảnh"
          >
            ×
          </button>

          <img
            src={previewImage.url}
            alt={`Xem ảnh ${previewImage.id}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {mediaByTab.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-600">
          {activeTab === 'video' ? 'Chưa có video' : activeTab === 'image' ? 'Chưa có ảnh' : 'Chưa có media'}
        </div>
      )}
    </div>
  )
}

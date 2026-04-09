import React, { useEffect, useState } from 'react'
import { getServices } from '../services/serviceService'
import { getPublicForms, getDownloadUrl } from '../services/formService'

const formatFileSize = (size) => {
  if (!size || size <= 0) {
    return 'N/A'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export default function DownloadFormsPublic() {
  const [forms, setForms] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [serviceId, setServiceId] = useState('ALL')

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [serviceData, formData] = await Promise.all([
        getServices(),
        getPublicForms({
          serviceId: serviceId === 'ALL' ? null : Number(serviceId),
          search
        })
      ])

      setServices(serviceData || [])
      setForms(formData || [])
    } catch (loadError) {
      setError(typeof loadError === 'string' ? loadError : 'Không tải được biểu mẫu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, serviceId])

  const handleDownload = (form) => {
    const downloadUrl = getDownloadUrl(form)
    window.open(downloadUrl, '_blank', 'noopener,noreferrer')

    setForms((prev) =>
      prev.map((item) =>
        item.id === form.id
          ? { ...item, downloadCount: (item.downloadCount || 0) + 1 }
          : item
      )
    )
  }

  return (
    <div className="download-page space-y-6">
      <section className="download-hero fx-fade-up">
        <div>
          <p className="download-eyebrow">Thư viện hành chính</p>
          <h1>Biểu mẫu tải về</h1>
          <p>
            Tải đúng biểu mẫu theo từng dịch vụ, điền trước thông tin cần thiết để rút ngắn thời gian nộp hồ sơ.
          </p>
        </div>
        <div className="download-hero-chip">
          <span>{forms.length}</span>
          <small>Biểu mẫu hiển thị</small>
        </div>
      </section>

      <div className="download-filter-card fx-fade-up">
        <div className="download-filter-grid">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên biểu mẫu"
            className="download-input download-input-wide"
          />
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="download-input"
          >
            <option value="ALL">Tất cả dịch vụ</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="download-list-card fx-fade-up">
        {loading && <p className="download-state">Đang tải biểu mẫu...</p>}
        {!loading && error && <p className="download-error">{error}</p>}

        {!loading && !error && forms.length === 0 && (
          <div className="download-empty">
            Không có biểu mẫu phù hợp với điều kiện tìm kiếm.
          </div>
        )}

        {!loading && !error && forms.length > 0 && (
          <div className="download-grid">
            {forms.map((form) => (
              <article key={form.id} className="download-item fx-card-lift">
                <div className="download-item-header">
                  <div>
                    <h3>{form.title}</h3>
                    <p>{form.serviceName || 'Biểu mẫu dùng chung'}</p>
                  </div>
                  <span className="download-file-chip">
                    {form.fileExtension?.replace('.', '').toUpperCase() || 'FILE'}
                  </span>
                </div>

                <p className="download-description">{form.description || 'Không có mô tả'}</p>

                <div className="download-meta">
                  <p>Kích thước: {formatFileSize(form.fileSizeBytes)}</p>
                  <p>Lượt tải: {form.downloadCount || 0}</p>
                  <p>Tên file: {form.originalFileName}</p>
                  <p>Ngày cập nhật: {new Date(form.updatedAt || form.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>

                <button
                  onClick={() => handleDownload(form)}
                  className="download-button"
                >
                  Tải biểu mẫu
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

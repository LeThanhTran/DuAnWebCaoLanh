import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getServices } from '../services/serviceService'
import ApplicationForm from './ApplicationForm'

export default function ServiceList({ isLoggedIn = false }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedService, setSelectedService] = useState(null)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const data = await getServices()
      setServices(data)
    } catch (error) {
      alert('Lỗi: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const handleBackFromForm = () => {
    setSelectedService(null)
  }

  if (loading) {
    return <div className="service-loading">Đang tải dịch vụ...</div>
  }

  if (selectedService && isLoggedIn) {
    return (
      <div className="service-page">
        <ApplicationForm service={selectedService} onBack={handleBackFromForm} />
      </div>
    )
  }

  return (
    <div className="service-page space-y-6">
      {!isLoggedIn && (
        <div className="service-notice fx-fade-up">
          Vui lòng đăng nhập để nộp hồ sơ dịch vụ. Bạn vẫn có thể tra cứu hồ sơ và tải biểu mẫu công khai.
        </div>
      )}

      <section className="service-hero fx-fade-up">
        <div>
          <p className="service-eyebrow">Dịch vụ công trực tuyến</p>
          <h2>Danh mục dịch vụ hành chính</h2>
          <p>
            Tra cứu thông tin thủ tục, chuẩn bị hồ sơ đúng mẫu và nộp trực tuyến ngay khi cần xử lý.
          </p>
        </div>
        <div className="service-hero-chip">
          <span>{services.length}</span>
          <small>Dịch vụ sẵn sàng</small>
        </div>
      </section>

      <div className="service-quick-links fx-fade-up">
        <Link
          to="/tra-cuu-ho-so"
          className="service-quick-link service-quick-link-primary"
        >
          Tra cứu trạng thái hồ sơ
        </Link>
        <Link
          to="/bieu-mau"
          className="service-quick-link service-quick-link-secondary"
        >
          Tải biểu mẫu hồ sơ
        </Link>
      </div>

      <h2 className="service-title">Danh sách dịch vụ</h2>

      {services.length === 0 ? (
        <p className="service-empty">Không có dịch vụ nào</p>
      ) : (
        <div className="service-grid">
          {services.map((service, index) => (
            <article key={service.id} className="service-card fx-card-lift">
              <div className="service-card-header">
                <h3>{service.name}</h3>
                <span>
                  STT: {services.length - index}
                </span>
              </div>

              <p className="service-card-description">
                {service.description}
              </p>

              {isLoggedIn ? (
                <button
                  onClick={() => setSelectedService(service)}
                  className="service-primary-button"
                >
                  Nộp hồ sơ
                </button>
              ) : (
                <Link
                  to="/"
                  className="service-secondary-button"
                >
                  Đăng nhập để sử dụng dịch vụ
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

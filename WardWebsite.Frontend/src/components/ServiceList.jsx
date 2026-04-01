import { useState, useEffect } from 'react'
import { getServices } from '../services/serviceService'
import ApplicationForm from './ApplicationForm'

export default function ServiceList() {
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
    return <div className="text-center py-8 text-gray-600">Đang tải dịch vụ...</div>
  }

  if (selectedService) {
    return <ApplicationForm service={selectedService} onBack={handleBackFromForm} />
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Danh sách dịch vụ</h2>

      {services.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Không có dịch vụ nào</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map(service => (
            <div key={service.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  ID: {service.id}
                </span>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                {service.description}
              </p>

              <button
                onClick={() => setSelectedService(service)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Nộp hồ sơ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

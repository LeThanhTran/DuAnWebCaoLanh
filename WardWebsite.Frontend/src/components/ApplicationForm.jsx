import React, { useState, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import axios from 'axios';
import applicationAPI from '../services/applicationAPI';

export default function ApplicationForm({ service = null, onBack = null }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    serviceId: service?.id ? String(service.id) : ''
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/services');
        setServices(response.data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      alert('Vui lòng nhập họ tên');
      return;
    }
    if (!formData.phone.trim()) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }
    if (!formData.address.trim()) {
      alert('Vui lòng nhập địa chỉ');
      return;
    }
    if (!formData.serviceId) {
      alert('Vui lòng chọn dịch vụ');
      return;
    }

    const parsedServiceId = Number(formData.serviceId);
    if (Number.isNaN(parsedServiceId) || parsedServiceId <= 0) {
      alert('Dịch vụ không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const result = await applicationAPI.createApplication({
        ...formData,
        serviceId: parsedServiceId
      });

      setSubmissionInfo({
        lookupCode: result?.lookup?.lookupCode || result?.data?.lookupCode || '',
        phone: result?.lookup?.phone || formData.phone
      });

      setSubmitted(true);
      setFormData({
        fullName: '',
        phone: '',
        address: '',
        serviceId: service?.id ? String(service.id) : ''
      });
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        alert('Bạn cần đăng nhập để nộp hồ sơ dịch vụ.');
      } else {
        alert('Lỗi nộp hồ sơ: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
      {service && onBack && (
        <button
          onClick={onBack}
          type="button"
          className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Quay lại danh sách dịch vụ
        </button>
      )}
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Nộp Hồ sơ Dịch vụ Công</h1>
      <p className="text-gray-600 mb-2">Vui lòng điền đầy đủ thông tin để nộp hồ sơ</p>
      {service && (
        <p className="text-sm text-blue-700 mb-8">Bạn đang nộp cho dịch vụ: <strong>{service.name}</strong></p>
      )}

      {submitted && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <p className="font-semibold">Nộp hồ sơ thành công! Chúng tôi sẽ liên hệ với bạn trong thời gian sớm.</p>
          {submissionInfo?.lookupCode && (
            <div className="mt-2 text-sm leading-relaxed">
              <p>
                Mã tra cứu hồ sơ: <span className="font-bold">{submissionInfo.lookupCode}</span>
              </p>
              <p>
                Số điện thoại tra cứu: <span className="font-semibold">{submissionInfo.phone}</span>
              </p>
              <p className="mt-1">
                Mã hồ sơ đã được gắn với số điện thoại của bạn để hỗ trợ tra cứu và gửi thông báo.
              </p>
              <p className="mt-1">
                Bạn có thể vào <a href="/tra-cuu-ho-so" className="underline font-semibold">trang tra cứu hồ sơ</a> để theo dõi trạng thái.
              </p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Nhập họ và tên"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="0912345678"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Địa chỉ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Nhập địa chỉ"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dịch vụ <span className="text-red-500">*</span>
          </label>
          <select
            name="serviceId"
            value={formData.serviceId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">-- Chọn dịch vụ --</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Send size={20} />
              Nộp hồ sơ
            </>
          )}
        </button>
      </form>
    </div>
  );
}

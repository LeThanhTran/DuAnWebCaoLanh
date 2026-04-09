import { useEffect, useState } from 'react'
import {
  createService,
  deleteService,
  getServices,
  updateService
} from '../services/serviceService'
import Toast from './Toast'

const initialForm = {
  name: '',
  description: ''
}

export default function ServiceManagement() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [toast, setToast] = useState({ message: '', type: 'info' })

  useEffect(() => {
    fetchServices()
  }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    window.setTimeout(() => setToast({ message: '', type: 'info' }), 3000)
  }

  const fetchServices = async () => {
    try {
      setLoading(true)
      const data = await getServices()
      setServices(data || [])
    } catch (error) {
      showToast(error || 'Không tải được dịch vụ', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      name: form.name.trim(),
      description: form.description.trim()
    }

    if (!payload.name) {
      showToast('Vui lòng nhập tên dịch vụ', 'error')
      return
    }

    if (!payload.description) {
      showToast('Vui lòng nhập mô tả dịch vụ', 'error')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateService(editingId, payload)
        showToast('Cập nhật dịch vụ thành công', 'success')
      } else {
        await createService(payload)
        showToast('Tạo dịch vụ thành công', 'success')
      }

      resetForm()
      await fetchServices()
    } catch (error) {
      showToast(error || 'Lưu dịch vụ thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description
    })
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa dịch vụ "${item.name}"?`)) return

    try {
      setDeletingId(item.id)
      const response = await deleteService(item.id)
      showToast(response?.message || 'Xóa dịch vụ thành công', 'success')

      if (editingId === item.id) {
        resetForm()
      }

      await fetchServices()
    } catch (error) {
      showToast(error || 'Xóa dịch vụ thất bại', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

      <div className="bg-gradient-to-r from-teal-700 to-emerald-700 rounded-xl p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Quản lý dịch vụ hành chính</h1>
        <p className="text-emerald-100 mt-1">Thực hiện CRUD dịch vụ để chuẩn hóa danh mục thủ tục phục vụ người dân.</p>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {editingId ? 'Cập nhật dịch vụ' : 'Tạo dịch vụ mới'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Tên dịch vụ"
            maxLength={200}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />

          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Mô tả dịch vụ"
            maxLength={2000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mới'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50"
            >
              Làm mới
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Danh sách dịch vụ</h2>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-gray-500">Chưa có dịch vụ nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Tên dịch vụ</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-left">Số hồ sơ</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {services.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 font-medium text-gray-800 min-w-[180px]">{item.name}</td>
                    <td className="px-4 py-3 text-gray-700 min-w-[320px]">{item.description}</td>
                    <td className="px-4 py-3">{item.applicationCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          {deletingId === item.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

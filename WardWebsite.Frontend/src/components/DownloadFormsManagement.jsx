import React, { useEffect, useMemo, useState } from 'react'
import { getServices } from '../services/serviceService'
import { deleteForm, getAllForms, getDownloadUrl, updateForm, uploadForm } from '../services/formService'

const initialUploadState = {
  title: '',
  description: '',
  serviceId: '',
  sortOrder: 0,
  isActive: true,
  file: null
}

export default function DownloadFormsManagement() {
  const [forms, setForms] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploadData, setUploadData] = useState(initialUploadState)
  const [editData, setEditData] = useState(null)

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])

  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'Editor'

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [formsData, servicesData] = await Promise.all([
        getAllForms({ includeInactive: true }),
        getServices()
      ])

      setForms(formsData || [])
      setServices(servicesData || [])
    } catch (loadError) {
      setError(typeof loadError === 'string' ? loadError : 'Không tải được dữ liệu biểu mẫu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showMessage = (text) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2500)
  }

  const handleUploadChange = (field, value) => {
    setUploadData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitUpload = async (event) => {
    event.preventDefault()

    if (!uploadData.title.trim()) {
      setError('Vui lòng nhập tên biểu mẫu')
      return
    }

    if (!uploadData.file) {
      setError('Vui lòng chọn file biểu mẫu để tải lên')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await uploadForm({
        title: uploadData.title,
        description: uploadData.description,
        serviceId: uploadData.serviceId ? Number(uploadData.serviceId) : null,
        sortOrder: Number(uploadData.sortOrder) || 0,
        isActive: uploadData.isActive,
        file: uploadData.file
      })

      setUploadData(initialUploadState)
      await loadData()
      showMessage('Tải biểu mẫu thành công')
    } catch (submitError) {
      setError(typeof submitError === 'string' ? submitError : 'Không thể tải biểu mẫu')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (form) => {
    setEditData({
      id: form.id,
      title: form.title || '',
      description: form.description || '',
      serviceId: form.serviceId ? String(form.serviceId) : '',
      sortOrder: form.sortOrder || 0,
      isActive: Boolean(form.isActive)
    })
  }

  const handleSaveEdit = async () => {
    if (!editData) {
      return
    }

    if (!editData.title.trim()) {
      setError('Tên biểu mẫu không được để trống')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await updateForm(editData.id, {
        title: editData.title,
        description: editData.description,
        serviceId: editData.serviceId ? Number(editData.serviceId) : null,
        sortOrder: Number(editData.sortOrder) || 0,
        isActive: editData.isActive
      })

      setEditData(null)
      await loadData()
      showMessage('Cập nhật biểu mẫu thành công')
    } catch (saveError) {
      setError(typeof saveError === 'string' ? saveError : 'Không thể cập nhật biểu mẫu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (form) => {
    const confirmed = window.confirm(`Xóa biểu mẫu "${form.title}"?`)
    if (!confirmed) {
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await deleteForm(form.id)
      await loadData()
      showMessage('Đã xóa biểu mẫu')
    } catch (deleteError) {
      setError(typeof deleteError === 'string' ? deleteError : 'Không thể xóa biểu mẫu')
    } finally {
      setSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý biểu mẫu</h1>
        <p className="text-red-600 mt-3">Bạn không có quyền truy cập trang này.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Quản lý biểu mẫu tải về</h1>
        <p className="text-slate-200 mt-1">Tải lên, chỉnh sửa và bật/tắt biểu mẫu cung cấp cho công dân.</p>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-300 text-green-700 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1 bg-white rounded-xl shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Tải biểu mẫu mới</h2>

          <form className="space-y-3 mt-4" onSubmit={handleSubmitUpload}>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) => handleUploadChange('title', e.target.value)}
              placeholder="Tên biểu mẫu"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={submitting}
            />

            <textarea
              value={uploadData.description}
              onChange={(e) => handleUploadChange('description', e.target.value)}
              rows={3}
              placeholder="Mô tả ngắn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={submitting}
            />

            <select
              value={uploadData.serviceId}
              onChange={(e) => handleUploadChange('serviceId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={submitting}
            >
              <option value="">Biểu mẫu dùng chung</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={uploadData.sortOrder}
                onChange={(e) => handleUploadChange('sortOrder', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Thứ tự"
                disabled={submitting}
              />

              <label className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={uploadData.isActive}
                  onChange={(e) => handleUploadChange('isActive', e.target.checked)}
                  disabled={submitting}
                />
                Hiển thị công khai
              </label>
            </div>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => handleUploadChange('file', e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={submitting}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Đang xử lý...' : 'Tải biểu mẫu'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Danh sách biểu mẫu</h2>

          {loading && <p className="text-gray-600">Đang tải dữ liệu...</p>}

          {!loading && forms.length === 0 && (
            <p className="text-gray-500">Chưa có biểu mẫu nào.</p>
          )}

          {!loading && forms.length > 0 && (
            <div className="space-y-3">
              {forms.map((form) => (
                <div key={form.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{form.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{form.description || 'Không có mô tả'}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {form.serviceName || 'Dùng chung'} | Lượt tải: {form.downloadCount || 0} | File: {form.originalFileName}
                      </p>
                      <a
                        href={getDownloadUrl(form)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-sm text-blue-600 hover:underline mt-2"
                      >
                        Mở link tải
                      </a>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(form)}
                        className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100"
                        disabled={submitting}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(form)}
                        className="px-3 py-2 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50"
                        disabled={submitting}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {editData?.id === form.id && (
                    <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Tên biểu mẫu"
                        disabled={submitting}
                      />

                      <select
                        value={editData.serviceId}
                        onChange={(e) => setEditData((prev) => ({ ...prev, serviceId: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        disabled={submitting}
                      >
                        <option value="">Biểu mẫu dùng chung</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2"
                        placeholder="Mô tả"
                        disabled={submitting}
                      />

                      <input
                        type="number"
                        value={editData.sortOrder}
                        onChange={(e) => setEditData((prev) => ({ ...prev, sortOrder: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Thứ tự"
                        disabled={submitting}
                      />

                      <label className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editData.isActive}
                          onChange={(e) => setEditData((prev) => ({ ...prev, isActive: e.target.checked }))}
                          disabled={submitting}
                        />
                        Hiển thị công khai
                      </label>

                      <div className="md:col-span-2 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditData(null)}
                          className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-100"
                          disabled={submitting}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                          disabled={submitting}
                        >
                          Lưu thay đổi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

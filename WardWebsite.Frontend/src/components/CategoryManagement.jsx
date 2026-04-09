import { useEffect, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory
} from '../services/categoryService'
import Toast from './Toast'

export default function CategoryManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'info' })

  useEffect(() => {
    fetchCategories()
  }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    window.setTimeout(() => setToast({ message: '', type: 'info' }), 3000)
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setCategories(data || [])
    } catch (error) {
      showToast(error || 'Không tải được danh mục', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedName = name.trim()
    if (!normalizedName) {
      showToast('Vui lòng nhập tên danh mục', 'error')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateCategory(editingId, { name: normalizedName })
        showToast('Cập nhật danh mục thành công', 'success')
      } else {
        await createCategory({ name: normalizedName })
        showToast('Tạo danh mục thành công', 'success')
      }

      resetForm()
      await fetchCategories()
    } catch (error) {
      showToast(error || 'Lưu danh mục thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setName(item.name)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa danh mục "${item.name}"?`)) return

    try {
      setDeletingId(item.id)
      await deleteCategory(item.id)
      showToast('Xóa danh mục thành công', 'success')

      if (editingId === item.id) {
        resetForm()
      }

      await fetchCategories()
    } catch (error) {
      showToast(error || 'Xóa danh mục thất bại', 'error')
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

      <div className="bg-gradient-to-r from-indigo-700 to-blue-700 rounded-xl p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Quản lý danh mục</h1>
        <p className="text-indigo-100 mt-1">Thêm, chỉnh sửa và xóa danh mục tin tức phục vụ quản trị nội dung.</p>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {editingId ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên danh mục"
            className="md:col-span-8 border border-gray-300 rounded-lg px-3 py-2"
            maxLength={100}
          />

          <button
            type="submit"
            disabled={saving}
            className="md:col-span-2 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mới'}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="md:col-span-2 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50"
          >
            Làm mới
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Danh sách danh mục</h2>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-gray-500">Chưa có danh mục nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Tên danh mục</th>
                  <th className="px-4 py-3 text-left">Số bài viết</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3">{item.articleCount ?? 0}</td>
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

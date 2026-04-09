import { useState, useEffect } from 'react'
import { createArticle } from '../services/articleService'
import axios from 'axios'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean']
  ]
}

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'link',
  'image'
]

const extractPlainText = (html) => {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function ArticleForm({ onArticleCreated }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    categoryId: 0
  })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories')
      const list = response.data || []
      setCategories(list)
      if (list.length > 0) {
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || list[0].id
        }))
      }
    } catch (error) {
      console.error('Lỗi lấy categories:', error)
    }
  }

  const handleSubmit = async (submitForReview = false) => {
    const normalizedTitle = form.title.trim()
    const plainContent = extractPlainText(form.content)

    if (!normalizedTitle) {
      alert('Vui lòng nhập tiêu đề')
      return
    }

    if (!plainContent) {
      alert('Vui lòng nhập nội dung')
      return
    }

    if (!form.categoryId) {
      alert('Vui lòng chọn danh mục')
      return
    }

    try {
      setLoading(true)
      await createArticle({
        title: normalizedTitle,
        content: form.content,
        categoryId: Number(form.categoryId),
        submitForReview
      })

      setForm({
        title: '',
        content: '',
        categoryId: categories[0]?.id || 0
      })
      onArticleCreated()
      alert(submitForReview ? 'Đã gửi bài viết chờ duyệt' : 'Đã lưu bài viết dạng nháp')
    } catch (error) {
      alert('Lỗi: ' + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Viết bài viết mới</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit(false)
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh mục
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tiêu đề
          </label>
          <input
            type="text"
            maxLength={500}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tiêu đề bài viết"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nội dung (WYSIWYG)
          </label>
          <ReactQuill
            value={form.content}
            onChange={(value) => setForm({ ...form, content: value })}
            modules={quillModules}
            formats={quillFormats}
            placeholder="Nhập nội dung bài viết..."
            className="bg-white"
          />
          <p className="text-xs text-gray-500 mt-12">
            {extractPlainText(form.content).length} ký tự nội dung thuần
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
          >
            {loading ? 'Đang lưu...' : 'Lưu nháp'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(true)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Đang gửi...' : 'Gửi duyệt'}
          </button>
        </div>
      </form>
    </div>
  )
}

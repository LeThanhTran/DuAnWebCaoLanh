import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const rolePermissions = {
  Admin: {
    taoBaiViet: true,
    suaBaiViet: true,
    xoaBaiViet: true,
    quanLyNguoiDung: true,
    quanLyHoSo: true,
    phanQuyen: true,
    xemNhatKy: true,
    quanLyNhanXet: true
  },
  Editor: {
    taoBaiViet: true,
    suaBaiViet: true,
    xoaBaiViet: false,
    quanLyNguoiDung: false,
    quanLyHoSo: true,
    phanQuyen: false,
    xemNhatKy: true,
    quanLyNhanXet: true
  },
  Viewer: {
    taoBaiViet: false,
    suaBaiViet: false,
    xoaBaiViet: false,
    quanLyNguoiDung: false,
    quanLyHoSo: false,
    phanQuyen: false,
    xemNhatKy: false,
    quanLyNhanXet: false
  }
}

const permissionGroups = [
  {
    key: 'noiDung',
    label: 'Nội dung',
    items: ['taoBaiViet', 'suaBaiViet', 'xoaBaiViet']
  },
  {
    key: 'nghiepVu',
    label: 'Nghiệp vụ',
    items: ['quanLyHoSo', 'quanLyNhanXet']
  },
  {
    key: 'quanTri',
    label: 'Quản trị',
    items: ['quanLyNguoiDung', 'phanQuyen', 'xemNhatKy']
  }
]

const roleMap = { Admin: 1, Editor: 2, Viewer: 3 }

export default function PermissionMatrixPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingUserId, setSavingUserId] = useState(null)
  const [draftRoles, setDraftRoles] = useState({})

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setUsers(response.data || [])
      const initialDraft = {}
      ;(response.data || []).forEach((u) => {
        initialDraft[u.id] = u.role
      })
      setDraftRoles(initialDraft)
    } catch (error) {
      alert(error.response?.data?.message || 'Không tải được danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  const getGroupScore = (roleName, group) => {
    const permission = rolePermissions[roleName] || rolePermissions.Viewer
    const enabled = group.items.filter((k) => permission[k]).length
    return `${enabled}/${group.items.length}`
  }

  const handleSaveRole = async (user) => {
    const nextRole = draftRoles[user.id]
    if (!nextRole || nextRole === user.role) return

    try {
      setSavingUserId(user.id)
      const token = localStorage.getItem('token')
      await axios.put(
        `/api/users/${user.id}/role`,
        { roleId: roleMap[nextRole] },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      await fetchUsers()
    } catch (error) {
      alert(error.response?.data?.message || 'Cập nhật vai trò thất bại')
    } finally {
      setSavingUserId(null)
    }
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ma trận phân quyền</h2>
        <p className="text-red-600">Chỉ Admin mới có quyền truy cập phần này.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Đang tải ma trận phân quyền...</div>
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Ma trận phân quyền toàn diện</h2>
      <p className="text-gray-600 mb-6">Đổi vai trò trực tiếp bằng combobox và xem quyền theo nhóm bằng menu thả xuống.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left">Người dùng</th>
              <th className="px-4 py-3 text-left">Vai trò</th>
              <th className="px-4 py-3 text-left">Nhóm quyền</th>
              <th className="px-4 py-3 text-left">Chi tiết quyền</th>
              <th className="px-4 py-3 text-left">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleName = draftRoles[user.id] || user.role
              const roleChanged = roleName !== user.role
              return (
                <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 font-medium text-gray-800">{user.username}</td>

                  <td className="px-4 py-3">
                    <select
                      value={roleName}
                      onChange={(e) => setDraftRoles((prev) => ({ ...prev, [user.id]: e.target.value }))}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white min-w-[140px]"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {permissionGroups.map((group) => (
                        <span key={group.key} className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                          {group.label}: {getGroupScore(roleName, group)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <details className="group">
                      <summary className="cursor-pointer text-blue-700 hover:text-blue-900 font-medium">
                        Mở chi tiết quyền
                      </summary>
                      <div className="mt-2 space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        {permissionGroups.map((group) => {
                          const permission = rolePermissions[roleName] || rolePermissions.Viewer
                          return (
                            <div key={group.key}>
                              <p className="font-semibold text-gray-700">{group.label}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {group.items.map((k) => (
                                  <span
                                    key={k}
                                    className={`px-2 py-1 rounded text-xs ${permission[k] ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                                  >
                                    {k === 'taoBaiViet' && 'Tạo bài viết'}
                                    {k === 'suaBaiViet' && 'Sửa bài viết'}
                                    {k === 'xoaBaiViet' && 'Xóa bài viết'}
                                    {k === 'quanLyNguoiDung' && 'Quản lý người dùng'}
                                    {k === 'quanLyHoSo' && 'Quản lý hồ sơ'}
                                    {k === 'phanQuyen' && 'Phân quyền'}
                                    {k === 'xemNhatKy' && 'Xem nhật ký'}
                                    {k === 'quanLyNhanXet' && 'Quản lý nhận xét'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSaveRole(user)}
                      disabled={!roleChanged || savingUserId === user.id}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingUserId === user.id ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-gray-500">Không có dữ liệu người dùng.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

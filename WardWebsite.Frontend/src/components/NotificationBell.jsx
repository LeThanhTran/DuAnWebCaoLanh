import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const levelClassMap = {
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900'
}

export default function NotificationBell({ user = null, onItemClick }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const bellRef = useRef(null)

  const role = user?.role || ''
  const isAdmin = role === 'Admin'
  const isEditor = role === 'Editor'
  const isViewer = role === 'Viewer'
  const canUseAdminNotifications = isAdmin || isEditor

  const totalBadge = useMemo(() => {
    return notifications.reduce((sum, item) => sum + Math.max(0, Number(item.count || 0)), 0)
  }, [notifications])

  const closeDropdown = () => setOpen(false)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (!bellRef.current || bellRef.current.contains(event.target)) {
        return
      }

      closeDropdown()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      return undefined
    }

    let active = true

    const safeRequest = async (requestFactory, fallbackValue) => {
      try {
        return await requestFactory()
      } catch {
        return fallbackValue
      }
    }

    const fetchNotifications = async () => {
      setLoading(true)

      try {
        const headers = getAuthHeaders()

        if (canUseAdminNotifications) {
          const [pendingCommentsResponse, pendingApplicationsResponse, contactsResponse] = await Promise.all([
            safeRequest(
              () => axios.get('/api/comments/moderation', {
                params: { status: 'Pending', page: 1, pageSize: 1 },
                headers
              }),
              null
            ),
            safeRequest(
              () => axios.get('/api/applications', {
                params: { status: 'Pending', page: 1, pageSize: 1 },
                headers
              }),
              null
            ),
            isAdmin
              ? safeRequest(() => axios.get('/api/contactmessages', { headers }), null)
              : Promise.resolve(null)
          ])

          const pendingComments = Number(pendingCommentsResponse?.data?.total || 0)
          const pendingApplications = Number(pendingApplicationsResponse?.data?.pagination?.total || 0)
          const unhandledContacts = isAdmin
            ? (contactsResponse?.data?.data || []).filter((item) => !item.isHandled).length
            : 0

          const adminItems = [
            {
              id: 'pending-comments',
              title: 'Bình luận chờ duyệt',
              description: pendingComments > 0
                ? `Có ${pendingComments} bình luận đang chờ kiểm duyệt.`
                : 'Không còn bình luận chờ duyệt.',
              path: '/kiem-duyet-binh-luan',
              count: pendingComments,
              level: pendingComments > 0 ? 'warning' : 'info'
            },
            {
              id: 'pending-applications',
              title: 'Hồ sơ đang chờ xử lý',
              description: pendingApplications > 0
                ? `Có ${pendingApplications} hồ sơ đang ở trạng thái chờ xử lý.`
                : 'Hiện không có hồ sơ chờ xử lý.',
              path: '/applications',
              count: pendingApplications,
              level: pendingApplications > 0 ? 'warning' : 'info'
            }
          ]

          if (isAdmin) {
            adminItems.unshift({
              id: 'pending-contacts',
              title: 'Tin nhắn liên hệ chưa xử lý',
              description: unhandledContacts > 0
                ? `Có ${unhandledContacts} tin nhắn liên hệ cần phản hồi.`
                : 'Tất cả tin nhắn liên hệ đã được xử lý.',
              path: '/tin-nhan-lien-he',
              count: unhandledContacts,
              level: unhandledContacts > 0 ? 'danger' : 'info'
            })
          }

          if (active) {
            setNotifications(adminItems)
          }

          return
        }

        if (isViewer) {
          const [articlesResponse, featuredResponse, servicesResponse, appSummaryResponse] = await Promise.all([
            safeRequest(
              () => axios.get('/api/articles', {
                params: { page: 1, pageSize: 3 }
              }),
              null
            ),
            safeRequest(() => axios.get('/api/articles/featured', { params: { take: 2 } }), null),
            safeRequest(() => axios.get('/api/services'), null),
            safeRequest(() => axios.get('/api/applications/my-summary', { headers }), null)
          ])

          const latestArticles = Array.isArray(articlesResponse?.data?.data) ? articlesResponse.data.data : []
          const featuredArticles = Array.isArray(featuredResponse?.data) ? featuredResponse.data : []
          const services = Array.isArray(servicesResponse?.data) ? servicesResponse.data : []
          const newestService = [...services].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0]

          const summary = appSummaryResponse?.data?.data || null
          const approvedCount = Number(summary?.approved || 0)
          const processingCount = Number(summary?.processing || 0)
          const pendingCount = Number(summary?.pending || 0)

          const viewerItems = [
            {
              id: 'latest-articles',
              title: 'Bài viết mới',
              description: latestArticles.length > 0
                ? `Mới nhất: ${latestArticles[0].title}`
                : 'Chưa có bài viết mới trong thời điểm này.',
              path: latestArticles.length > 0 ? `/articles/${latestArticles[0].id}` : '/articles',
              count: latestArticles.length,
              level: 'info'
            },
            {
              id: 'featured-articles',
              title: 'Thông báo nổi bật',
              description: featuredArticles.length > 0
                ? `Nổi bật: ${featuredArticles[0].title}`
                : 'Chưa có nội dung nổi bật mới.',
              path: featuredArticles.length > 0 ? `/articles/${featuredArticles[0].id}` : '/articles',
              count: featuredArticles.length,
              level: 'info'
            },
            {
              id: 'latest-service',
              title: 'Dịch vụ mới',
              description: newestService
                ? `Dịch vụ cập nhật gần nhất: ${newestService.name}`
                : 'Danh mục dịch vụ hiện chưa có thay đổi mới.',
              path: '/services',
              count: newestService ? 1 : 0,
              level: 'success'
            },
            {
              id: 'my-applications',
              title: 'Trạng thái hồ sơ của bạn',
              description: summary
                ? `Đã hoàn thành ${approvedCount}, đang xử lý ${processingCount}, đang chờ ${pendingCount}.`
                : 'Đăng nhập để theo dõi tiến độ hồ sơ cá nhân.',
              path: '/tra-cuu-ho-so',
              count: approvedCount,
              level: approvedCount > 0 ? 'success' : 'warning'
            }
          ]

          if (active) {
            setNotifications(viewerItems)
          }

          return
        }

        if (active) {
          setNotifications([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchNotifications()
    const intervalId = window.setInterval(fetchNotifications, 45000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [user, canUseAdminNotifications, isAdmin, isViewer])

  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={bellRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="notify-bell-btn"
        title="Thông báo"
        aria-label="Mở thông báo"
      >
        <span className="notify-bell-ping" aria-hidden="true" />
        <svg viewBox="0 0 24 24" className="notify-bell-icon" aria-hidden="true">
          <path d="M12 2a6 6 0 0 0-6 6v3.55c0 .94-.37 1.84-1.03 2.5L3.3 15.72A1 1 0 0 0 4 17.4h16a1 1 0 0 0 .7-1.7l-1.67-1.66A3.54 3.54 0 0 1 18 11.55V8a6 6 0 0 0-6-6Zm0 20a2.75 2.75 0 0 0 2.6-1.88h-5.2A2.75 2.75 0 0 0 12 22Z" />
        </svg>
      </button>

      {totalBadge > 0 && (
        <span className="notify-bell-badge">
          {totalBadge > 99 ? '99+' : totalBadge}
        </span>
      )}

      {open && (
        <div className="notify-dropdown fx-fade-up">
          <div className="notify-dropdown-header">
            <div>
              <p className="notify-dropdown-title">Thông báo</p>
              <p className="notify-dropdown-subtitle">{role}</p>
            </div>
            <button type="button" onClick={closeDropdown} className="notify-close-btn">Đóng</button>
          </div>

          <div className="notify-dropdown-content">
            {loading && <p className="notify-empty-text">Đang tải thông báo...</p>}

            {!loading && notifications.length === 0 && (
              <p className="notify-empty-text">Hiện chưa có thông báo mới.</p>
            )}

            {!loading && notifications.map((item) => {
              const itemClassName = `notify-item ${levelClassMap[item.level] || levelClassMap.info}`

              return (
                <Link
                  key={item.id}
                  to={item.path || '#'}
                  className={itemClassName}
                  onClick={() => {
                    closeDropdown()
                    onItemClick?.()
                  }}
                >
                  <div className="notify-item-main">
                    <p className="notify-item-title">{item.title}</p>
                    <p className="notify-item-description">{item.description}</p>
                  </div>
                  {Number(item.count || 0) > 0 && (
                    <span className="notify-item-count">{item.count}</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

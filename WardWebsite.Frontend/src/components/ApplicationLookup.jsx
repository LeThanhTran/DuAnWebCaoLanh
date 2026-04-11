import React, { useEffect, useMemo, useRef, useState } from 'react'
import applicationAPI from '../services/applicationAPI'
import { normalizeVietnamPhone, validateVietnamPhone } from '../utils/phone'

const statusLabel = {
  Pending: 'Chờ xử lý',
  Processing: 'Đang xử lý',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  PendingInfo: 'Chờ bổ sung'
}

const statusColor = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Processing: 'bg-blue-100 text-blue-800 border-blue-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  PendingInfo: 'bg-purple-100 text-purple-800 border-purple-200'
}

export default function ApplicationLookup({ isAuthenticated = false, user = null, onUnauthorized }) {
  const [myLoading, setMyLoading] = useState(false)
  const [myError, setMyError] = useState('')
  const [myApplications, setMyApplications] = useState([])
  const [mySummary, setMySummary] = useState(null)
  const [myStatusFilter, setMyStatusFilter] = useState('ALL')
  const [myPage, setMyPage] = useState(1)
  const [myPageSize] = useState(10)
  const [myPagination, setMyPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1
  })

  const [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const searchWrapperRef = useRef(null)
  const latestSuggestionKeyword = useRef('')

  const fallbackUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()
  const currentUser = user || fallbackUser

  const summaryForCurrentUser = useMemo(() => {
    if (mySummary) {
      return {
        total: mySummary.total || 0,
        pending: mySummary.pending || 0,
        processing: mySummary.processing || 0,
        pendingInfo: mySummary.pendingInfo || 0,
        approved: mySummary.approved || 0,
        rejected: mySummary.rejected || 0
      }
    }

    return {
      total: myApplications.length,
      pending: myApplications.filter((x) => x.status === 'Pending').length,
      processing: myApplications.filter((x) => x.status === 'Processing').length,
      pendingInfo: myApplications.filter((x) => x.status === 'PendingInfo').length,
      approved: myApplications.filter((x) => x.status === 'Approved').length,
      rejected: myApplications.filter((x) => x.status === 'Rejected').length
    }
  }, [mySummary, myApplications])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const loadMyApplications = async () => {
      try {
        setMyLoading(true)
        setMyError('')

        const [summaryData, listData] = await Promise.all([
          applicationAPI.getMyApplicationSummary(),
          applicationAPI.getMyApplications({
            status: myStatusFilter,
            page: myPage,
            pageSize: myPageSize
          })
        ])

        setMySummary(summaryData)
        setMyApplications(listData?.data || [])
        setMyPagination({
          currentPage: listData?.pagination?.currentPage || myPage,
          pageSize: listData?.pagination?.pageSize || myPageSize,
          total: listData?.pagination?.total || 0,
          totalPages: listData?.pagination?.totalPages || 1
        })
      } catch (loadError) {
        const status = loadError?.response?.status
        if (status === 401 || status === 403) {
          onUnauthorized?.()
          setMyError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem hồ sơ đã gửi.')
          return
        }

        setMyError(loadError?.response?.data?.message || 'Không thể tải hồ sơ đã gửi lúc này')
      } finally {
        setMyLoading(false)
      }
    }

    loadMyApplications()
  }, [isAuthenticated, myStatusFilter, myPage, myPageSize, onUnauthorized])

  const buildLookupPayload = (keyword) => {
    const trimmed = keyword.trim()
    const normalizedPhone = normalizeVietnamPhone(trimmed)
    const hasLetter = /[a-zA-Z]/.test(trimmed)

    if (hasLetter) {
      return {
        lookupCode: trimmed.toUpperCase(),
        phone: null
      }
    }

    return {
      lookupCode: null,
      phone: normalizedPhone || null
    }
  }

  const executeLookup = async (keyword) => {
    if (!keyword.trim()) {
      setError('Vui lòng nhập mã tra cứu hoặc số điện thoại')
      setResults([])
      setHasSearched(false)
      return
    }

    const trimmedKeyword = keyword.trim()
    const hasLetter = /[a-zA-Z]/.test(trimmedKeyword)
    if (!hasLetter) {
      const phoneValidation = validateVietnamPhone(trimmedKeyword, { required: true })
      if (!phoneValidation.isValid) {
        setError(phoneValidation.message)
        setResults([])
        setHasSearched(false)
        return
      }
    }

    try {
      setLoading(true)
      setError('')
      setHasSearched(true)

      const response = await applicationAPI.lookupApplication(buildLookupPayload(trimmedKeyword))
      setResults(response?.data || [])
    } catch (lookupError) {
      const message = lookupError?.response?.data?.message || 'Không thể tra cứu hồ sơ lúc này'
      setError(message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setShowSuggestions(false)
    await executeLookup(keywordInput)
  }

  const handleSuggestionSelect = async (suggestion) => {
    setKeywordInput(suggestion.lookupCode)
    setShowSuggestions(false)
    setSuggestions([])
    await executeLookup(suggestion.lookupCode)
  }

  useEffect(() => {
    if (isAuthenticated) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      return undefined
    }

    const keyword = keywordInput.trim()
    latestSuggestionKeyword.current = keyword

    if (keyword.length < 2) {
      setSuggestionLoading(false)
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const debounceId = setTimeout(async () => {
      try {
        setSuggestionLoading(true)
        const data = await applicationAPI.lookupSuggestions(keyword, 8)

        if (latestSuggestionKeyword.current !== keyword) {
          return
        }

        setSuggestions(data)
        setShowSuggestions(true)
      } catch {
        if (latestSuggestionKeyword.current === keyword) {
          setSuggestions([])
        }
      } finally {
        if (latestSuggestionKeyword.current === keyword) {
          setSuggestionLoading(false)
        }
      }
    }, 350)

    return () => clearTimeout(debounceId)
  }, [keywordInput])

  if (isAuthenticated) {
    return (
      <div className="lookup-page max-w-6xl mx-auto space-y-6">
        <section className="lookup-hero fx-fade-up">
          <div>
            <p className="lookup-eyebrow">Dịch vụ công trực tuyến</p>
            <h1>Hồ sơ đã gửi và thông tin cá nhân</h1>
            <p>
              Theo dõi toàn bộ hồ sơ bạn đã nộp từ tài khoản hiện tại, không cần nhập lại mã tra cứu.
            </p>
          </div>
          <div className="lookup-hero-badge">
            <span>{currentUser?.fullName || currentUser?.username || 'Tài khoản công dân'}</span>
            <small>{currentUser?.role || 'Viewer'}</small>
          </div>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="lookup-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tổng hồ sơ</p>
            <p className="text-2xl font-bold text-slate-900">{summaryForCurrentUser.total}</p>
          </div>
          <div className="lookup-card">
            <p className="text-xs uppercase tracking-wide text-amber-600">Chờ xử lý</p>
            <p className="text-2xl font-bold text-amber-700">{summaryForCurrentUser.pending}</p>
          </div>
          <div className="lookup-card">
            <p className="text-xs uppercase tracking-wide text-blue-600">Đang xử lý</p>
            <p className="text-2xl font-bold text-blue-700">{summaryForCurrentUser.processing}</p>
          </div>
          <div className="lookup-card">
            <p className="text-xs uppercase tracking-wide text-purple-600">Chờ bổ sung</p>
            <p className="text-2xl font-bold text-purple-700">{summaryForCurrentUser.pendingInfo}</p>
          </div>
          <div className="lookup-card">
            <p className="text-xs uppercase tracking-wide text-green-600">Đã duyệt</p>
            <p className="text-2xl font-bold text-green-700">{summaryForCurrentUser.approved}</p>
          </div>
          <div className="lookup-card">
            <p className="text-xs uppercase tracking-wide text-red-600">Từ chối</p>
            <p className="text-2xl font-bold text-red-700">{summaryForCurrentUser.rejected}</p>
          </div>
        </div>

        <div className="lookup-card fx-fade-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Lọc theo trạng thái</label>
              <select
                value={myStatusFilter}
                onChange={(event) => {
                  setMyStatusFilter(event.target.value)
                  setMyPage(1)
                }}
                className="lookup-input"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Processing">Đang xử lý</option>
                <option value="PendingInfo">Chờ bổ sung</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>
            </div>

            <div className="md:col-span-2 text-sm text-slate-600">
              Hiển thị {myApplications.length} / {myPagination.total} hồ sơ đã gửi
            </div>
          </div>
        </div>

        {myLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!myLoading && myError && (
          <div className="lookup-card">
            <p className="lookup-error">{myError}</p>
          </div>
        )}

        {!myLoading && !myError && myApplications.length === 0 && (
          <div className="lookup-card">
            <p className="text-sm text-slate-600">Bạn chưa có hồ sơ nào ở trạng thái này.</p>
          </div>
        )}

        {!myLoading && !myError && myApplications.length > 0 && (
          <div className="space-y-4">
            {myApplications.map((item) => (
              <div className="lookup-result-card fx-fade-up" key={`${item.lookupCode}-${item.createdAt}`}>
                <div className="lookup-result-header">
                  <h2>Hồ sơ {item.lookupCode}</h2>
                  <span className={`lookup-status-pill ${statusColor[item.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                    {statusLabel[item.status] || item.status}
                  </span>
                </div>

                <div className="lookup-detail-grid">
                  <div className="lookup-detail-item">
                    <p>Mã tra cứu</p>
                    <strong>{item.lookupCode}</strong>
                  </div>
                  <div className="lookup-detail-item">
                    <p>Dịch vụ</p>
                    <strong>{item.serviceName || '-'}</strong>
                  </div>
                  <div className="lookup-detail-item">
                    <p>Số điện thoại</p>
                    <strong>{item.phone || '-'}</strong>
                  </div>
                  <div className="lookup-detail-item">
                    <p>Ngày nộp</p>
                    <strong>{new Date(item.createdAt).toLocaleString('vi-VN')}</strong>
                  </div>
                </div>

                <div className="lookup-note-box">
                  <p>Ghi chú từ bộ phận xử lý</p>
                  <div>{item.notes || 'Chưa có ghi chú bổ sung'}</div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() => setMyPage((previous) => Math.max(1, previous - 1))}
                disabled={myPage <= 1}
                className="px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-slate-600">
                Trang {myPage}/{myPagination.totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setMyPage((previous) => Math.min(myPagination.totalPages || 1, previous + 1))}
                disabled={myPage >= (myPagination.totalPages || 1)}
                className="px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="lookup-page max-w-5xl mx-auto space-y-6">
      <section className="lookup-hero fx-fade-up">
        <div>
          <p className="lookup-eyebrow">Dịch vụ công trực tuyến</p>
          <h1>Tra cứu trạng thái hồ sơ công dân</h1>
          <p>
            Theo dõi tiến độ xử lý hồ sơ theo thời gian thực. Bạn có thể nhập mã tra cứu hoặc số điện thoại để tìm.
          </p>
        </div>
        <div className="lookup-hero-badge">
          <span>24/7</span>
          <small>Tra cứu mọi lúc, mọi nơi</small>
        </div>
      </section>

      <div className="lookup-card fx-fade-up">
        <form className="lookup-form-grid" onSubmit={handleSubmit}>
          <div className="lookup-field lookup-field-wide" ref={searchWrapperRef}>
            <label>Tìm theo mã hồ sơ hoặc số điện thoại</label>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => {
                const nextValue = e.target.value
                setKeywordInput(nextValue)
                setError('')
                setResults([])
                setHasSearched(false)

                if (!nextValue.trim()) {
                  setSuggestions([])
                  setShowSuggestions(false)
                  setSuggestionLoading(false)
                }
              }}
              onFocus={() => {
                if (keywordInput.trim().length >= 2) {
                  setShowSuggestions(true)
                }
              }}
              placeholder="Nhập mã hồ sơ hoặc số điện thoại"
              className="lookup-input uppercase"
              disabled={loading}
              autoComplete="off"
            />

            {showSuggestions && keywordInput.trim().length >= 2 && (
              <div className="lookup-suggestion-panel">
                {suggestionLoading && (
                  <div className="lookup-suggestion-loading">Đang tải gợi ý...</div>
                )}

                {!suggestionLoading && suggestions.length === 0 && (
                  <div className="lookup-suggestion-empty">Không có gợi ý phù hợp.</div>
                )}

                {!suggestionLoading && suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.lookupCode}-${suggestion.createdAt}`}
                    type="button"
                    className="lookup-suggestion-item"
                    onClick={() => void handleSuggestionSelect(suggestion)}
                  >
                    <div className="lookup-suggestion-main">
                      <span className="lookup-suggestion-code">{suggestion.lookupCode}</span>
                      <span className="lookup-suggestion-meta">
                        {suggestion.fullName} • {suggestion.phoneMasked}
                      </span>
                    </div>

                    <span className={`lookup-status-pill lookup-suggestion-status ${statusColor[suggestion.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                      {statusLabel[suggestion.status] || suggestion.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

          </div>

          <div className="lookup-action">
            <button
              type="submit"
              disabled={loading}
              className="lookup-button"
            >
              {loading ? 'Đang tra cứu...' : 'Tra cứu ngay'}
            </button>
          </div>
        </form>

        {error && (
          <p className="lookup-error">{error}</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Tìm thấy {results.length} hồ sơ phù hợp.
          </p>

          {results.map((result) => (
            <div className="lookup-result-card fx-fade-up" key={`${result.lookupCode}-${result.createdAt}`}>
              <div className="lookup-result-header">
                <h2>Kết quả tra cứu</h2>
                <span className={`lookup-status-pill ${statusColor[result.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                  {statusLabel[result.status] || result.status}
                </span>
              </div>

              <div className="lookup-detail-grid">
                <div className="lookup-detail-item">
                  <p>Mã tra cứu</p>
                  <strong>{result.lookupCode}</strong>
                </div>
                <div className="lookup-detail-item">
                  <p>Người nộp</p>
                  <strong>{result.fullName}</strong>
                </div>
                <div className="lookup-detail-item">
                  <p>Số điện thoại</p>
                  <strong>{result.phone}</strong>
                </div>
                <div className="lookup-detail-item">
                  <p>Dịch vụ</p>
                  <strong>{result.serviceName || '-'}</strong>
                </div>
                <div className="lookup-detail-item">
                  <p>Ngày nộp</p>
                  <strong>{new Date(result.createdAt).toLocaleString('vi-VN')}</strong>
                </div>
                <div className="lookup-detail-item">
                  <p>Địa chỉ</p>
                  <strong>{result.address || '-'}</strong>
                </div>
              </div>

              <div className="lookup-note-box">
                <p>Ghi chú từ bộ phận xử lý</p>
                <div>{result.notes || 'Chưa có ghi chú bổ sung'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && hasSearched && (
        <div className="lookup-card">
          <p className="text-sm text-slate-600">Không có dữ liệu phù hợp với tiêu chí tìm kiếm.</p>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import applicationAPI from '../services/applicationAPI'

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

export default function ApplicationLookup() {
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

  const buildLookupPayload = (keyword) => {
    const trimmed = keyword.trim()
    const normalizedPhone = trimmed.replace(/\D/g, '')
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

    try {
      setLoading(true)
      setError('')
      setHasSearched(true)

      const response = await applicationAPI.lookupApplication(buildLookupPayload(keyword))
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
    const handleOutsideClick = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
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

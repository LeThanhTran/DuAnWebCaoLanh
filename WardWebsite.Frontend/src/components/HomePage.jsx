import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHomepageMedia } from '../services/mediaService'

const quickAccessItems = [
  {
    title: 'Thủ tục hành chính',
    description: 'Tra cứu danh mục thủ tục và hướng dẫn hồ sơ.',
    path: '/services',
    tone: 'from-blue-50 to-blue-100 border-blue-200 text-blue-800'
  },
  {
    title: 'Nộp hồ sơ trực tuyến',
    description: 'Nộp và theo dõi tiến độ xử lý hồ sơ mọi lúc.',
    path: '/services',
    tone: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800'
  },
  {
    title: 'Kênh phản ánh',
    description: 'Gửi góp ý, phản ánh và nhận phản hồi từ phường.',
    path: '/contact',
    tone: 'from-amber-50 to-amber-100 border-amber-200 text-amber-800'
  }
]

const operationItems = [
  {
    title: 'Điều hành - Chỉ đạo',
    description: 'Công khai chỉ đạo điều hành, lịch công tác và văn bản mới ban hành để cán bộ, tổ dân phố và người dân nắm bắt nhanh tiến độ thực hiện nhiệm vụ.',
    detail: 'Thông tin được chuẩn hóa theo từng nhóm việc trọng tâm, hỗ trợ theo dõi trách nhiệm, thời hạn và kết quả triển khai.',
    iconTone: 'text-blue-700 ring-blue-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 4.5h6" />
        <path d="M9 10h6" />
        <path d="M9 14h6" />
      </svg>
    ),
    tone: 'from-blue-50 to-cyan-50 border-blue-200'
  },
  {
    title: 'Tiếp công dân',
    description: 'Tổ chức lịch tiếp công dân định kỳ, tiếp nhận phản ánh và hướng dẫn hồ sơ theo đúng quy trình, đúng thẩm quyền và đúng thời gian cam kết.',
    detail: 'Tăng cường đối thoại trực tiếp, xử lý kiến nghị ngay từ cơ sở và công khai tiến độ trả lời để người dân thuận tiện theo dõi.',
    iconTone: 'text-amber-700 ring-amber-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M4 19a5 5 0 0 1 10 0" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M14.5 19a4.5 4.5 0 0 1 4.5-4" />
      </svg>
    ),
    tone: 'from-amber-50 to-orange-50 border-amber-200'
  },
  {
    title: 'Chuyển đổi số',
    description: 'Đẩy mạnh số hóa hồ sơ, liên thông dữ liệu và tự động hóa các bước xử lý để rút ngắn thời gian giải quyết thủ tục hành chính cho người dân.',
    detail: 'Ưu tiên trải nghiệm trực tuyến 24/7, hạn chế giấy tờ trùng lặp và nâng cao tính minh bạch trong toàn bộ quy trình phục vụ.',
    iconTone: 'text-emerald-700 ring-emerald-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
        <path d="M4 10h2" />
        <path d="M4 14h2" />
        <path d="M18 10h2" />
        <path d="M18 14h2" />
        <path d="M10 4v2" />
        <path d="M14 4v2" />
        <path d="M10 18v2" />
        <path d="M14 18v2" />
      </svg>
    ),
    tone: 'from-emerald-50 to-teal-50 border-emerald-200'
  }
]

const governanceSnapshot = [
  {
    label: 'Giờ tiếp công dân',
    value: 'Thứ 3 & Thứ 5 | 08:00 - 11:00'
  },
  {
    label: 'Tỷ lệ đúng hạn',
    value: '98.7% hồ sơ giải quyết đúng hạn'
  },
  {
    label: 'Hotline hỗ trợ',
    value: '0277 3888 888'
  },
  {
    label: 'Trạng thái cổng dịch vụ',
    value: 'Đang hoạt động ổn định'
  }
]

const runningNotice = 'THÔNG BÁO NỔI BẬT: UBND Phường Cao Lãnh tiếp nhận và giải quyết thủ tục hành chính trực tuyến 24/7. Người dân vui lòng theo dõi trang để cập nhật lịch tiếp công dân, lịch làm việc và thông báo mới nhất.'

export default function HomePage({ showGovernanceSection = true }) {
  const featuredVideoRef = useRef(null)

  const [images, setImages] = useState({
    bannerUrl: '',
    introUrl: '',
    featuredVideoUrl: '',
    bannerOffsetX: 0,
    bannerOffsetY: 0,
    bannerZoom: 1,
    introOffsetX: 0,
    introOffsetY: 0,
    introZoom: 1
  })

  useEffect(() => {
    fetchHomepageImages()
  }, [])

  useEffect(() => {
    const videoElement = featuredVideoRef.current
    if (!videoElement || !images.featuredVideoUrl) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry) {
          return
        }

        if (entry.isIntersecting) {
          const playPromise = videoElement.play()
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {})
          }
          return
        }

        if (!videoElement.paused) {
          videoElement.pause()
        }
      },
      {
        threshold: 0.55
      }
    )

    observer.observe(videoElement)

    return () => {
      observer.disconnect()
    }
  }, [images.featuredVideoUrl])

  const toObjectPosition = (offset) => Math.max(0, Math.min(100, 50 + offset))

  const fetchHomepageImages = async () => {
    try {
      const data = await getHomepageMedia()
      setImages({
        bannerUrl: data?.bannerUrl || '',
        introUrl: data?.introUrl || '',
        featuredVideoUrl: data?.featuredVideoUrl || '',
        bannerOffsetX: data?.bannerOffsetX ?? 0,
        bannerOffsetY: data?.bannerOffsetY ?? 0,
        bannerZoom: data?.bannerZoom ?? 1,
        introOffsetX: data?.introOffsetX ?? 0,
        introOffsetY: data?.introOffsetY ?? 0,
        introZoom: data?.introZoom ?? 1
      })
    } catch (error) {
      console.error('Lỗi lấy ảnh trang chủ:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Banner */}
      <div className="relative w-full h-[22rem] md:h-[30rem] overflow-hidden bg-black">
        {images.bannerUrl && (
          <img
            src={images.bannerUrl}
            alt="Cao Lãnh"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${toObjectPosition(images.bannerOffsetX)}% ${toObjectPosition(images.bannerOffsetY)}%`,
              transform: `scale(${images.bannerZoom})`,
              transformOrigin: 'center center'
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/55 to-slate-900/35" />
        <div className="relative h-full container mx-auto px-4 flex flex-col justify-end pb-8">
          <span className="inline-flex w-fit items-center px-3 py-1 rounded-full bg-white/15 text-blue-100 text-sm mb-3 border border-white/20">
            Cổng thông tin điện tử địa phương
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">Ủy ban nhân dân Phường Cao Lãnh</h1>
          <p className="text-base md:text-lg text-blue-100 max-w-3xl">
            Kết nối chính quyền với người dân và doanh nghiệp. Cung cấp dịch vụ công, thông tin điều hành và hỗ trợ xử lý thủ tục hành chính trực tuyến.
          </p>
        </div>
      </div>

      <div className="notice-marquee border-y border-blue-200 bg-white">
        <div className="notice-marquee-track" role="status" aria-label="Thông báo nổi bật">
          <span className="notice-marquee-text">{runningNotice}</span>
          <span className="notice-marquee-text" aria-hidden="true">{runningNotice}</span>
        </div>
      </div>

      {showGovernanceSection && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
          <div className="container mx-auto px-4 py-8">
            <p className="text-xs uppercase tracking-wider text-blue-200 mb-5 font-semibold">Thông tin điều hành nhanh</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {governanceSnapshot.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 hover:bg-slate-700/60 transition">
                  <p className="text-[11px] uppercase tracking-wider text-blue-200">{item.label}</p>
                  <p className="text-sm font-medium text-white mt-2 leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 fx-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Giới thiệu cổng hành chính điện tử</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Trang thông tin tập trung vào phục vụ người dân và doanh nghiệp: tra cứu thủ tục, nộp hồ sơ, theo dõi tiến độ xử lý, tiếp nhận phản ánh và công khai thông tin điều hành của chính quyền địa phương.
              </p>
              <p className="text-slate-700 leading-relaxed mb-6">
                Định hướng vận hành là minh bạch, đúng hạn, lấy người dân làm trung tâm và đẩy mạnh chuyển đổi số trong toàn bộ quy trình giải quyết thủ tục hành chính.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickAccessItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block bg-gradient-to-br ${item.tone} border rounded-xl p-4 hover:shadow-md transition fx-card-lift`}
                  >
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-sm leading-relaxed">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="w-full rounded-xl shadow-md overflow-hidden border border-slate-200 bg-white">
                <div className="h-80 bg-slate-100">
                  {images.introUrl && (
                    <img
                      src={images.introUrl}
                      alt="Bộ phận tiếp nhận và trả kết quả"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${toObjectPosition(images.introOffsetX)}% ${toObjectPosition(images.introOffsetY)}%`,
                        transform: `scale(${images.introZoom})`,
                        transformOrigin: 'center center'
                      }}
                    />
                  )}
                  {!images.introUrl && (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm px-4 text-center">
                      Chưa thiết lập ảnh minh họa Bộ phận Một cửa
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 bg-white border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">Bộ phận Tiếp nhận và Trả kết quả - UBND Phường Cao Lãnh</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Phục vụ hành chính công minh bạch, đúng hạn, lấy người dân làm trung tâm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="my-12 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm fx-fade-up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Điểm nhấn video</h2>
              <p className="text-slate-600 mt-1">Nơi hiển thị các nội dung nổi bật theo từng chủ đề: thời sự, flycam, phóng sự hoặc khoảnh khắc đáng chú ý của địa phương.</p>
            </div>
            <Link
              to="/gallery"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Xem lại thư viện video
            </Link>
          </div>

          {images.featuredVideoUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-black">
              <video
                ref={featuredVideoRef}
                src={images.featuredVideoUrl}
                autoPlay
                muted
                playsInline
                controls
                preload="metadata"
                className="w-full h-[16rem] md:h-[28rem] object-cover"
              />
            </div>
          ) : (
            <div className="h-52 md:h-72 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-500 text-sm text-center px-6">
              Chưa có video nổi bật. Bạn có thể vào Thư viện, tải video lên và chọn Đặt video trang chủ.
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-12">
          {operationItems.map((item) => (
            <article
              key={item.title}
              className={`bg-gradient-to-br ${item.tone} border rounded-xl p-6 shadow-sm fx-card-lift`}
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 ring-1 shadow-sm ${item.iconTone}`}>
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-slate-700 leading-relaxed">{item.description}</p>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{item.detail}</p>
            </article>
          ))}
        </div>

        {/* Location Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Bản đồ hành chính</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 fx-fade-up">
            <iframe
              width="100%"
              height="400"
              frameBorder="0"
              title="Cao Lanh Map"
              src="https://www.google.com/maps?q=Th%C3%A0nh+ph%E1%BB%91+Cao+L%C3%A3nh,+%C4%90%E1%BB%93ng+Th%C3%A1p&output=embed"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            ></iframe>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-10 rounded-2xl shadow-lg fx-fade-up">
          <h2 className="text-3xl font-bold mb-4">Thông tin liên hệ cơ quan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="mb-3"><strong>Cơ quan:</strong> Ủy ban nhân dân Phường Cao Lãnh</p>
              <p className="mb-3"><strong>Địa chỉ:</strong> Phường Cao Lãnh, tỉnh Đồng Tháp</p>
              <p className="mb-3"><strong>Điện thoại:</strong> 0277 3888 888</p>
              <p className="mb-3"><strong>Email:</strong> ubnd@caolanhward.gov.vn</p>
            </div>
            <div>
              <p className="mb-3"><strong>Giờ làm việc:</strong></p>
              <p>Thứ 2 - Thứ 6: 8:00 - 17:00</p>
              <p>Thứ 7: 8:00 - 12:00</p>
              <p>Chủ Nhật: Nghỉ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

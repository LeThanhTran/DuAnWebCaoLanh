const aboutSections = [
  {
    title: 'Lịch sử hình thành',
    summary:
      'Phường Cao Lãnh là địa bàn có quá trình phát triển gắn với tiến trình đô thị hóa của khu vực trung tâm địa phương. Trong từng giai đoạn, chính quyền và nhân dân đã cùng xây dựng nền tảng quản lý hành chính ổn định, tạo điều kiện thuận lợi cho phát triển kinh tế, văn hóa và xã hội.',
    detail:
      'Truyền thống đoàn kết cộng đồng, tinh thần tương trợ trong khu dân cư và sự chủ động đổi mới trong điều hành là những yếu tố quan trọng giúp địa phương duy trì nhịp phát triển bền vững.',
    highlights: [
      'Xây dựng nền nếp hành chính cơ sở dựa trên mô hình phối hợp giữa chính quyền, tổ dân phố và đoàn thể.',
      'Từng bước chuẩn hóa quy trình tiếp nhận - giải quyết hồ sơ theo cơ chế một cửa.',
      'Giữ gìn bản sắc văn hóa địa phương song song với mục tiêu phát triển đô thị hiện đại.'
    ]
  },
  {
    title: 'Vị trí địa lý',
    summary:
      'Phường nằm trong khu vực có kết nối giao thông thuận lợi, liên thông nhanh với các trục đường chính, các khu dân cư và các cụm dịch vụ công trên địa bàn thành phố.',
    detail:
      'Lợi thế vị trí giúp việc tiếp cận cơ quan hành chính, trường học, cơ sở y tế và các tiện ích đô thị trở nên thuận tiện hơn cho người dân và doanh nghiệp khi thực hiện giao dịch hành chính.',
    highlights: [
      'Kết nối nhanh đến các tuyến giao thông nội thị, liên phường và các khu dịch vụ - thương mại.',
      'Thuận lợi trong tiếp cận Bộ phận Một cửa và các điểm tiếp nhận hồ sơ hành chính.',
      'Tạo điều kiện phát triển dịch vụ dân sinh và tăng hiệu quả liên thông quản lý giữa các đơn vị.'
    ]
  },
  {
    title: 'Điều kiện tự nhiên',
    summary:
      'Địa phương có đặc điểm khí hậu nhiệt đới gió mùa, hai mùa mưa - nắng rõ rệt, phù hợp cho các hoạt động sinh hoạt, thương mại - dịch vụ và sản xuất theo mùa vụ.',
    detail:
      'Công tác quản lý môi trường, thoát nước, cảnh quan cây xanh và phòng chống thiên tai được chú trọng nhằm bảo đảm an toàn dân sinh và nâng cao chất lượng sống đô thị.',
    highlights: [
      'Duy trì vệ sinh môi trường và tăng cường phân loại, thu gom rác thải tại khu dân cư.',
      'Nâng cấp hạ tầng thoát nước tại các điểm thường xuyên ngập cục bộ vào mùa mưa.',
      'Đẩy mạnh tuyên truyền cộng đồng về phòng chống thiên tai, cháy nổ và an toàn dân sinh.'
    ]
  },
  {
    title: 'Cơ cấu dân cư',
    summary:
      'Cơ cấu dân cư của phường đa dạng theo nhóm ngành nghề, trong đó lao động trong lĩnh vực dịch vụ, tiểu thương và lao động kỹ thuật chiếm tỷ lệ đáng kể.',
    detail:
      'Địa phương tập trung nâng cao chất lượng nguồn nhân lực, khuyến khích học tập suốt đời, chuyển đổi nghề nghiệp phù hợp và mở rộng các hoạt động cộng đồng phục vụ an sinh xã hội.',
    highlights: [
      'Đẩy mạnh chương trình kỹ năng số cơ bản cho người dân và lao động tự do.',
      'Ưu tiên hỗ trợ nhóm yếu thế tiếp cận dịch vụ công và chính sách an sinh xã hội.',
      'Mở rộng hoạt động cộng đồng, tạo môi trường sống văn minh, an toàn và gắn kết.'
    ]
  },
  {
    title: 'Cơ sở hạ tầng',
    summary:
      'Hạ tầng kỹ thuật và hạ tầng xã hội được đầu tư theo hướng đồng bộ: giao thông nội bộ, hệ thống chiếu sáng, cấp thoát nước, viễn thông, y tế, giáo dục và các điểm phục vụ hành chính công.',
    detail:
      'Phường ưu tiên cải cách thủ tục, tăng cường ứng dụng công nghệ số, hoàn thiện mô hình Bộ phận Một cửa hiện đại để rút ngắn thời gian giải quyết hồ sơ cho người dân.',
    highlights: [
      'Đầu tư hạ tầng số phục vụ hồ sơ trực tuyến và tra cứu thông tin hành chính.',
      'Nâng cao chất lượng các điểm phục vụ công dân theo tiêu chí thân thiện - minh bạch.',
      'Tăng cường kết nối giữa hạ tầng kỹ thuật và hạ tầng xã hội để phục vụ phát triển bền vững.'
    ]
  }
]

const historicalMilestones = [
  {
    period: 'Giai đoạn củng cố nền tảng',
    content:
      'Tập trung kiện toàn bộ máy cơ sở, chuẩn hóa quy trình xử lý công việc và nâng cao hiệu quả phối hợp giữa các đơn vị chức năng.'
  },
  {
    period: 'Giai đoạn cải cách hành chính',
    content:
      'Mở rộng áp dụng cơ chế một cửa, giảm thời gian xử lý thủ tục và tăng tỷ lệ hài lòng của người dân trong giao dịch hành chính.'
  },
  {
    period: 'Giai đoạn chuyển đổi số',
    content:
      'Đẩy mạnh số hóa hồ sơ, chuẩn hóa dữ liệu chuyên ngành và tăng cường cung cấp dịch vụ công trực tuyến theo hướng lấy người dân làm trung tâm.'
  }
]

const developmentPriorities = [
  {
    title: 'Cải cách phục vụ công dân',
    description:
      'Chuẩn hóa quy trình, công khai tiến độ và nâng chất lượng hỗ trợ tại Bộ phận Tiếp nhận và Trả kết quả.'
  },
  {
    title: 'Phát triển hạ tầng số',
    description:
      'Mở rộng ứng dụng công nghệ trong quản lý văn bản, hồ sơ, phản ánh kiến nghị và báo cáo điều hành.'
  },
  {
    title: 'Nâng cao chất lượng sống',
    description:
      'Tăng cường quản lý trật tự đô thị, vệ sinh môi trường, an ninh khu dân cư và hoạt động văn hóa cộng đồng.'
  },
  {
    title: 'Phát triển kinh tế địa phương',
    description:
      'Tạo điều kiện thuận lợi cho hộ kinh doanh, doanh nghiệp nhỏ và dịch vụ dân sinh phát triển ổn định.'
  }
]

const quickFacts = [
  {
    label: 'Mô hình quản trị',
    value: 'Chính quyền số - phục vụ người dân'
  },
  {
    label: 'Trọng tâm điều hành',
    value: 'Minh bạch, đúng hạn, trách nhiệm'
  },
  {
    label: 'Ưu tiên phát triển',
    value: 'Hạ tầng đô thị và dịch vụ công trực tuyến'
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-800 text-white">
        <div className="absolute -top-28 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />

        <div className="relative container mx-auto px-4 py-16 md:py-20">
          <p className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-100">
            Giới thiệu địa phương
          </p>
          <h1 className="mt-4 text-3xl md:text-5xl font-extrabold leading-tight">
            Tổng quan về Phường Cao Lãnh
          </h1>
          <p className="mt-4 max-w-4xl text-blue-100 leading-relaxed">
            Trang giới thiệu cung cấp thông tin nền tảng về lịch sử hình thành, vị trí địa lý, điều kiện tự nhiên,
            cơ cấu dân cư và hệ thống hạ tầng của địa phương. Nội dung được trình bày theo hướng dễ tra cứu,
            phục vụ nhu cầu tìm hiểu của người dân, doanh nghiệp và các tổ chức liên quan.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickFacts.map((item) => (
              <article key={item.label} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-blue-100">{item.label}</p>
                <p className="mt-1 text-sm md:text-base font-semibold">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {aboutSections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-sm font-bold">
                  {index + 1}
                </span>
                <h2 className="text-xl font-bold text-slate-800">{section.title}</h2>
              </div>
              <p className="text-slate-700 leading-relaxed">{section.summary}</p>
              <p className="text-slate-600 leading-relaxed mt-3">{section.detail}</p>
              <ul className="mt-4 space-y-2">
                {section.highlights.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <article className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">Các giai đoạn phát triển</h3>
            <p className="text-slate-600 mt-2 text-sm leading-relaxed">
              Quá trình phát triển của địa phương được triển khai theo hướng kế thừa kết quả đạt được,
              đồng thời ưu tiên đổi mới phương thức quản trị và chất lượng phục vụ hành chính công.
            </p>

            <div className="mt-5 space-y-4">
              {historicalMilestones.map((item) => (
                <div key={item.period} className="border-l-2 border-blue-200 pl-4">
                  <p className="text-sm font-semibold text-blue-800">{item.period}</p>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">Định hướng phát triển trọng tâm</h3>
            <p className="text-slate-600 mt-2 text-sm leading-relaxed">
              Trong giai đoạn tới, phường tiếp tục phát triển theo định hướng hành chính hiện đại,
              đô thị văn minh và dịch vụ công thuận tiện, minh bạch.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {developmentPriorities.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-sm leading-relaxed">
            Ghi chú: Các số liệu chuyên đề và thông tin chuyên sâu có thể được cập nhật định kỳ theo báo cáo chính thức
            của địa phương trong từng giai đoạn.
          </p>
        </div>
      </section>
    </div>
  )
}

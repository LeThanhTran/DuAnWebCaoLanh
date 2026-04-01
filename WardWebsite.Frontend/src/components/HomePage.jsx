export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <div className="relative w-full h-96 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=500&fit=crop"
          alt="Cao Lãnh"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-8">
          <h1 className="text-5xl font-bold text-white mb-2">Cao Lãnh</h1>
          <p className="text-xl text-gray-100">Thành phố Đồng Tháp - Huynh đệ của sông Mekong</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {/* Intro Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">🌍 Giới Thiệu Cao Lãnh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-gray-700 leading-relaxed">
              <p className="mb-4">
                Cao Lãnh là trung tâm hành chính, kinh tế và văn hóa của tỉnh Đồng Tháp. Với vị trí 
                chiến lược giữa hai dòng sông Tiền và Hậu, thành phố nổi bật với những đặc trưng riêng.
              </p>
              <p className="mb-4">
                Địa danh này nổi tiếng với cánh đồng sen rộng lớn, những vườn xoài lâu đời, và cảnh 
                quan sông nước hữu tình. Không chỉ vậy, Cao Lãnh còn là điểm đến du lịch hấp dẫn 
                với các danh lam thắng cảnh độc đáo.
              </p>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop"
                alt="Cao Lãnh"
                className="w-full h-80 rounded-lg shadow-lg object-cover"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-lg shadow">
            <div className="text-4xl mb-4">🌸</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Đặc Sản Địa Phương</h3>
            <p className="text-gray-700">
              Sen Đồng Tháp nổi tiếng khắp cả nước. Không chỉ bộ phận trên mặt nước, toàn bộ cây sen 
              đều có giá trị kinh tế cao từ hạt, lá đến ngó.
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-lg shadow">
            <div className="text-4xl mb-4">🥭</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Xoài Cao Lãnh</h3>
            <p className="text-gray-700">
              Xoài Cao Lãnh được trồng trên những vùng đất phù sa màu mỡ, tạo nên thương hiệu xoài 
              ngon, thơm, ngọt nổi tiếng toàn cả nước.
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-lg shadow">
            <div className="text-4xl mb-4">🌾</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Cánh Đồng Trù Phú</h3>
            <p className="text-gray-700">
              Đồng bằng Sông Cửu Long nơi đây là granary (kho lúa) của cả nước với hàng triệu héc-ta 
              lúa, cây trồng hữu ích.
            </p>
          </div>
        </div>

        {/* Location Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">📍 Vị Trí Địa Lý</h2>
          <div className="bg-gray-50 p-8 rounded-lg shadow-lg">
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-12 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold mb-4">🏛️ UBND Thành Phố Cao Lãnh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="mb-3"><strong>Địa chỉ:</strong> Phường Cao Lãnh, Thành phố Cao Lãnh, Tỉnh Đồng Tháp</p>
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

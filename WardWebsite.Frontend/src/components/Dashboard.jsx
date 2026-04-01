import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { getStats } from '../services/statsService'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await getStats()
      setStats(data)
    } catch (error) {
      console.error('Lỗi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Đang tải...</div>
  }

  if (!stats) {
    return <div className="text-center py-8 text-gray-600">Không có dữ liệu</div>
  }

  // Data for status chart
  const statusChartData = {
    labels: stats.applicationsByStatus.map(item => `${item.status} (${item.count})`),
    datasets: [
      {
        label: 'Hồ sơ theo trạng thái',
        data: stats.applicationsByStatus.map(item => item.count),
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(76, 175, 80, 0.8)',
          'rgba(244, 67, 54, 0.8)',
        ],
        borderColor: [
          'rgb(255, 193, 7)',
          'rgb(33, 150, 243)',
          'rgb(76, 175, 80)',
          'rgb(244, 67, 54)',
        ],
        borderWidth: 1,
      }
    ]
  }

  // Data for role chart
  const roleChartData = {
    labels: stats.usersByRole.map(item => item.role),
    datasets: [
      {
        label: 'User theo Role',
        data: stats.usersByRole.map(item => item.count),
        backgroundColor: [
          'rgba(255, 87, 34, 0.8)',
          'rgba(156, 39, 176, 0.8)',
          'rgba(63, 81, 181, 0.8)',
        ],
        borderColor: [
          'rgb(255, 87, 34)',
          'rgb(156, 39, 176)',
          'rgb(63, 81, 181)',
        ],
        borderWidth: 1,
      }
    ]
  }

  // Data for comments chart
  const commentsChartData = {
    labels: stats.commentsByArticle.map(item => item.title),
    datasets: [
      {
        label: 'Số bình luận',
        data: stats.commentsByArticle.map(item => item.count),
        borderColor: 'rgb(76, 175, 80)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 2,
        tension: 0.4,
      }
    ]
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">📊 Bảng điều khiển thống kê</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Tổng Bài Viết</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.summary.totalArticles}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Tổng User</p>
          <p className="text-4xl font-bold text-purple-600 mt-2">{stats.summary.totalUsers}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Tổng Hồ Sơ</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{stats.summary.totalApplications}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-gray-600 text-sm font-medium">Tổng Bình Luận</p>
          <p className="text-4xl font-bold text-orange-600 mt-2">{stats.summary.totalComments}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Trạng Thái Hồ Sơ</h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Role Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">User theo Role</h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={roleChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Comments Chart */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Top 5 Bài Viết Có Nhiều Bình Luận</h3>
          <div className="h-80">
            <Line data={commentsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  )
}

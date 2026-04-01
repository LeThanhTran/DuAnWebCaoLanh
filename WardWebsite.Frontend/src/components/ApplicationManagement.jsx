import React, { useEffect, useMemo, useState } from 'react';
import applicationAPI from '../services/applicationAPI';
import { getServices } from '../services/serviceService';
import Toast from './Toast';

const statusLabel = {
  Pending: 'Chờ xử lý',
  Processing: 'Đang xử lý',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  PendingInfo: 'Chờ bổ sung'
};

export default function ApplicationManagement() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [services, setServices] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'Editor';

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: '', type: 'info' }), 2500);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await applicationAPI.getApplications({
        status: statusFilter === 'ALL' ? null : statusFilter,
        search: search.trim() || null,
        serviceId: serviceFilter === 'ALL' ? null : Number(serviceFilter),
        fromDate: fromDate || null,
        toDate: toDate || null,
        page,
        pageSize
      });
      setApplications(result.data || []);
      setPagination({
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 1,
        currentPage: result.pagination?.currentPage || page,
        pageSize: result.pagination?.pageSize || pageSize
      });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message;
      if (status === 401) {
        setError('Bạn chưa đăng nhập hoặc phiên đã hết hạn.');
      } else if (status === 403) {
        setError('Bạn không có quyền xem trang quản lý hồ sơ.');
      } else {
        setError('Không tải được danh sách hồ sơ. Kiểm tra backend đang chạy ở cổng 5000.');
      }
      console.error('Get applications failed:', message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, serviceFilter, fromDate, toDate, page, pageSize, search]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await getServices();
        setServices(data || []);
      } catch (serviceError) {
        console.error('Không tải được danh sách dịch vụ', serviceError);
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, serviceFilter, fromDate, toDate, search]);

  const handleStatusChange = async (id, newStatus) => {
    if (!canManage) return;

    let notes = null;
    if (newStatus === 'Rejected') {
      notes = window.prompt('Nhập lý do từ chối:', '') || '';
    }
    if (newStatus === 'PendingInfo') {
      notes = window.prompt('Nhập yêu cầu bổ sung thông tin:', '') || '';
    }

    try {
      setUpdatingId(id);
      await applicationAPI.updateApplicationStatus(id, newStatus, notes);
      await fetchApplications();
      showToast('Cập nhật trạng thái thành công', 'success');
    } catch (err) {
      const message = err?.response?.data?.message || 'Cập nhật trạng thái thất bại';
      showToast(message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredApplications = useMemo(() => applications, [applications]);

  const summary = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((x) => x.status === 'Pending').length,
      processing: applications.filter((x) => x.status === 'Processing').length,
      approved: applications.filter((x) => x.status === 'Approved').length,
      rejected: applications.filter((x) => x.status === 'Rejected').length
    };
  }, [applications]);

  const exportCsv = async () => {
    if (filteredApplications.length === 0) {
      showToast('Không có dữ liệu để xuất', 'error');
      return;
    }

    const result = await applicationAPI.getApplications({
      status: statusFilter === 'ALL' ? null : statusFilter,
      search: search.trim() || null,
      serviceId: serviceFilter === 'ALL' ? null : Number(serviceFilter),
      fromDate: fromDate || null,
      toDate: toDate || null,
      page: 1,
      pageSize: 500
    });

    const rows = [
      ['ID', 'Ho ten', 'Dich vu', 'So dien thoai', 'Dia chi', 'Trang thai', 'Ngay nop']
    ];

    (result.data || []).forEach((item) => {
      rows.push([
        item.id,
        item.fullName || '',
        item.serviceName || '',
        item.phone || '',
        item.address || '',
        statusLabel[item.status] || item.status,
        new Date(item.createdAt).toLocaleString('vi-VN')
      ]);
    });

    const csvText = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `ho-so-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất tệp CSV', 'success');
  };

  const printList = () => {
    window.print();
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setServiceFilter('ALL');
    setFromDate('');
    setToDate('');
  };

  if (!canManage) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Quản lý hồ sơ</h1>
        <p className="text-red-600">Viewer không được phép truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Quản lý hồ sơ</h1>
        <p className="text-slate-200 mt-1">Theo dõi trạng thái hồ sơ và xử lý theo từng bước chuyên nghiệp.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Tổng hồ sơ</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Chờ xử lý</p>
          <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Đang xử lý</p>
          <p className="text-2xl font-bold text-blue-600">{summary.processing}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Đã duyệt</p>
          <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Từ chối</p>
          <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, dịch vụ, số điện thoại"
            className="md:col-span-2 border border-gray-300 rounded px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Pending">Chờ xử lý</option>
            <option value="Processing">Đang xử lý</option>
            <option value="Approved">Đã duyệt</option>
            <option value="Rejected">Từ chối</option>
            <option value="PendingInfo">Chờ bổ sung</option>
          </select>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="ALL">Tất cả dịch vụ</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>{svc.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div className="mt-3 flex flex-col md:flex-row gap-3 justify-between">
          <div className="flex gap-2">
            <button onClick={resetFilters} className="px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-100">Xóa bộ lọc</button>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex-1 bg-slate-700 text-white rounded px-3 py-2 hover:bg-slate-800">Xuất CSV</button>
            <button onClick={printList} className="flex-1 bg-gray-100 text-gray-700 rounded px-3 py-2 border hover:bg-gray-200">In/PDF</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && <p className="text-red-600 mb-4">{error}</p>}

        {!loading && !error && filteredApplications.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center">
            <p className="text-lg font-semibold text-gray-700">Không tìm thấy hồ sơ phù hợp</p>
            <p className="text-gray-500 mt-1">Thử đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        )}

        {!loading && !error && filteredApplications.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Họ tên</th>
                    <th className="px-4 py-3 text-left">Dịch vụ</th>
                    <th className="px-4 py-3 text-left">Liên hệ</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-left">Ngày nộp</th>
                    <th className="px-4 py-3 text-left">Đổi trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((item) => (
                    <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{item.fullName}</td>
                      <td className="px-4 py-3">{item.serviceName || '-'}</td>
                      <td className="px-4 py-3">{item.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                          {statusLabel[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          disabled={updatingId === item.id}
                          className="border border-gray-300 rounded px-2 py-1 bg-white"
                        >
                          <option value="Pending">Chờ xử lý</option>
                          <option value="Processing">Đang xử lý</option>
                          <option value="Approved">Đã duyệt</option>
                          <option value="Rejected">Từ chối</option>
                          <option value="PendingInfo">Chờ bổ sung</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Hiển thị {applications.length} / {pagination.total} hồ sơ
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>Trang {size}</option>
                  ))}
                </select>
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-600">Trang {page}/{pagination.totalPages || 1}</span>
                <button
                  onClick={() => setPage((prev) => Math.min((pagination.totalPages || 1), prev + 1))}
                  disabled={page >= (pagination.totalPages || 1)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

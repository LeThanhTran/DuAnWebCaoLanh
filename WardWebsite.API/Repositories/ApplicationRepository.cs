using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Models;
using WardWebsite.API.Data;

namespace WardWebsite.API.Repositories
{
    public class ApplicationRepository
    {
        private readonly AppDbContext _context;

        public ApplicationRepository(AppDbContext context)
        {
            _context = context;
        }

        // Get all pending applications
        public async Task<List<ApplicationDto>> GetPendingApplicationsAsync()
        {
            return await _context.Applications
                .Where(a => a.Status == "Pending")
                .Include(a => a.Service)
                .Select(a => new ApplicationDto
                {
                    Id = a.Id,
                    FullName = a.FullName,
                    Phone = a.Phone,
                    Address = a.Address,
                    ServiceId = a.ServiceId,
                    ServiceName = a.Service != null ? a.Service.Name : string.Empty,
                    Status = a.Status,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();
        }

        // Get all applications with pagination and filtering
        public async Task<(List<ApplicationDto> items, int total)> GetApplicationsAsync(
            string? status = null,
            string? search = null,
            int? serviceId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int page = 1,
            int pageSize = 10)
        {
            var query = _context.Applications
                .Include(a => a.Service)
                .AsQueryable();

            // Filter by status if provided
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(a => a.Status == status);
            }

            if (serviceId.HasValue)
            {
                query = query.Where(a => a.ServiceId == serviceId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(a =>
                    a.FullName.ToLower().Contains(term) ||
                    a.Phone.ToLower().Contains(term) ||
                    a.Address.ToLower().Contains(term) ||
                    (a.Service != null && a.Service.Name.ToLower().Contains(term)));
            }

            if (fromDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                var end = toDate.Value.Date.AddDays(1);
                query = query.Where(a => a.CreatedAt < end);
            }

            var total = await query.CountAsync();

            var applications = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ApplicationDto
                {
                    Id = a.Id,
                    FullName = a.FullName,
                    Phone = a.Phone,
                    Address = a.Address,
                    ServiceId = a.ServiceId,
                    ServiceName = a.Service != null ? a.Service.Name : string.Empty,
                    Status = a.Status,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return (applications, total);
        }

        // Get application by ID
        public async Task<ApplicationDto?> GetApplicationByIdAsync(int id)
        {
            return await _context.Applications
                .Where(a => a.Id == id)
                .Include(a => a.Service)
                .Select(a => new ApplicationDto
                {
                    Id = a.Id,
                    FullName = a.FullName,
                    Phone = a.Phone,
                    Address = a.Address,
                    ServiceId = a.ServiceId,
                    ServiceName = a.Service != null ? a.Service.Name : string.Empty,
                    Status = a.Status,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt
                })
                .FirstOrDefaultAsync();
        }

        // Create application
        public async Task<ApplicationDto> CreateApplicationAsync(CreateApplicationDto dto)
        {
            var service = await _context.Services.FindAsync(dto.ServiceId);
            if (service == null)
            {
                throw new InvalidOperationException("Dịch vụ không tồn tại");
            }

            var application = new Application
            {
                FullName = dto.FullName,
                Phone = dto.Phone,
                Address = dto.Address,
                ServiceId = dto.ServiceId,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();

            return new ApplicationDto
            {
                Id = application.Id,
                FullName = application.FullName,
                Phone = application.Phone,
                Address = application.Address,
                ServiceId = application.ServiceId,
                ServiceName = service?.Name ?? string.Empty,
                Status = application.Status,
                Notes = application.Notes,
                CreatedAt = application.CreatedAt
            };
        }

        // Update application status
        public async Task<bool> UpdateApplicationStatusAsync(int id, UpdateApplicationStatusDto dto)
        {
            var application = await _context.Applications.FindAsync(id);
            if (application == null)
                return false;

            application.Status = dto.Status;
            application.Notes = dto.Notes;

            _context.Applications.Update(application);
            await _context.SaveChangesAsync();
            return true;
        }

        // Delete application
        public async Task<bool> DeleteApplicationAsync(int id)
        {
            var application = await _context.Applications.FindAsync(id);
            if (application == null)
                return false;

            _context.Applications.Remove(application);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

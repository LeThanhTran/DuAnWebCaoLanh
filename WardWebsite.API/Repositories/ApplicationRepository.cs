using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
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

        private async Task<string> GenerateLookupCodeAsync()
        {
            for (var attempt = 0; attempt < 10; attempt++)
            {
                var randomPart = RandomNumberGenerator.GetInt32(100000, 999999);
                var candidate = $"HS{DateTime.UtcNow:yyyyMMdd}{randomPart}";

                var exists = await _context.Applications.AnyAsync(a => a.LookupCode == candidate);
                if (!exists)
                {
                    return candidate;
                }
            }

            return $"HS{Guid.NewGuid():N}".Substring(0, 20).ToUpperInvariant();
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
                    LookupCode = a.LookupCode,
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
                    a.LookupCode.ToLower().Contains(term) ||
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
                    LookupCode = a.LookupCode,
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
                    LookupCode = a.LookupCode,
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
            var service = await _context.Services
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == dto.ServiceId && !s.IsDeleted);

            if (service == null)
            {
                throw new InvalidOperationException("Dịch vụ không tồn tại");
            }

            var lookupCode = await GenerateLookupCodeAsync();

            var application = new Application
            {
                LookupCode = lookupCode,
                FullName = dto.FullName.Trim(),
                Phone = dto.Phone.Trim(),
                Address = dto.Address.Trim(),
                ServiceId = dto.ServiceId,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();

            return new ApplicationDto
            {
                Id = application.Id,
                LookupCode = application.LookupCode,
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

        public async Task<List<ApplicationLookupResultDto>> LookupApplicationsAsync(string? lookupCode, string? phone)
        {
            var normalizedLookupCode = string.IsNullOrWhiteSpace(lookupCode)
                ? null
                : lookupCode.Trim().ToUpperInvariant();

            var normalizedPhone = string.IsNullOrWhiteSpace(phone)
                ? null
                : phone.Trim();

            var query = _context.Applications
                .Include(a => a.Service)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(normalizedLookupCode))
            {
                query = query.Where(a => a.LookupCode == normalizedLookupCode);
            }

            if (!string.IsNullOrWhiteSpace(normalizedPhone))
            {
                query = query.Where(a => a.Phone == normalizedPhone);
            }

            return await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(20)
                .Select(a => new ApplicationLookupResultDto
                {
                    LookupCode = a.LookupCode,
                    FullName = a.FullName,
                    Phone = a.Phone,
                    Address = a.Address,
                    ServiceName = a.Service != null ? a.Service.Name : string.Empty,
                    Status = a.Status,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<List<ApplicationLookupSuggestionDto>> GetLookupSuggestionsAsync(string keyword, int limit = 8)
        {
            var normalizedKeyword = (keyword ?? string.Empty).Trim();
            if (normalizedKeyword.Length < 2)
            {
                return new List<ApplicationLookupSuggestionDto>();
            }

            var normalizedLookupCode = normalizedKeyword.ToUpperInvariant();
            var normalizedPhone = new string(normalizedKeyword.Where(char.IsDigit).ToArray());
            var safeLimit = Math.Clamp(limit, 1, 20);

            var query = _context.Applications
                .Include(a => a.Service)
                .AsQueryable();

            query = query.Where(a =>
                a.LookupCode.StartsWith(normalizedLookupCode) ||
                (!string.IsNullOrWhiteSpace(normalizedPhone) && a.Phone.StartsWith(normalizedPhone)));

            var records = await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(safeLimit)
                .Select(a => new
                {
                    a.LookupCode,
                    a.FullName,
                    a.Phone,
                    ServiceName = a.Service != null ? a.Service.Name : string.Empty,
                    a.Status,
                    a.CreatedAt
                })
                .ToListAsync();

            return records
                .Select(a => new ApplicationLookupSuggestionDto
                {
                    LookupCode = a.LookupCode,
                    FullName = a.FullName,
                    PhoneMasked = MaskPhone(a.Phone),
                    ServiceName = a.ServiceName,
                    Status = a.Status,
                    CreatedAt = a.CreatedAt
                })
                .ToList();
        }

        private static string MaskPhone(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
            {
                return string.Empty;
            }

            var value = phone.Trim();
            if (value.Length <= 4)
            {
                return new string('*', value.Length);
            }

            if (value.Length <= 7)
            {
                return $"{value.Substring(0, 2)}***{value.Substring(value.Length - 2)}";
            }

            return $"{value.Substring(0, 3)}{new string('*', value.Length - 6)}{value.Substring(value.Length - 3)}";
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

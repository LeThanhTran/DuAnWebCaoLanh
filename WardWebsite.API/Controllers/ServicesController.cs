using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServicesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServicesController(AppDbContext context)
        {
            _context = context;
        }

        private void AddAdminLog(string action, int? targetId, string details)
        {
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = action,
                TargetType = "Service",
                TargetId = targetId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var services = await _context.Services
                .Where(s => !s.IsDeleted)
                .OrderBy(s => s.Name)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Description,
                    ApplicationCount = s.Applications.Count
                })
                .ToListAsync();
            return Ok(services);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetById(int id)
        {
            var service = await _context.Services
                .Where(s => s.Id == id && !s.IsDeleted)
                .Select(s => new { s.Id, s.Name, s.Description })
                .FirstOrDefaultAsync();

            if (service == null)
            {
                return NotFound(new { message = "Không tìm thấy dịch vụ" });
            }

            return Ok(service);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> Create([FromBody] UpsertServiceDto dto)
        {
            var name = dto.Name?.Trim() ?? string.Empty;
            var description = dto.Description?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Tên dịch vụ không được để trống" });
            }

            if (name.Length > 200)
            {
                return BadRequest(new { message = "Tên dịch vụ tối đa 200 ký tự" });
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                return BadRequest(new { message = "Mô tả dịch vụ không được để trống" });
            }

            if (description.Length > 2000)
            {
                return BadRequest(new { message = "Mô tả dịch vụ tối đa 2000 ký tự" });
            }

            var exists = await _context.Services
                .AnyAsync(s => !s.IsDeleted && s.Name.ToLower() == name.ToLower());
            if (exists)
            {
                return BadRequest(new { message = "Tên dịch vụ đã tồn tại" });
            }

            var service = new Service
            {
                Name = name,
                Description = description
            };

            _context.Services.Add(service);
            await _context.SaveChangesAsync();

            AddAdminLog("Tạo dịch vụ", service.Id, $"Tạo dịch vụ '{service.Name}'");
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = service.Id }, new
            {
                message = "Tạo dịch vụ thành công",
                data = new { service.Id, service.Name, service.Description }
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> Update(int id, [FromBody] UpsertServiceDto dto)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (service == null)
            {
                return NotFound(new { message = "Không tìm thấy dịch vụ" });
            }

            var name = dto.Name?.Trim() ?? string.Empty;
            var description = dto.Description?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Tên dịch vụ không được để trống" });
            }

            if (name.Length > 200)
            {
                return BadRequest(new { message = "Tên dịch vụ tối đa 200 ký tự" });
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                return BadRequest(new { message = "Mô tả dịch vụ không được để trống" });
            }

            if (description.Length > 2000)
            {
                return BadRequest(new { message = "Mô tả dịch vụ tối đa 2000 ký tự" });
            }

            var exists = await _context.Services
                .AnyAsync(s => !s.IsDeleted && s.Id != id && s.Name.ToLower() == name.ToLower());

            if (exists)
            {
                return BadRequest(new { message = "Tên dịch vụ đã tồn tại" });
            }

            service.Name = name;
            service.Description = description;

            _context.Services.Update(service);
            AddAdminLog("Cập nhật dịch vụ", service.Id, $"Cập nhật dịch vụ '{service.Name}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật dịch vụ thành công",
                data = new { service.Id, service.Name, service.Description }
            });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> Delete(int id)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (service == null)
            {
                return NotFound(new { message = "Không tìm thấy dịch vụ" });
            }

            var relatedApplications = await _context.Applications
                .Where(a => a.ServiceId == id)
                .Select(a => new
                {
                    a.Id,
                    a.Status
                })
                .ToListAsync();

            if (relatedApplications.Count > 0)
            {
                static bool IsStatus(string? status, string expected)
                {
                    return string.Equals(status, expected, StringComparison.OrdinalIgnoreCase);
                }

                var inProgressCount = relatedApplications.Count(a =>
                    IsStatus(a.Status, "Pending")
                    || IsStatus(a.Status, "Processing")
                    || IsStatus(a.Status, "PendingInfo"));

                var approvedCount = relatedApplications.Count(a => IsStatus(a.Status, "Approved"));
                var rejectedCount = relatedApplications.Count(a => IsStatus(a.Status, "Rejected"));

                if (inProgressCount > 0)
                {
                    return BadRequest(new
                    {
                        message = "Dịch vụ đang có hồ sơ chưa hoàn tất (chờ xử lý/đang xử lý/chờ bổ sung), không thể xóa",
                        totalApplications = relatedApplications.Count,
                        inProgressApplications = inProgressCount
                    });
                }

                if (approvedCount > 0)
                {
                    return BadRequest(new
                    {
                        message = "Dịch vụ có hồ sơ đã duyệt. Để bảo toàn lịch sử, hệ thống không cho phép xóa dịch vụ này",
                        totalApplications = relatedApplications.Count,
                        approvedApplications = approvedCount
                    });
                }

                if (rejectedCount != relatedApplications.Count)
                {
                    return BadRequest(new
                    {
                        message = "Dịch vụ có hồ sơ ở trạng thái không xác định, vui lòng kiểm tra trước khi xóa",
                        totalApplications = relatedApplications.Count
                    });
                }
            }

            service.IsDeleted = true;
            service.DeletedAt = DateTime.UtcNow;
            service.DeletedBy = User?.Identity?.Name ?? "Unknown";

            _context.Services.Update(service);
            AddAdminLog("Xóa dịch vụ", id, $"Xóa dịch vụ '{service.Name}' (xóa mềm, có thể hoàn tác từ nhật ký)");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = relatedApplications.Count > 0
                    ? "Xóa dịch vụ thành công (xóa mềm). Có thể hoàn tác từ Nhật ký hệ thống"
                    : "Xóa dịch vụ thành công (xóa mềm). Có thể hoàn tác từ Nhật ký hệ thống"
            });
        }
    }

    public class UpsertServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}

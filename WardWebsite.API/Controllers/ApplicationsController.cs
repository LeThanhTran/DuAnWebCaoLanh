using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using WardWebsite.API.Data;
using WardWebsite.API.Models;
using WardWebsite.API.Repositories;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationsController : ControllerBase
    {
        private readonly ApplicationRepository _repository;
        private readonly AppDbContext _context;

        public ApplicationsController(ApplicationRepository repository, AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        private void AddAdminLog(string action, string targetType, int? targetId, string details)
        {
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
        }

        // GET: api/applications/pending
        // Get all pending applications (requires Admin or Editor role)
        [HttpGet("pending")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<List<ApplicationDto>>> GetPendingApplications()
        {
            var applications = await _repository.GetPendingApplicationsAsync();
            return Ok(new { success = true, data = applications });
        }

        // GET: api/applications
        // Get all applications with optional filtering and pagination
        [HttpGet]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> GetApplications(
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] int? serviceId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var (applications, total) = await _repository.GetApplicationsAsync(status, search, serviceId, fromDate, toDate, page, pageSize);
                
                return Ok(new
                {
                    success = true,
                    data = applications,
                    pagination = new
                    {
                        currentPage = page,
                        pageSize = pageSize,
                        total = total,
                        totalPages = (total + pageSize - 1) / pageSize
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET: api/applications/{id}
        // Get application by ID
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Editor,Viewer")]
        public async Task<ActionResult<ApplicationDto>> GetApplicationById(int id)
        {
            var application = await _repository.GetApplicationByIdAsync(id);
            if (application == null)
                return NotFound(new { success = false, message = "Hồ sơ không tìm thấy" });

            return Ok(new { success = true, data = application });
        }

        // POST: api/applications
        // Create new application
        [HttpPost]
        [Authorize(Roles = "Admin,Editor,Viewer")]
        public async Task<ActionResult<ApplicationDto>> CreateApplication([FromBody] CreateApplicationDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Phone) || dto.ServiceId <= 0)
                    return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ thông tin" });

                var application = await _repository.CreateApplicationAsync(dto);

                return CreatedAtAction(nameof(GetApplicationById), new { id = application.Id }, 
                    new
                    {
                        success = true,
                        message = "Nộp hồ sơ thành công",
                        data = application,
                        lookup = new
                        {
                            lookupCode = application.LookupCode,
                            phone = application.Phone
                        },
                        notification = new
                        {
                            channel = "phone",
                            phone = application.Phone,
                            message = "Mã tra cứu đã được gắn theo số điện thoại để tra cứu trạng thái hồ sơ"
                        }
                    });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/applications/lookup
        // Public endpoint for citizen to lookup application status
        [HttpPost("lookup")]
        [AllowAnonymous]
        public async Task<ActionResult> LookupApplication([FromBody] ApplicationLookupRequestDto dto)
        {
            if (dto == null || (string.IsNullOrWhiteSpace(dto.LookupCode) && string.IsNullOrWhiteSpace(dto.Phone)))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập ít nhất mã tra cứu hoặc số điện thoại" });
            }

            var applications = await _repository.LookupApplicationsAsync(dto.LookupCode, dto.Phone);
            if (applications.Count == 0)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không tìm thấy hồ sơ. Vui lòng kiểm tra lại mã tra cứu hoặc số điện thoại"
                });
            }

            return Ok(new
            {
                success = true,
                total = applications.Count,
                data = applications
            });
        }

        // GET: api/applications/lookup-suggestions?q=HS2026&limit=8
        // Public endpoint for realtime suggestion while user is typing lookup code/phone
        [HttpGet("lookup-suggestions")]
        [AllowAnonymous]
        public async Task<ActionResult> LookupSuggestions([FromQuery] string q, [FromQuery] int limit = 8)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            {
                return Ok(new
                {
                    success = true,
                    total = 0,
                    data = new List<ApplicationLookupSuggestionDto>()
                });
            }

            var suggestions = await _repository.GetLookupSuggestionsAsync(q, limit);
            return Ok(new
            {
                success = true,
                total = suggestions.Count,
                data = suggestions
            });
        }

        // PUT: api/applications/{id}/status
        // Update application status (Admin/Editor only)
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<IActionResult> UpdateApplicationStatus(int id, [FromBody] UpdateApplicationStatusDto dto)
        {
            try
            {
                var validStatuses = new[] { "Pending", "Processing", "Approved", "Rejected", "PendingInfo" };
                if (!validStatuses.Contains(dto.Status))
                    return BadRequest(new { success = false, message = "Trạng thái không hợp lệ" });

                var result = await _repository.UpdateApplicationStatusAsync(id, dto);
                if (!result)
                    return NotFound(new { success = false, message = "Hồ sơ không tìm thấy" });

                AddAdminLog("Cập nhật trạng thái hồ sơ", "Application", id, $"Cập nhật trạng thái thành {dto.Status}");
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Cập nhật trạng thái thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/applications/{id}
        // Delete application (Admin only)
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteApplication(int id)
        {
            try
            {
                var result = await _repository.DeleteApplicationAsync(id);
                if (!result)
                    return NotFound(new { success = false, message = "Hồ sơ không tìm thấy" });

                AddAdminLog("Xóa hồ sơ", "Application", id, "Xóa hồ sơ khỏi hệ thống");
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Xóa hồ sơ thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}

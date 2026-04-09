using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FormsController : ControllerBase
    {
        public class UploadDownloadFormRequest
        {
            public IFormFile? File { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public int? ServiceId { get; set; }
            public bool IsActive { get; set; } = true;
            public int SortOrder { get; set; }
        }

        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        private const long MaxFileSizeBytes = 20 * 1024 * 1024;

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx"
        };

        public FormsController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        private static string NormalizeTitle(string? title)
        {
            return title?.Trim() ?? string.Empty;
        }

        private void AddAdminLog(string action, int? targetId, string details)
        {
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = action,
                TargetType = "DownloadForm",
                TargetId = targetId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
        }

        private string GetWebRootPath()
        {
            return string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;
        }

        private static bool IsLoopbackHost(string? host)
        {
            if (string.IsNullOrWhiteSpace(host))
            {
                return false;
            }

            return string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
                || string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase)
                || string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase);
        }

        private bool TryResolveStoredFormPath(string? fileUrl, out string fullPath, out string relativePath)
        {
            fullPath = string.Empty;
            relativePath = string.Empty;

            if (string.IsNullOrWhiteSpace(fileUrl))
            {
                return false;
            }

            var candidatePath = fileUrl.Trim().Replace('\\', '/');
            if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var absoluteUri))
            {
                candidatePath = absoluteUri.AbsolutePath;
            }

            if (!candidatePath.StartsWith('/'))
            {
                candidatePath = "/" + candidatePath.TrimStart('~', '/');
            }

            if (!candidatePath.StartsWith("/uploads/forms/", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var webRootPath = GetWebRootPath();
            var uploadsRoot = Path.GetFullPath(Path.Combine(webRootPath, "uploads", "forms"));
            var resolvedPath = Path.GetFullPath(Path.Combine(
                webRootPath,
                candidatePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));

            if (!resolvedPath.StartsWith(uploadsRoot, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            fullPath = resolvedPath;
            relativePath = candidatePath;
            return true;
        }

        private string ResolveDownloadUrl(string? fileUrl)
        {
            if (string.IsNullOrWhiteSpace(fileUrl))
            {
                return string.Empty;
            }

            if (TryResolveStoredFormPath(fileUrl, out _, out var relativePath))
            {
                return $"{Request.Scheme}://{Request.Host}{relativePath}";
            }

            if (!Uri.TryCreate(fileUrl, UriKind.Absolute, out var absoluteUri))
            {
                return string.Empty;
            }

            if (IsLoopbackHost(absoluteUri.Host))
            {
                return $"{Request.Scheme}://{Request.Host}{absoluteUri.AbsolutePath}";
            }

            if (string.Equals(absoluteUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                || string.Equals(absoluteUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                return absoluteUri.ToString();
            }

            return string.Empty;
        }

        private void TryDeleteLocalFormFile(string? fileUrl)
        {
            if (!TryResolveStoredFormPath(fileUrl, out var fullPath, out _))
            {
                return;
            }

            try
            {
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }
            }
            catch
            {
                // Ignore file deletion errors so DB operation still succeeds.
            }
        }

        private static IQueryable<DownloadForm> BuildPublicQuery(IQueryable<DownloadForm> query)
        {
            return query.Where(f => f.IsActive && !f.IsDeleted);
        }

        private static DownloadFormDto MapToDto(DownloadForm form)
        {
            return new DownloadFormDto
            {
                Id = form.Id,
                Title = form.Title,
                Description = form.Description,
                FileUrl = form.FileUrl,
                OriginalFileName = form.OriginalFileName,
                FileExtension = form.FileExtension,
                FileSizeBytes = form.FileSizeBytes,
                ServiceId = form.ServiceId,
                ServiceName = form.Service?.Name,
                IsActive = form.IsActive,
                SortOrder = form.SortOrder,
                DownloadCount = form.DownloadCount,
                CreatedAt = form.CreatedAt,
                UpdatedAt = form.UpdatedAt,
                UploadedBy = form.UploadedBy,
                DownloadEndpoint = $"/api/forms/{form.Id}/download"
            };
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<DownloadFormDto>>> GetPublicForms(
            [FromQuery] int? serviceId = null,
            [FromQuery] string? search = null)
        {
            var query = BuildPublicQuery(
                    _context.DownloadForms
                        .AsNoTracking()
                        .Include(f => f.Service))
                .AsQueryable();

            if (serviceId.HasValue)
            {
                query = query.Where(f => f.ServiceId == serviceId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(f =>
                    f.Title.ToLower().Contains(term) ||
                    (f.Description != null && f.Description.ToLower().Contains(term)) ||
                    (f.Service != null && f.Service.Name.ToLower().Contains(term)));
            }

            var forms = await query
                .OrderBy(f => f.SortOrder)
                .ThenByDescending(f => f.CreatedAt)
                .ToListAsync();

            return Ok(forms.Select(MapToDto));
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<IEnumerable<DownloadFormDto>>> GetAllForms([FromQuery] bool includeInactive = true)
        {
            var query = _context.DownloadForms
                .Where(f => !f.IsDeleted)
                .AsNoTracking()
                .Include(f => f.Service)
                .AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(f => f.IsActive);
            }

            var forms = await query
                .OrderBy(f => f.SortOrder)
                .ThenByDescending(f => f.CreatedAt)
                .ToListAsync();

            return Ok(forms.Select(MapToDto));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<DownloadFormDto>> GetById(int id)
        {
            var form = await _context.DownloadForms
                .AsNoTracking()
                .Include(f => f.Service)
                .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);

            if (form == null)
            {
                return NotFound(new { message = "Không tìm thấy biểu mẫu" });
            }

            return Ok(MapToDto(form));
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Admin,Editor")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<object>> Upload([FromForm] UploadDownloadFormRequest request)
        {
            var file = request.File;
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn file biểu mẫu" });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { message = "Kích thước file tối đa là 20MB" });
            }

            var normalizedTitle = NormalizeTitle(request.Title);
            if (string.IsNullOrWhiteSpace(normalizedTitle))
            {
                return BadRequest(new { message = "Tên biểu mẫu không được để trống" });
            }

            if (normalizedTitle.Length > 200)
            {
                return BadRequest(new { message = "Tên biểu mẫu tối đa 200 ký tự" });
            }

            var normalizedDescription = request.Description?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedDescription) && normalizedDescription.Length > 1000)
            {
                return BadRequest(new { message = "Mô tả biểu mẫu tối đa 1000 ký tự" });
            }

            if (request.ServiceId.HasValue)
            {
                var serviceExists = await _context.Services
                    .AnyAsync(s => s.Id == request.ServiceId.Value && !s.IsDeleted);
                if (!serviceExists)
                {
                    return BadRequest(new { message = "Dịch vụ không tồn tại" });
                }
            }

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Định dạng file không hợp lệ. Chỉ hỗ trợ pdf, doc, docx, xls, xlsx" });
            }

            var webRootPath = GetWebRootPath();
            var formsDirectory = Path.Combine(webRootPath, "uploads", "forms");
            Directory.CreateDirectory(formsDirectory);

            var storedFileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var storedFilePath = Path.Combine(formsDirectory, storedFileName);

            await using (var stream = new FileStream(storedFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/uploads/forms/{storedFileName}";

            var form = new DownloadForm
            {
                Title = normalizedTitle,
                Description = normalizedDescription,
                FileUrl = fileUrl,
                OriginalFileName = Path.GetFileName(file.FileName),
                FileExtension = extension.ToLowerInvariant(),
                FileSizeBytes = file.Length,
                ServiceId = request.ServiceId,
                IsActive = request.IsActive,
                SortOrder = request.SortOrder,
                UploadedBy = User?.Identity?.Name ?? "Unknown",
                CreatedAt = DateTime.UtcNow
            };

            _context.DownloadForms.Add(form);
            await _context.SaveChangesAsync();

            AddAdminLog("Tải biểu mẫu", form.Id, $"Tải biểu mẫu '{form.Title}'");
            await _context.SaveChangesAsync();

            var createdForm = await _context.DownloadForms
                .AsNoTracking()
                .Include(f => f.Service)
                .FirstAsync(f => f.Id == form.Id);

            return CreatedAtAction(nameof(GetById), new { id = form.Id }, new
            {
                message = "Tải biểu mẫu thành công",
                data = MapToDto(createdForm)
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> Update(int id, [FromBody] UpdateDownloadFormDto dto)
        {
            var form = await _context.DownloadForms.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
            if (form == null)
            {
                return NotFound(new { message = "Không tìm thấy biểu mẫu" });
            }

            var normalizedTitle = NormalizeTitle(dto.Title);
            if (string.IsNullOrWhiteSpace(normalizedTitle))
            {
                return BadRequest(new { message = "Tên biểu mẫu không được để trống" });
            }

            if (normalizedTitle.Length > 200)
            {
                return BadRequest(new { message = "Tên biểu mẫu tối đa 200 ký tự" });
            }

            var normalizedDescription = dto.Description?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedDescription) && normalizedDescription.Length > 1000)
            {
                return BadRequest(new { message = "Mô tả biểu mẫu tối đa 1000 ký tự" });
            }

            if (dto.ServiceId.HasValue)
            {
                var serviceExists = await _context.Services
                    .AnyAsync(s => s.Id == dto.ServiceId.Value && !s.IsDeleted);
                if (!serviceExists)
                {
                    return BadRequest(new { message = "Dịch vụ không tồn tại" });
                }
            }

            form.Title = normalizedTitle;
            form.Description = normalizedDescription;
            form.ServiceId = dto.ServiceId;
            form.IsActive = dto.IsActive;
            form.SortOrder = dto.SortOrder;
            form.UpdatedAt = DateTime.UtcNow;

            AddAdminLog("Cập nhật biểu mẫu", form.Id, $"Cập nhật biểu mẫu '{form.Title}'");
            await _context.SaveChangesAsync();

            var updatedForm = await _context.DownloadForms
                .AsNoTracking()
                .Include(f => f.Service)
                .FirstAsync(f => f.Id == id);

            return Ok(new
            {
                message = "Cập nhật biểu mẫu thành công",
                data = MapToDto(updatedForm)
            });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> Delete(int id)
        {
            var form = await _context.DownloadForms.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
            if (form == null)
            {
                return NotFound(new { message = "Không tìm thấy biểu mẫu" });
            }

            form.IsDeleted = true;
            form.DeletedAt = DateTime.UtcNow;
            form.DeletedBy = User?.Identity?.Name ?? "Unknown";

            _context.DownloadForms.Update(form);
            AddAdminLog("Xóa biểu mẫu", id, $"Xóa biểu mẫu '{form.Title}' (xóa mềm, có thể hoàn tác từ nhật ký)");
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa biểu mẫu thành công (xóa mềm). Có thể hoàn tác từ Nhật ký hệ thống" });
        }

        [HttpGet("{id:int}/download")]
        [AllowAnonymous]
        public async Task<IActionResult> Download(int id)
        {
            var form = await BuildPublicQuery(_context.DownloadForms)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return NotFound(new { message = "Không tìm thấy biểu mẫu" });
            }

            var hasLocalFile = TryResolveStoredFormPath(form.FileUrl, out var localFilePath, out _);
            if (hasLocalFile && !System.IO.File.Exists(localFilePath))
            {
                return NotFound(new { message = "Biểu mẫu hiện không khả dụng. Vui lòng liên hệ quản trị để cập nhật file." });
            }

            var downloadUrl = ResolveDownloadUrl(form.FileUrl);
            if (string.IsNullOrWhiteSpace(downloadUrl))
            {
                return NotFound(new { message = "Liên kết tải biểu mẫu không hợp lệ." });
            }

            form.DownloadCount += 1;
            await _context.SaveChangesAsync();

            if (hasLocalFile)
            {
                var downloadFileName = string.IsNullOrWhiteSpace(form.OriginalFileName)
                    ? Path.GetFileName(localFilePath)
                    : form.OriginalFileName;

                return PhysicalFile(localFilePath, "application/octet-stream", downloadFileName);
            }

            return Redirect(downloadUrl);
        }
    }
}

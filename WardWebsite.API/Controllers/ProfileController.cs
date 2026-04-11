using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WardWebsite.API.Common;
using WardWebsite.API.Data;
using WardWebsite.API.Models;
using WardWebsite.API.Services.Storage;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private const long MaxAvatarFileSizeBytes = 5 * 1024 * 1024;

        private static readonly HashSet<string> AllowedAvatarExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

        private readonly AppDbContext _context;
        private readonly IAvatarStorageService _avatarStorageService;

        public ProfileController(AppDbContext context, IAvatarStorageService avatarStorageService)
        {
            _context = context;
            _avatarStorageService = avatarStorageService;
        }

        [HttpGet("me")]
        public async Task<ActionResult<object>> GetMyProfile()
        {
            var user = await GetCurrentUserAsync(includeRole: true);
            if (user == null)
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ" });
            }

            return Ok(ToProfileDto(user));
        }

        [HttpPut("me")]
        public async Task<ActionResult<object>> UpdateMyProfile([FromBody] UpdateProfileDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Dữ liệu cập nhật không hợp lệ" });
            }

            var user = await GetCurrentUserAsync(includeRole: true);
            if (user == null)
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ" });
            }

            string? normalizedPhoneNumber = null;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
            {
                if (!PhoneNumberHelper.TryNormalizeVietnamPhone(dto.PhoneNumber, out var parsedPhoneNumber))
                {
                    return BadRequest(new { message = "Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)." });
                }

                normalizedPhoneNumber = parsedPhoneNumber;
            }

            user.FullName = NormalizeOptional(dto.FullName, 150);
            user.Email = NormalizeOptional(dto.Email, 150);
            user.PhoneNumber = normalizedPhoneNumber;
            user.Address = NormalizeOptional(dto.Address, 300);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật hồ sơ thành công",
                profile = ToProfileDto(user),
                user = ToUserSummary(user)
            });
        }

        [HttpPost("avatar")]
        [RequestSizeLimit(MaxAvatarFileSizeBytes)]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<object>> UploadAvatar([FromForm] UploadAvatarRequest request)
        {
            var file = request.File;
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn ảnh đại diện" });
            }

            if (file.Length > MaxAvatarFileSizeBytes)
            {
                return BadRequest(new { message = "Kích thước ảnh đại diện tối đa là 5MB" });
            }

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedAvatarExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Định dạng ảnh không hợp lệ. Hỗ trợ: jpg, jpeg, png, webp" });
            }

            var user = await GetCurrentUserAsync(includeRole: true);
            if (user == null)
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ" });
            }

            var oldAvatarUrl = user.AvatarUrl;
            user.AvatarUrl = await _avatarStorageService.SaveAvatarAsync(file, HttpContext.RequestAborted);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _avatarStorageService.DeleteAvatarIfOwnedAsync(oldAvatarUrl, HttpContext.RequestAborted);

            return Ok(new
            {
                message = "Cập nhật ảnh đại diện thành công",
                avatarUrl = user.AvatarUrl,
                profile = ToProfileDto(user),
                user = ToUserSummary(user)
            });
        }

        [HttpPut("change-password")]
        public async Task<ActionResult<object>> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới" });
            }

            if (dto.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự" });
            }

            if (!string.Equals(dto.NewPassword, dto.ConfirmNewPassword, StringComparison.Ordinal))
            {
                return BadRequest(new { message = "Xác nhận mật khẩu mới không khớp" });
            }

            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ" });
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng" });
            }

            if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Mật khẩu mới phải khác mật khẩu hiện tại" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công" });
        }

        private async Task<User?> GetCurrentUserAsync(bool includeRole = false)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return null;
            }

            IQueryable<User> query = _context.Users;
            if (includeRole)
            {
                query = query.Include(u => u.Role);
            }

            return await query.FirstOrDefaultAsync(u => u.Id == userId);
        }

        private object ToProfileDto(User user)
        {
            return new
            {
                user.Id,
                user.Username,
                Role = user.Role?.Name,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.Address,
                user.AvatarUrl,
                user.CreatedAt,
                user.UpdatedAt
            };
        }

        private object ToUserSummary(User user)
        {
            return new
            {
                user.Id,
                user.Username,
                Role = user.Role?.Name,
                user.FullName,
                user.Address,
                user.AvatarUrl
            };
        }

        private static string? NormalizeOptional(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var normalized = value.Trim();
            if (normalized.Length <= maxLength)
            {
                return normalized;
            }

            return normalized[..maxLength];
        }
    }

    public class UpdateProfileDto
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }

    public class UploadAvatarRequest
    {
        public IFormFile? File { get; set; }
    }
}

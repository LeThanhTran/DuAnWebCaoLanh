using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;
using BCrypt.Net;
using System.Net.Mail;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegisterController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RegisterController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { message = "Dữ liệu đăng ký không hợp lệ" });
                }

                var username = request.Username?.Trim();
                var fullName = request.FullName?.Trim();
                var email = request.Email?.Trim().ToLowerInvariant();
                var phoneNumber = request.PhoneNumber?.Trim();
                var address = request.Address?.Trim();

                if (string.IsNullOrWhiteSpace(username)
                    || string.IsNullOrWhiteSpace(request.Password)
                    || string.IsNullOrWhiteSpace(fullName)
                    || string.IsNullOrWhiteSpace(email)
                    || string.IsNullOrWhiteSpace(phoneNumber)
                    || string.IsNullOrWhiteSpace(address))
                {
                    return BadRequest(new { message = "Vui lòng nhập đầy đủ thông tin tài khoản và hồ sơ" });
                }

                if (request.Password.Length < 6)
                {
                    return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự" });
                }

                if (!string.Equals(request.Password, request.ConfirmPassword, StringComparison.Ordinal))
                {
                    return BadRequest(new { message = "Xác nhận mật khẩu không khớp" });
                }

                if (!IsValidEmail(email))
                {
                    return BadRequest(new { message = "Email không hợp lệ" });
                }

                // Check if username exists
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (existingUser != null)
                    return BadRequest(new { message = "Username đã tồn tại" });

                var existingEmail = await _context.Users.AnyAsync(u => u.Email == email);
                if (existingEmail)
                {
                    return BadRequest(new { message = "Email đã được sử dụng" });
                }

                var existingPhone = await _context.Users.AnyAsync(u => u.PhoneNumber == phoneNumber);
                if (existingPhone)
                {
                    return BadRequest(new { message = "Số điện thoại đã được sử dụng" });
                }

                var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                var now = DateTime.UtcNow;
                var user = new User
                {
                    Username = username,
                    PasswordHash = passwordHash,
                    FullName = fullName,
                    Email = email,
                    PhoneNumber = phoneNumber,
                    Address = address,
                    CreatedAt = now,
                    UpdatedAt = now,
                    RoleId = 3
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Đăng ký thành công! Tên đăng nhập: {user.Username}",
                    success = true,
                    user = new
                    {
                        user.Id,
                        user.Username,
                        user.FullName,
                        user.Email,
                        user.PhoneNumber,
                        user.Address
                    }
                });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = $"Lỗi database: {ex.InnerException?.Message ?? ex.Message}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi: {ex.Message}" });
            }
        }

        private static bool IsValidEmail(string email)
        {
            try
            {
                _ = new MailAddress(email);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}

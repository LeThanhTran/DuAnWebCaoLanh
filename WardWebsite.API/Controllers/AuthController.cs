using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using WardWebsite.API.Common;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponse>> Login(LoginDto dto)
        {
            // 1. Kiểm tra null
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new LoginResponse
                {
                    Success = false,
                    Message = "Username và password không được để trống"
                });
            }

            var loginIdentifier = dto.Username.Trim();
            var emailIdentifier = loginIdentifier.ToLowerInvariant();
            var phoneIdentifier = PhoneNumberHelper.Normalize(loginIdentifier);

            // 2. Tìm user trong database
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Username == loginIdentifier
                    || (u.Email != null && u.Email == emailIdentifier)
                    || (u.PhoneNumber != null && u.PhoneNumber == phoneIdentifier));

            if (user == null)
            {
                return Unauthorized(new LoginResponse
                {
                    Success = false,
                    Message = "Username hoặc password không đúng"
                });
            }

            // 3. So sánh password (hash)
            bool isValidPassword = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!isValidPassword)
            {
                return Unauthorized(new LoginResponse
                {
                    Success = false,
                    Message = "Username hoặc password không đúng"
                });
            }

            // 4. Tạo JWT token
            var token = GenerateJwtToken(user);

            // 5. Trả response
            return Ok(new LoginResponse
            {
                Success = true,
                Message = "Đăng nhập thành công",
                Token = token,
                User = new
                {
                    user.Id,
                    user.Username,
                    Role = user.Role!.Name,
                    user.FullName,
                    user.Email,
                    user.PhoneNumber,
                    user.Address,
                    user.AvatarUrl
                }
            });
        }

        [HttpPost("forgot-password")]
        public async Task<ActionResult<object>> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            var identifier = dto.Identifier?.Trim();
            var email = dto.Email?.Trim().ToLowerInvariant();
            var phoneNumber = dto.PhoneNumber?.Trim();
            var normalizedIdentifierPhone = PhoneNumberHelper.Normalize(identifier);

            if (string.IsNullOrWhiteSpace(identifier)
                || string.IsNullOrWhiteSpace(email)
                || string.IsNullOrWhiteSpace(phoneNumber)
                || string.IsNullOrWhiteSpace(dto.NewPassword)
                || string.IsNullOrWhiteSpace(dto.ConfirmNewPassword))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Vui lòng nhập đầy đủ thông tin xác thực và mật khẩu mới"
                });
            }

            if (!IsValidEmail(email))
            {
                return BadRequest(new { success = false, message = "Email không hợp lệ" });
            }

            if (!PhoneNumberHelper.TryNormalizeVietnamPhone(phoneNumber, out var normalizedPhoneNumber))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)."
                });
            }

            if (dto.NewPassword.Length < 6)
            {
                return BadRequest(new { success = false, message = "Mật khẩu mới phải có ít nhất 6 ký tự" });
            }

            if (!string.Equals(dto.NewPassword, dto.ConfirmNewPassword, StringComparison.Ordinal))
            {
                return BadRequest(new { success = false, message = "Xác nhận mật khẩu mới không khớp" });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Username == identifier
                || (u.Email != null && u.Email == identifier.ToLowerInvariant())
                || (u.PhoneNumber != null && u.PhoneNumber == normalizedIdentifierPhone));

            if (user == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy tài khoản phù hợp" });
            }

            var userEmail = user.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            var userPhone = user.PhoneNumber?.Trim() ?? string.Empty;

            if (!string.Equals(userEmail, email, StringComparison.Ordinal)
                || !string.Equals(userPhone, normalizedPhoneNumber, StringComparison.Ordinal))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Email hoặc số điện thoại xác thực không khớp với tài khoản"
                });
            }

            if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
            {
                return BadRequest(new { success = false, message = "Mật khẩu mới không được trùng mật khẩu hiện tại" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."
            });
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

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!)
            );
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role!.Name)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

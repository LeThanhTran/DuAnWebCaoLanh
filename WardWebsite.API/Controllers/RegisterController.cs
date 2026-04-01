using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;
using BCrypt.Net;

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
                if (request == null || string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                    return BadRequest(new { message = "Username và Password không được trống" });

                // Check if username exists
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
                if (existingUser != null)
                    return BadRequest(new { message = "Username đã tồn tại" });

                var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = passwordHash,
                    RoleId = 3
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Đăng ký thành công! Tên đăng nhập: {user.Username}", success = true });
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
    }

    public class RegisterRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var users = await _context.Users
                .Include(u => u.Role)
                .Select(u => new { u.Id, u.Username, Role = u.Role!.Name })
                .ToListAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetById(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return NotFound();
            return Ok(new { user.Id, user.Username, Role = user.Role!.Name });
        }

        [HttpPost]
        public async Task<ActionResult<User>> Create(CreateUserDto dto)
        {
            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = dto.RoleId
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            AddAdminLog("Tạo người dùng", "User", user.Id, $"Tạo tài khoản {user.Username} với RoleId {user.RoleId}");
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            _context.Users.Remove(user);
            AddAdminLog("Xóa người dùng", "User", user.Id, $"Xóa tài khoản {user.Username}");
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy người dùng" });
            }

            var role = await _context.Roles.FindAsync(dto.RoleId);
            if (role == null)
            {
                return BadRequest(new { success = false, message = "Vai trò không hợp lệ" });
            }

            user.RoleId = dto.RoleId;
            _context.Users.Update(user);
            AddAdminLog("Đổi vai trò người dùng", "User", user.Id, $"Đổi RoleId thành {dto.RoleId} cho tài khoản {user.Username}");
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Cập nhật vai trò thành công" });
        }
    }

    public class CreateUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public int RoleId { get; set; }
    }

    public class UpdateUserRoleDto
    {
        public int RoleId { get; set; }
    }
}

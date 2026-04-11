using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Common;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactMessagesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ContactMessagesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Editor,Viewer")]
        public async Task<IActionResult> Create([FromBody] CreateContactMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ thông tin bắt buộc" });
            }

            var normalizedPhoneNumber = string.Empty;
            if (!string.IsNullOrWhiteSpace(dto.Phone))
            {
                if (!PhoneNumberHelper.TryNormalizeVietnamPhone(dto.Phone, out normalizedPhoneNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)."
                    });
                }
            }

            var entity = new ContactMessage
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                Phone = normalizedPhoneNumber,
                Message = dto.Message.Trim(),
                CreatedAt = DateTime.UtcNow,
                IsHandled = false
            };

            _context.ContactMessages.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã ghi nhận liên hệ", data = new { entity.Id, entity.CreatedAt } });
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.ContactMessages
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.Id,
                    x.Name,
                    x.Email,
                    x.Phone,
                    x.Message,
                    x.CreatedAt,
                    x.IsHandled
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpPut("{id}/handled")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkHandled(int id)
        {
            var item = await _context.ContactMessages.FindAsync(id);
            if (item == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy liên hệ" });
            }

            item.IsHandled = true;
            await _context.SaveChangesAsync();

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Đánh dấu liên hệ đã xử lý",
                TargetType = "ContactMessage",
                TargetId = item.Id,
                Details = $"Đánh dấu xử lý liên hệ của {item.Name}",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã đánh dấu đã xử lý" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteHandled(int id)
        {
            var item = await _context.ContactMessages.FindAsync(id);
            if (item == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy liên hệ" });
            }

            if (!item.IsHandled)
            {
                return BadRequest(new { success = false, message = "Chỉ được xóa tin nhắn đã xử lý" });
            }

            _context.ContactMessages.Remove(item);
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Xóa liên hệ đã xử lý",
                TargetType = "ContactMessage",
                TargetId = id,
                Details = $"Xóa liên hệ của {item.Name}",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã xóa tin nhắn liên hệ" });
        }
    }

    public class CreateContactMessageDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}

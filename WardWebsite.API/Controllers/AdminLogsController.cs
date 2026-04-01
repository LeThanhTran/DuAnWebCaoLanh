using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminLogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? keyword = null,
            [FromQuery] string? action = null,
            [FromQuery] string? targetType = null,
            [FromQuery] string? admin = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = _context.AdminActionLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.AdminUsername.ToLower().Contains(term) ||
                    x.Action.ToLower().Contains(term) ||
                    x.TargetType.ToLower().Contains(term) ||
                    x.Details.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(x => x.Action == action);
            }

            if (!string.IsNullOrWhiteSpace(targetType))
            {
                query = query.Where(x => x.TargetType == targetType);
            }

            if (!string.IsNullOrWhiteSpace(admin))
            {
                query = query.Where(x => x.AdminUsername == admin);
            }

            if (startDate.HasValue)
            {
                query = query.Where(x => x.CreatedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                var end = endDate.Value.Date.AddDays(1);
                query = query.Where(x => x.CreatedAt < end);
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = items,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (total + pageSize - 1) / pageSize
                }
            });
        }
    }
}

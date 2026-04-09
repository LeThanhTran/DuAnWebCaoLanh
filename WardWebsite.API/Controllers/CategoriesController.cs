using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CategoriesController(AppDbContext context)
        {
            _context = context;
        }

        private void AddAdminLog(string action, int? targetId, string details)
        {
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = action,
                TargetType = "Category",
                TargetId = targetId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
        }

        [HttpGet]
        public async Task<ActionResult> GetAll()
        {
            var categories = await _context.Categories
                .Where(c => !c.IsDeleted)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    ArticleCount = c.Articles.Count(a => !a.IsDeleted)
                })
                .ToListAsync();
            return Ok(categories);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            var category = await _context.Categories
                .Where(c => c.Id == id && !c.IsDeleted)
                .Select(c => new { c.Id, c.Name })
                .FirstOrDefaultAsync();

            if (category == null)
            {
                return NotFound(new { message = "Không tìm thấy danh mục" });
            }

            return Ok(category);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> Create([FromBody] UpsertCategoryDto dto)
        {
            var name = dto.Name?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Tên danh mục không được để trống" });
            }

            if (name.Length > 100)
            {
                return BadRequest(new { message = "Tên danh mục tối đa 100 ký tự" });
            }

            var exists = await _context.Categories
                .AnyAsync(c => !c.IsDeleted && c.Name.ToLower() == name.ToLower());

            if (exists)
            {
                return BadRequest(new { message = "Tên danh mục đã tồn tại" });
            }

            var category = new Category
            {
                Name = name
            };

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            AddAdminLog("Tạo danh mục", category.Id, $"Tạo danh mục '{category.Name}'");
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, new
            {
                message = "Tạo danh mục thành công",
                data = new { category.Id, category.Name }
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> Update(int id, [FromBody] UpsertCategoryDto dto)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (category == null)
            {
                return NotFound(new { message = "Không tìm thấy danh mục" });
            }

            var name = dto.Name?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Tên danh mục không được để trống" });
            }

            if (name.Length > 100)
            {
                return BadRequest(new { message = "Tên danh mục tối đa 100 ký tự" });
            }

            var exists = await _context.Categories
                .AnyAsync(c => !c.IsDeleted && c.Id != id && c.Name.ToLower() == name.ToLower());

            if (exists)
            {
                return BadRequest(new { message = "Tên danh mục đã tồn tại" });
            }

            category.Name = name;

            _context.Categories.Update(category);
            AddAdminLog("Cập nhật danh mục", category.Id, $"Cập nhật danh mục thành '{category.Name}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật danh mục thành công",
                data = new { category.Id, category.Name }
            });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult> Delete(int id)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (category == null)
            {
                return NotFound(new { message = "Không tìm thấy danh mục" });
            }

            var hasArticles = await _context.Articles.AnyAsync(a => a.CategoryId == id && !a.IsDeleted);
            if (hasArticles)
            {
                return BadRequest(new { message = "Danh mục đang được sử dụng bởi bài viết, không thể xóa" });
            }

            category.IsDeleted = true;
            category.DeletedAt = DateTime.UtcNow;
            category.DeletedBy = User?.Identity?.Name ?? "Unknown";

            _context.Categories.Update(category);
            AddAdminLog("Xóa danh mục", id, $"Xóa danh mục '{category.Name}' (xóa mềm, có thể hoàn tác từ nhật ký)");
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa danh mục thành công (xóa mềm). Có thể hoàn tác từ Nhật ký hệ thống" });
        }
    }

    public class UpsertCategoryDto
    {
        public string Name { get; set; } = string.Empty;
    }
}

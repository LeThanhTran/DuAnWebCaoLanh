using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArticlesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ArticlesController(AppDbContext context)
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

        // GET /api/articles?page=1&pageSize=10
        [HttpGet]
        public async Task<ActionResult<object>> GetAll(int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var total = await _context.Articles.CountAsync();
            var skip = (page - 1) * pageSize;

            var articles = await _context.Articles
                .Include(a => a.Category)
                .OrderByDescending(a => a.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Content,
                    a.CreatedAt,
                    Category = a.Category!.Name
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                data = articles
            });
        }

        // GET /api/articles/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetById(int id)
        {
            var article = await _context.Articles
                .Include(a => a.Category)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            return Ok(new
            {
                article.Id,
                article.Title,
                article.Content,
                article.CreatedAt,
                Category = article.Category!.Name,
                CategoryId = article.CategoryId
            });
        }

        // POST /api/articles
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<object>> Create(CreateArticleDto dto)
        {
            // Validate
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Title không được để trống" });

            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Content không được để trống" });

            if (dto.Title.Length > 500)
                return BadRequest(new { message = "Title tối đa 500 ký tự" });

            // Kiểm tra category tồn tại
            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
            if (!categoryExists)
                return BadRequest(new { message = "Category không tồn tại" });

            var article = new Article
            {
                Title = dto.Title.Trim(),
                Content = dto.Content.Trim(),
                CategoryId = dto.CategoryId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Articles.Add(article);
            await _context.SaveChangesAsync();

            AddAdminLog("Tạo bài viết", "Article", article.Id, $"Tạo mới bài '{article.Title}' ở danh mục {article.CategoryId}");
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = article.Id }, new
            {
                article.Id,
                article.Title,
                article.Content,
                article.CreatedAt,
                article.CategoryId
            });
        }

        // PUT /api/articles/{id}
        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<object>> Update(int id, UpdateArticleDto dto)
        {
            var article = await _context.Articles.FindAsync(id);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            // Validate
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Title không được để trống" });

            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Content không được để trống" });

            if (dto.Title.Length > 500)
                return BadRequest(new { message = "Title tối đa 500 ký tự" });

            if (dto.CategoryId.HasValue)
            {
                var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
                if (!categoryExists)
                    return BadRequest(new { message = "Category không tồn tại" });

                article.CategoryId = dto.CategoryId.Value;
            }

            article.Title = dto.Title.Trim();
            article.Content = dto.Content.Trim();

            _context.Articles.Update(article);
            AddAdminLog("Cập nhật bài viết", "Article", article.Id, $"Cập nhật bài '{article.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thành công",
                article = new
                {
                    article.Id,
                    article.Title,
                    article.Content,
                    article.CreatedAt,
                    article.CategoryId
                }
            });
        }

        // DELETE /api/articles/{id}
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var article = await _context.Articles.FindAsync(id);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            _context.Articles.Remove(article);
            AddAdminLog("Xóa bài viết", "Article", article.Id, $"Xóa bài '{article.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa thành công" });
        }
    }

    public class CreateArticleDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int CategoryId { get; set; }
    }

    public class UpdateArticleDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int? CategoryId { get; set; }
    }
}

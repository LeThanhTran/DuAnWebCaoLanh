using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/articles/{articleId}/comments")]
    public class CommentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CommentsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/articles/{articleId}/comments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetComments(int articleId)
        {
            // Kiểm tra article tồn tại
            var articleExists = await _context.Articles.AnyAsync(a => a.Id == articleId);
            if (!articleExists)
                return NotFound(new { message = "Article không tồn tại" });

            var comments = await _context.Comments
                .Where(c => c.ArticleId == articleId)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Content,
                    c.CreatedAt
                })
                .ToListAsync();

            return Ok(comments);
        }

        // POST /api/articles/{articleId}/comments
        [HttpPost]
        public async Task<ActionResult<object>> CreateComment(int articleId, CreateCommentDto dto)
        {
            // Kiểm tra article tồn tại
            var article = await _context.Articles.FindAsync(articleId);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            // Validate
            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Comment không được để trống" });

            if (dto.Content.Length > 5000)
                return BadRequest(new { message = "Comment tối đa 5000 ký tự" });

            var comment = new Comment
            {
                Content = dto.Content.Trim(),
                ArticleId = articleId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetComments), new { articleId }, new
            {
                comment.Id,
                comment.Content,
                comment.CreatedAt
            });
        }
    }

    public class CreateCommentDto
    {
        public string Content { get; set; } = string.Empty;
    }
}

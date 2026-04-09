using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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

        private bool IsModerator()
        {
            return User?.Identity?.IsAuthenticated == true &&
                   (User.IsInRole("Admin") || User.IsInRole("Editor"));
        }

        private static string NormalizeCommentStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return string.Empty;
            }

            return status.Trim().ToLowerInvariant() switch
            {
                "pending" => "Pending",
                "approved" => "Approved",
                "rejected" => "Rejected",
                "hidden" => "Hidden",
                _ => string.Empty
            };
        }

        private void AddAdminLog(string action, int? targetId, string details)
        {
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = action,
                TargetType = "Comment",
                TargetId = targetId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
        }

        // GET /api/articles/{articleId}/comments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetComments(int articleId, [FromQuery] string? status = null)
        {
            var article = await _context.Articles
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == articleId && !a.IsDeleted);

            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            if (!IsModerator() && article.Status != "Published")
                return NotFound(new { message = "Article không tồn tại" });

            var query = _context.Comments
                .Where(c => c.ArticleId == articleId)
                .AsQueryable();

            if (IsModerator())
            {
                var normalizedStatus = NormalizeCommentStatus(status);
                if (!string.IsNullOrWhiteSpace(normalizedStatus))
                {
                    query = query.Where(c => c.Status == normalizedStatus);
                }
            }
            else
            {
                query = query.Where(c => c.Status == "Approved");
            }

            var comments = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Content,
                    c.Status,
                    c.CreatedAt,
                    c.ReviewedAt,
                    c.ReviewedBy,
                    c.ReviewNote
                })
                .ToListAsync();

            return Ok(comments);
        }

        // POST /api/articles/{articleId}/comments
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<object>> CreateComment(int articleId, CreateCommentDto dto)
        {
            // Kiểm tra article tồn tại
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == articleId && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            // Validate
            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Comment không được để trống" });

            if (dto.Content.Length > 5000)
                return BadRequest(new { message = "Comment tối đa 5000 ký tự" });

            var commenterUsername = User?.Identity?.Name?.Trim();
            if (string.IsNullOrWhiteSpace(commenterUsername))
            {
                return Unauthorized(new { message = "Không xác định được tài khoản đăng nhập" });
            }

            var comment = new Comment
            {
                Content = dto.Content.Trim(),
                ArticleId = articleId,
                CreatedByUsername = commenterUsername,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetComments), new { articleId }, new
            {
                message = "Bình luận đã được gửi và đang chờ kiểm duyệt",
                comment.Id,
                comment.Content,
                comment.CreatedByUsername,
                comment.Status,
                comment.CreatedAt
            });
        }

        // GET /api/comments/moderation
        [HttpGet("/api/comments/moderation")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> GetCommentsForModeration(
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = _context.Comments
                .Include(c => c.Article)
                .Where(c => c.Article != null && !c.Article.IsDeleted)
                .AsQueryable();

            var normalizedStatus = NormalizeCommentStatus(status);
            if (!string.IsNullOrWhiteSpace(normalizedStatus))
            {
                query = query.Where(c => c.Status == normalizedStatus);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim().ToLower();
                query = query.Where(c =>
                    c.Content.ToLower().Contains(keyword) ||
                    c.CreatedByUsername.ToLower().Contains(keyword) ||
                    c.Article!.Title.ToLower().Contains(keyword));
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * pageSize;

            var comments = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(c => new
                {
                    c.Id,
                    c.Content,
                    c.Status,
                    c.CreatedAt,
                    c.ReviewedAt,
                    c.ReviewedBy,
                    c.ReviewNote,
                    c.CreatedByUsername,
                    c.ArticleId,
                    ArticleTitle = c.Article!.Title
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                status = normalizedStatus,
                search,
                data = comments
            });
        }

        // PUT /api/comments/{id}/status
        [HttpPut("/api/comments/{id}/status")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> ModerateComment(int id, ModerateCommentDto dto)
        {
            var comment = await _context.Comments
                .Include(c => c.Article)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (comment == null)
            {
                return NotFound(new { message = "Comment không tồn tại" });
            }

            var normalizedStatus = NormalizeCommentStatus(dto.Status);
            if (normalizedStatus != "Approved" && normalizedStatus != "Rejected" && normalizedStatus != "Hidden")
            {
                return BadRequest(new { message = "Trạng thái kiểm duyệt không hợp lệ" });
            }

            comment.Status = normalizedStatus;
            comment.ReviewedAt = DateTime.UtcNow;
            comment.ReviewedBy = User?.Identity?.Name;
            comment.ReviewNote = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();

            AddAdminLog(
                "Kiểm duyệt bình luận",
                comment.Id,
                $"Đặt trạng thái bình luận #{comment.Id} thành {comment.Status} ở bài '{comment.Article?.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật trạng thái bình luận thành công",
                comment = new
                {
                    comment.Id,
                    comment.Status,
                    comment.ReviewedAt,
                    comment.ReviewedBy,
                    comment.ReviewNote
                }
            });
        }

        // DELETE /api/comments/{id}
        [HttpDelete("/api/comments/{id}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> DeleteComment(int id)
        {
            var comment = await _context.Comments
                .Include(c => c.Article)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (comment == null)
            {
                return NotFound(new { message = "Comment không tồn tại" });
            }

            _context.Comments.Remove(comment);
            AddAdminLog(
                "Xóa bình luận",
                comment.Id,
                $"Xóa bình luận #{comment.Id} ở bài '{comment.Article?.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa bình luận thành công" });
        }
    }

    public class CreateCommentDto
    {
        public string Content { get; set; } = string.Empty;
    }

    public class ModerateCommentDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}

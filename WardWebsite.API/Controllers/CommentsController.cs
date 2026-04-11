using Microsoft.AspNetCore.Authorization;
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

        private bool IsModerator()
        {
            return User?.Identity?.IsAuthenticated == true
                   && (User.IsInRole("Admin") || User.IsInRole("Editor"));
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

        private static string NormalizeReactionType(string? reactionType)
        {
            if (string.IsNullOrWhiteSpace(reactionType))
            {
                return string.Empty;
            }

            return reactionType.Trim().ToLowerInvariant() switch
            {
                "like" => "Like",
                "dislike" => "Dislike",
                _ => string.Empty
            };
        }

        private static void ApplyReactionCountDelta(Comment comment, string reactionType, int delta)
        {
            if (reactionType == "Like")
            {
                comment.LikeCount = Math.Max(0, comment.LikeCount + delta);
                return;
            }

            if (reactionType == "Dislike")
            {
                comment.DislikeCount = Math.Max(0, comment.DislikeCount + delta);
            }
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
            {
                return NotFound(new { message = "Article không tồn tại" });
            }

            if (!IsModerator() && article.Status != "Published")
            {
                return NotFound(new { message = "Article không tồn tại" });
            }

            var query = _context.Comments
                .AsNoTracking()
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

            var currentUsername = User?.Identity?.Name?.Trim() ?? string.Empty;
            var userReactionQuery = string.IsNullOrWhiteSpace(currentUsername)
                ? _context.CommentReactions.AsNoTracking().Where(r => false)
                : _context.CommentReactions.AsNoTracking().Where(r => r.Username == currentUsername);

            var comments = await (
                from c in query
                join u in _context.Users.AsNoTracking() on c.CreatedByUsername equals u.Username into userGroup
                from u in userGroup.DefaultIfEmpty()
                join r in userReactionQuery on c.Id equals r.CommentId into reactionGroup
                from r in reactionGroup.DefaultIfEmpty()
                orderby c.CreatedAt descending
                select new
                {
                    c.Id,
                    c.ArticleId,
                    c.ParentCommentId,
                    c.Content,
                    c.CreatedByUsername,
                    CreatedByDisplayName = u != null && !string.IsNullOrWhiteSpace(u.FullName)
                        ? u.FullName
                        : c.CreatedByUsername,
                    c.Status,
                    c.CreatedAt,
                    c.ReviewedAt,
                    c.ReviewedBy,
                    c.ReviewNote,
                    c.LikeCount,
                    c.DislikeCount,
                    CurrentUserReaction = r != null ? r.ReactionType : null
                })
                .ToListAsync();

            return Ok(comments);
        }

        // POST /api/articles/{articleId}/comments
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<object>> CreateComment(int articleId, CreateCommentDto dto)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == articleId && !a.IsDeleted);
            if (article == null)
            {
                return NotFound(new { message = "Article không tồn tại" });
            }

            if (string.IsNullOrWhiteSpace(dto.Content))
            {
                return BadRequest(new { message = "Comment không được để trống" });
            }

            if (dto.Content.Length > 5000)
            {
                return BadRequest(new { message = "Comment tối đa 5000 ký tự" });
            }

            var commenterUsername = User?.Identity?.Name?.Trim();
            if (string.IsNullOrWhiteSpace(commenterUsername))
            {
                return Unauthorized(new { message = "Không xác định được tài khoản đăng nhập" });
            }

            int? parentCommentId = null;
            if (dto.ParentCommentId.HasValue)
            {
                var parentComment = await _context.Comments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == dto.ParentCommentId.Value && c.ArticleId == articleId);

                if (parentComment == null)
                {
                    return BadRequest(new { message = "Không tìm thấy bình luận gốc để trả lời" });
                }

                if (!IsModerator() && parentComment.Status != "Approved")
                {
                    return BadRequest(new { message = "Bạn chỉ có thể trả lời bình luận đã được duyệt" });
                }

                parentCommentId = parentComment.Id;
            }

            var comment = new Comment
            {
                Content = dto.Content.Trim(),
                ArticleId = articleId,
                ParentCommentId = parentCommentId,
                CreatedByUsername = commenterUsername,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                LikeCount = 0,
                DislikeCount = 0
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            var displayName = await _context.Users
                .AsNoTracking()
                .Where(u => u.Username == commenterUsername)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

            return CreatedAtAction(nameof(GetComments), new { articleId }, new
            {
                message = "Bình luận đã được gửi và đang chờ kiểm duyệt",
                comment.Id,
                comment.ArticleId,
                comment.ParentCommentId,
                comment.Content,
                comment.CreatedByUsername,
                CreatedByDisplayName = string.IsNullOrWhiteSpace(displayName) ? comment.CreatedByUsername : displayName,
                comment.Status,
                comment.CreatedAt,
                comment.LikeCount,
                comment.DislikeCount
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
            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                pageSize = 20;
            }

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
                    c.Content.ToLower().Contains(keyword)
                    || c.CreatedByUsername.ToLower().Contains(keyword)
                    || c.Article!.Title.ToLower().Contains(keyword));
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
                    c.ArticleId,
                    c.ParentCommentId,
                    c.Content,
                    c.Status,
                    c.CreatedAt,
                    c.ReviewedAt,
                    c.ReviewedBy,
                    c.ReviewNote,
                    c.CreatedByUsername,
                    c.LikeCount,
                    c.DislikeCount,
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

        // POST /api/comments/{id}/reaction
        [HttpPost("/api/comments/{id}/reaction")]
        [Authorize]
        public async Task<ActionResult<object>> ReactToComment(int id, ReactCommentDto dto)
        {
            var comment = await _context.Comments
                .Include(c => c.Article)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (comment == null)
            {
                return NotFound(new { message = "Comment không tồn tại" });
            }

            if (!IsModerator() && comment.Status != "Approved")
            {
                return BadRequest(new { message = "Bạn chỉ có thể tương tác với bình luận đã được duyệt" });
            }

            var normalizedReactionType = NormalizeReactionType(dto.ReactionType);
            if (string.IsNullOrWhiteSpace(normalizedReactionType))
            {
                return BadRequest(new { message = "Loại phản ứng không hợp lệ" });
            }

            var username = User?.Identity?.Name?.Trim();
            if (string.IsNullOrWhiteSpace(username))
            {
                return Unauthorized(new { message = "Không xác định được tài khoản đăng nhập" });
            }

            var existingReaction = await _context.CommentReactions
                .FirstOrDefaultAsync(r => r.CommentId == comment.Id && r.Username == username);

            string? currentUserReaction;

            if (existingReaction == null)
            {
                _context.CommentReactions.Add(new CommentReaction
                {
                    CommentId = comment.Id,
                    Username = username,
                    ReactionType = normalizedReactionType,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                ApplyReactionCountDelta(comment, normalizedReactionType, 1);
                currentUserReaction = normalizedReactionType;
            }
            else if (existingReaction.ReactionType == normalizedReactionType)
            {
                ApplyReactionCountDelta(comment, existingReaction.ReactionType, -1);
                _context.CommentReactions.Remove(existingReaction);
                currentUserReaction = null;
            }
            else
            {
                ApplyReactionCountDelta(comment, existingReaction.ReactionType, -1);
                existingReaction.ReactionType = normalizedReactionType;
                existingReaction.UpdatedAt = DateTime.UtcNow;
                ApplyReactionCountDelta(comment, normalizedReactionType, 1);
                currentUserReaction = normalizedReactionType;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    commentId = comment.Id,
                    likeCount = comment.LikeCount,
                    dislikeCount = comment.DislikeCount,
                    currentUserReaction
                }
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
        public int? ParentCommentId { get; set; }
    }

    public class ReactCommentDto
    {
        public string ReactionType { get; set; } = string.Empty;
    }

    public class ModerateCommentDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}

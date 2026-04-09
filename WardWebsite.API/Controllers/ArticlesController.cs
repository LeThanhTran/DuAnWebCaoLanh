using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.RegularExpressions;
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

        private bool IsModerator()
        {
            return User?.Identity?.IsAuthenticated == true &&
                   (User.IsInRole("Admin") || User.IsInRole("Editor"));
        }

        private static string SanitizeRichText(string? html)
        {
            var safeHtml = html ?? string.Empty;
            safeHtml = Regex.Replace(safeHtml, "<script[\\s\\S]*?</script>", string.Empty, RegexOptions.IgnoreCase);
            safeHtml = Regex.Replace(safeHtml, "<style[\\s\\S]*?</style>", string.Empty, RegexOptions.IgnoreCase);
            safeHtml = Regex.Replace(safeHtml, "on[\\w-]+\\s*=\\s*\"[^\"]*\"", string.Empty, RegexOptions.IgnoreCase);
            safeHtml = Regex.Replace(safeHtml, "on[\\w-]+\\s*=\\s*'[^']*'", string.Empty, RegexOptions.IgnoreCase);
            safeHtml = Regex.Replace(safeHtml, "javascript:", string.Empty, RegexOptions.IgnoreCase);
            return safeHtml.Trim();
        }

        private static string ExtractPlainText(string html)
        {
            var withoutTags = Regex.Replace(html, "<[^>]*>", " ");
            return WebUtility.HtmlDecode(withoutTags).Trim();
        }

        private static string BuildSnippet(string html, int maxLength = 180)
        {
            var plainText = Regex.Replace(ExtractPlainText(html), @"\s+", " ").Trim();
            if (string.IsNullOrWhiteSpace(plainText))
            {
                return string.Empty;
            }

            if (plainText.Length <= maxLength)
            {
                return plainText;
            }

            return plainText[..(maxLength - 3)].TrimEnd() + "...";
        }

        private static string ExtractFirstImageUrl(string? html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return string.Empty;
            }

            var match = Regex.Match(html, "<img[^>]+src=[\"'](?<src>[^\"']+)[\"'][^>]*>", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups["src"].Value : string.Empty;
        }

        private static string NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return string.Empty;
            }

            return status.Trim().ToLowerInvariant() switch
            {
                "draft" => "Draft",
                "pendingreview" => "PendingReview",
                "pending_review" => "PendingReview",
                "pending" => "PendingReview",
                "approved" => "Approved",
                "rejected" => "Rejected",
                "published" => "Published",
                _ => string.Empty
            };
        }

        private static bool IsAllowedReviewDecision(string status)
        {
            return status == "Approved" || status == "Rejected";
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

        // GET /api/articles?page=1&pageSize=10&search=...&categoryId=...
        [HttpGet]
        public async Task<ActionResult<object>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] string? status = null,
            [FromQuery] bool includeUnpublished = false)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var query = _context.Articles
                .AsNoTracking()
                .Where(a => !a.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = $"%{search.Trim()}%";
                query = query.Where(a =>
                    EF.Functions.Like(a.Title, term) ||
                    EF.Functions.Like(a.Content, term));
            }

            if (categoryId.HasValue && categoryId.Value > 0)
            {
                query = query.Where(a => a.CategoryId == categoryId.Value);
            }

            var canViewUnpublished = includeUnpublished && IsModerator();

            if (!canViewUnpublished)
            {
                query = query.Where(a => a.Status == "Published");
            }

            var normalizedStatus = NormalizeStatus(status);
            if (canViewUnpublished && !string.IsNullOrWhiteSpace(normalizedStatus))
            {
                query = query.Where(a => a.Status == normalizedStatus);
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * pageSize;

            var articles = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Status,
                    a.CreatedAt,
                    a.SubmittedAt,
                    a.ReviewedAt,
                    a.ReviewedBy,
                    a.PublishedAt,
                    a.PublishedBy,
                    a.ViewCount,
                    CommentCount = a.Comments.Count(c => c.Status == "Approved"),
                    Category = a.Category != null ? a.Category.Name : string.Empty
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                search,
                categoryId,
                status = canViewUnpublished ? normalizedStatus : "Published",
                data = articles
            });
        }

        // GET /api/articles/featured?take=5
        [HttpGet("featured")]
        public async Task<ActionResult<IEnumerable<object>>> GetFeatured([FromQuery] int take = 5)
        {
            if (take < 1) take = 5;
            if (take > 10) take = 10;

            var featuredRows = await _context.Articles
                .AsNoTracking()
                .Where(a => !a.IsDeleted && a.Status == "Published")
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Content,
                    a.CreatedAt,
                    a.PublishedAt,
                    a.ViewCount,
                    CommentCount = a.Comments.Count(c => c.Status == "Approved"),
                    Category = a.Category != null ? a.Category.Name : string.Empty
                })
                .OrderByDescending(a => a.ViewCount)
                .ThenByDescending(a => a.CommentCount)
                .ThenByDescending(a => a.PublishedAt ?? a.CreatedAt)
                .Take(take)
                .ToListAsync();

            var featured = featuredRows
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    Summary = BuildSnippet(a.Content, 180),
                    ThumbnailUrl = ExtractFirstImageUrl(a.Content),
                    a.CreatedAt,
                    a.PublishedAt,
                    a.ViewCount,
                    a.CommentCount,
                    a.Category
                })
                .ToList();

            return Ok(featured);
        }

        // GET /api/articles/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetById(int id)
        {
            var article = await _context.Articles
                .Include(a => a.Category)
                .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            var isModerator = IsModerator();

            if (!isModerator && article.Status != "Published")
                return NotFound(new { message = "Article không tồn tại" });

            if (!isModerator && article.Status == "Published")
            {
                article.ViewCount += 1;
                await _context.SaveChangesAsync();
            }

            var commentCount = await _context.Comments
                .Where(c => c.ArticleId == article.Id && c.Status == "Approved")
                .CountAsync();

            return Ok(new
            {
                article.Id,
                article.Title,
                article.Content,
                article.Status,
                article.CreatedAt,
                article.SubmittedAt,
                article.ReviewedAt,
                article.ReviewedBy,
                article.ReviewNote,
                article.PublishedAt,
                article.PublishedBy,
                article.ViewCount,
                CommentCount = commentCount,
                Category = article.Category!.Name,
                CategoryId = article.CategoryId
            });
        }

        // POST /api/articles
        [HttpPost]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> Create(CreateArticleDto dto)
        {
            var sanitizedContent = SanitizeRichText(dto.Content);
            var plainText = ExtractPlainText(sanitizedContent);

            // Validate
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Title không được để trống" });

            if (string.IsNullOrWhiteSpace(plainText))
                return BadRequest(new { message = "Content không được để trống" });

            if (dto.Title.Length > 500)
                return BadRequest(new { message = "Title tối đa 500 ký tự" });

            // Kiểm tra category tồn tại
            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId && !c.IsDeleted);
            if (!categoryExists)
                return BadRequest(new { message = "Category không tồn tại" });

            var status = dto.SubmitForReview ? "PendingReview" : "Draft";
            DateTime? submittedAt = dto.SubmitForReview ? DateTime.UtcNow : null;

            var article = new Article
            {
                Title = dto.Title.Trim(),
                Content = sanitizedContent,
                CategoryId = dto.CategoryId,
                Status = status,
                SubmittedAt = submittedAt,
                CreatedAt = DateTime.UtcNow
            };

            _context.Articles.Add(article);
            await _context.SaveChangesAsync();

            AddAdminLog("Tạo bài viết", "Article", article.Id, $"Tạo mới bài '{article.Title}' với trạng thái {article.Status}");
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = article.Id }, new
            {
                article.Id,
                article.Title,
                article.Content,
                article.Status,
                article.CreatedAt,
                article.SubmittedAt,
                article.CategoryId
            });
        }

        // PUT /api/articles/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> Update(int id, UpdateArticleDto dto)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            var sanitizedContent = SanitizeRichText(dto.Content);
            var plainText = ExtractPlainText(sanitizedContent);

            // Validate
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Title không được để trống" });

            if (string.IsNullOrWhiteSpace(plainText))
                return BadRequest(new { message = "Content không được để trống" });

            if (dto.Title.Length > 500)
                return BadRequest(new { message = "Title tối đa 500 ký tự" });

            if (dto.CategoryId.HasValue)
            {
                var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId && !c.IsDeleted);
                if (!categoryExists)
                    return BadRequest(new { message = "Category không tồn tại" });

                article.CategoryId = dto.CategoryId.Value;
            }

            article.Title = dto.Title.Trim();
            article.Content = sanitizedContent;
            article.Status = dto.SubmitForReview ? "PendingReview" : "Draft";
            article.SubmittedAt = dto.SubmitForReview ? DateTime.UtcNow : null;
            article.ReviewedAt = null;
            article.ReviewedBy = null;
            article.ReviewNote = null;
            article.PublishedAt = null;
            article.PublishedBy = null;

            _context.Articles.Update(article);
            AddAdminLog("Cập nhật bài viết", "Article", article.Id, $"Cập nhật bài '{article.Title}' và chuyển trạng thái {article.Status}");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thành công",
                article = new
                {
                    article.Id,
                    article.Title,
                    article.Content,
                    article.Status,
                    article.CreatedAt,
                    article.SubmittedAt,
                    article.CategoryId
                }
            });
        }

        // PUT /api/articles/{id}/submit
        [HttpPut("{id}/submit")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> SubmitForReview(int id)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            if (article.Status == "Published")
                return BadRequest(new { message = "Bài đã xuất bản, hãy gỡ xuất bản trước khi gửi duyệt lại" });

            article.Status = "PendingReview";
            article.SubmittedAt = DateTime.UtcNow;
            article.ReviewedAt = null;
            article.ReviewedBy = null;
            article.ReviewNote = null;

            AddAdminLog("Gửi duyệt bài viết", "Article", article.Id, $"Gửi duyệt bài '{article.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã gửi duyệt bài viết",
                article = new
                {
                    article.Id,
                    article.Title,
                    article.Status,
                    article.SubmittedAt
                }
            });
        }

        // PUT /api/articles/{id}/review
        [HttpPut("{id}/review")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> ReviewArticle(int id, ReviewArticleDto dto)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            if (article.Status != "PendingReview")
                return BadRequest(new { message = "Chỉ bài đang chờ duyệt mới có thể kiểm duyệt" });

            var normalizedDecision = NormalizeStatus(dto.Decision);
            if (!IsAllowedReviewDecision(normalizedDecision))
                return BadRequest(new { message = "Quyết định kiểm duyệt không hợp lệ" });

            article.Status = normalizedDecision;
            article.ReviewedAt = DateTime.UtcNow;
            article.ReviewedBy = User?.Identity?.Name;
            article.ReviewNote = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();

            if (normalizedDecision == "Rejected")
            {
                article.PublishedAt = null;
                article.PublishedBy = null;
            }

            AddAdminLog(
                "Kiểm duyệt bài viết",
                "Article",
                article.Id,
                $"Kiểm duyệt bài '{article.Title}' với kết quả {normalizedDecision}");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = normalizedDecision == "Approved" ? "Đã duyệt bài viết" : "Đã từ chối bài viết",
                article = new
                {
                    article.Id,
                    article.Title,
                    article.Status,
                    article.ReviewedAt,
                    article.ReviewedBy,
                    article.ReviewNote
                }
            });
        }

        // PUT /api/articles/{id}/publish
        [HttpPut("{id}/publish")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> PublishArticle(int id)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            if (article.Status == "Published")
                return Ok(new { message = "Bài viết đã ở trạng thái xuất bản" });

            if (article.Status != "Approved")
                return BadRequest(new { message = "Chỉ bài đã duyệt mới có thể xuất bản" });

            article.Status = "Published";
            article.PublishedAt = DateTime.UtcNow;
            article.PublishedBy = User?.Identity?.Name;

            AddAdminLog("Xuất bản bài viết", "Article", article.Id, $"Xuất bản bài '{article.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xuất bản bài viết thành công",
                article = new
                {
                    article.Id,
                    article.Title,
                    article.Status,
                    article.PublishedAt,
                    article.PublishedBy
                }
            });
        }

        // PUT /api/articles/{id}/unpublish
        [HttpPut("{id}/unpublish")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> UnpublishArticle(int id)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            if (article.Status != "Published")
                return BadRequest(new { message = "Chỉ bài đã xuất bản mới có thể gỡ xuất bản" });

            article.Status = "Approved";
            article.PublishedAt = null;
            article.PublishedBy = null;

            AddAdminLog("Gỡ xuất bản bài viết", "Article", article.Id, $"Gỡ xuất bản bài '{article.Title}'");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã gỡ xuất bản bài viết",
                article = new
                {
                    article.Id,
                    article.Title,
                    article.Status
                }
            });
        }

        // DELETE /api/articles/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<IActionResult> Delete(int id)
        {
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
            if (article == null)
                return NotFound(new { message = "Article không tồn tại" });

            article.IsDeleted = true;
            article.DeletedAt = DateTime.UtcNow;
            article.DeletedBy = User?.Identity?.Name ?? "Unknown";

            _context.Articles.Update(article);
            AddAdminLog("Xóa bài viết", "Article", article.Id, $"Xóa bài '{article.Title}' (xóa mềm, có thể hoàn tác từ nhật ký)");
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa bài viết thành công (xóa mềm). Có thể hoàn tác từ Nhật ký hệ thống" });
        }
    }

    public class CreateArticleDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public bool SubmitForReview { get; set; }
    }

    public class UpdateArticleDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int? CategoryId { get; set; }
        public bool SubmitForReview { get; set; }
    }

    public class ReviewArticleDto
    {
        public string Decision { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}

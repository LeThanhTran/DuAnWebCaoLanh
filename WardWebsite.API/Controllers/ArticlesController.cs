using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.IO;
using System.Text;
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
        private readonly IMemoryCache _cache;
        private readonly IWebHostEnvironment _environment;
        private const int ContentPreviewMaxLength = 220;
        private const int MaxMediaUrlLength = 2048;
        private const int MaxPreviewScanLength = 20000;
        private const int MaxThumbnailScanLength = 32768;
        private const int MaxInlineImageBytes = 8 * 1024 * 1024;
        private static readonly TimeSpan PublicListCacheDuration = TimeSpan.FromSeconds(20);
        private static readonly TimeSpan FeaturedCacheDuration = TimeSpan.FromSeconds(20);
        private static readonly Regex InlineImageSourceRegex = new(
            "<img\\b[^>]*\\bsrc\\s*=\\s*(?<quote>[\"'])(?<src>[^\"']+)\\k<quote>",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public ArticlesController(AppDbContext context, IMemoryCache cache, IWebHostEnvironment environment)
        {
            _context = context;
            _cache = cache;
            _environment = environment;
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

        private static string BuildContentPreview(string? html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return string.Empty;
            }

            var scanLength = Math.Min(html.Length, MaxPreviewScanLength);
            var previewBuilder = new StringBuilder(ContentPreviewMaxLength + 32);
            var insideTag = false;
            var reachedLimit = false;

            for (var index = 0; index < scanLength; index++)
            {
                var character = html[index];

                if (character == '<')
                {
                    insideTag = true;
                    continue;
                }

                if (insideTag)
                {
                    if (character == '>')
                    {
                        insideTag = false;
                    }

                    continue;
                }

                if (char.IsWhiteSpace(character))
                {
                    if (previewBuilder.Length > 0 && previewBuilder[previewBuilder.Length - 1] != ' ')
                    {
                        previewBuilder.Append(' ');
                    }

                    continue;
                }

                if (previewBuilder.Length >= ContentPreviewMaxLength)
                {
                    reachedLimit = true;
                    break;
                }

                previewBuilder.Append(character);
            }

            var plainText = WebUtility.HtmlDecode(previewBuilder.ToString()).Trim();
            if (plainText.Length == 0)
            {
                return string.Empty;
            }

            if (!reachedLimit || plainText.Length <= ContentPreviewMaxLength)
            {
                return plainText;
            }

            return $"{plainText.Substring(0, ContentPreviewMaxLength - 3)}...";
        }

        private string BuildThumbnailUrl(string? html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return string.Empty;
            }

            var htmlSegment = html.Length > MaxThumbnailScanLength
                ? html.Substring(0, MaxThumbnailScanLength)
                : html;

            var imageStart = htmlSegment.IndexOf("<img", StringComparison.OrdinalIgnoreCase);
            while (imageStart >= 0)
            {
                var imageEnd = htmlSegment.IndexOf('>', imageStart);
                if (imageEnd < 0)
                {
                    break;
                }

                var rawSource = ExtractAttributeValue(htmlSegment, imageStart, imageEnd, "src");
                if (!string.IsNullOrWhiteSpace(rawSource))
                {
                    var normalized = NormalizeContentMediaUrl(WebUtility.HtmlDecode(rawSource).Trim());
                    if (!string.IsNullOrWhiteSpace(normalized))
                    {
                        return normalized;
                    }
                }

                imageStart = htmlSegment.IndexOf("<img", imageEnd + 1, StringComparison.OrdinalIgnoreCase);
            }

            return string.Empty;
        }

        private static string ExtractAttributeValue(string html, int tagStart, int tagEnd, string attributeName)
        {
            var searchIndex = tagStart;
            while (searchIndex < tagEnd)
            {
                var attributeIndex = html.IndexOf(attributeName, searchIndex, StringComparison.OrdinalIgnoreCase);
                if (attributeIndex < 0 || attributeIndex >= tagEnd)
                {
                    return string.Empty;
                }

                var beforeIndex = attributeIndex - 1;
                if (beforeIndex >= tagStart && !char.IsWhiteSpace(html[beforeIndex]) && html[beforeIndex] != '<')
                {
                    searchIndex = attributeIndex + attributeName.Length;
                    continue;
                }

                var valueIndex = attributeIndex + attributeName.Length;
                while (valueIndex < tagEnd && char.IsWhiteSpace(html[valueIndex]))
                {
                    valueIndex++;
                }

                if (valueIndex >= tagEnd || html[valueIndex] != '=')
                {
                    searchIndex = valueIndex + 1;
                    continue;
                }

                valueIndex++;
                while (valueIndex < tagEnd && char.IsWhiteSpace(html[valueIndex]))
                {
                    valueIndex++;
                }

                if (valueIndex >= tagEnd)
                {
                    return string.Empty;
                }

                var quote = html[valueIndex];
                if (quote == '"' || quote == '\'')
                {
                    var valueStart = valueIndex + 1;
                    var valueEnd = html.IndexOf(quote, valueStart);
                    if (valueEnd < 0 || valueEnd > tagEnd)
                    {
                        return string.Empty;
                    }

                    return html.Substring(valueStart, valueEnd - valueStart);
                }

                var unquotedStart = valueIndex;
                var unquotedEnd = unquotedStart;
                while (unquotedEnd < tagEnd && !char.IsWhiteSpace(html[unquotedEnd]) && html[unquotedEnd] != '>')
                {
                    unquotedEnd++;
                }

                return html.Substring(unquotedStart, unquotedEnd - unquotedStart);
            }

            return string.Empty;
        }

        private string NormalizeContentMediaUrl(string? mediaUrl)
        {
            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                return string.Empty;
            }

            var normalized = mediaUrl.Trim().Replace('\\', '/');

            if (normalized.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                return string.Empty;
            }

            if (normalized.Length > MaxMediaUrlLength)
            {
                return string.Empty;
            }

            if (normalized.StartsWith("//"))
            {
                return $"{Request.Scheme}:{normalized}";
            }

            if (Uri.TryCreate(normalized, UriKind.Absolute, out _))
            {
                return normalized;
            }

            var relativePath = normalized.StartsWith('/')
                ? normalized
                : $"/{normalized.TrimStart('/')}";

            if (Request?.Host.HasValue != true)
            {
                return relativePath;
            }

            return $"{Request.Scheme}://{Request.Host}{relativePath}";
        }

        private static string TrimContentForScan(string? html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return string.Empty;
            }

            return html.Length > MaxThumbnailScanLength
                ? html.Substring(0, MaxThumbnailScanLength)
                : html;
        }

        private static bool HasInlineDataImage(string? html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return false;
            }

            return html.IndexOf("data:image/", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private string GetUploadsRootPath()
        {
            var homePath = Environment.GetEnvironmentVariable("HOME");
            if (!string.IsNullOrWhiteSpace(homePath))
            {
                return Path.Combine(homePath, "site", "uploads");
            }

            return Path.Combine(_environment.ContentRootPath, "App_Data", "uploads");
        }

        private string GetMediaStorageDirectoryPath()
        {
            var candidates = new[]
            {
                Path.Combine(GetUploadsRootPath(), "media"),
                Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"), "uploads", "media")
            };

            foreach (var candidate in candidates)
            {
                try
                {
                    Directory.CreateDirectory(candidate);
                    return candidate;
                }
                catch
                {
                    // Try next candidate path.
                }
            }

            return Path.Combine(_environment.ContentRootPath, "App_Data", "uploads", "media");
        }

        private string BuildLocalMediaUrl(string fileName)
        {
            var relativePath = $"/uploads/media/{fileName}";

            if (Request?.Host.HasValue != true)
            {
                return relativePath;
            }

            return $"{Request.Scheme}://{Request.Host}{relativePath}";
        }

        private static bool TryParseInlineImageDataUri(string source, out byte[] bytes, out string extension)
        {
            bytes = Array.Empty<byte>();
            extension = string.Empty;

            if (string.IsNullOrWhiteSpace(source)
                || !source.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            const string prefix = "data:image/";
            const string base64Marker = ";base64,";

            var markerIndex = source.IndexOf(base64Marker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex < 0)
            {
                return false;
            }

            var mimeType = source.Substring(prefix.Length, markerIndex - prefix.Length).Trim().ToLowerInvariant();
            extension = mimeType switch
            {
                "jpeg" => "jpg",
                "jpg" => "jpg",
                "png" => "png",
                "gif" => "gif",
                "webp" => "webp",
                _ => string.Empty
            };

            if (string.IsNullOrWhiteSpace(extension))
            {
                return false;
            }

            var base64Payload = source.Substring(markerIndex + base64Marker.Length);
            if (string.IsNullOrWhiteSpace(base64Payload))
            {
                return false;
            }

            var compactPayload = Regex.Replace(base64Payload, "\\s+", string.Empty);

            try
            {
                bytes = Convert.FromBase64String(compactPayload);
            }
            catch
            {
                return false;
            }

            if (bytes.Length == 0 || bytes.Length > MaxInlineImageBytes)
            {
                bytes = Array.Empty<byte>();
                return false;
            }

            return true;
        }

        private async Task<(string Content, bool Updated)> ConvertInlineDataImagesToStoredUrlsAsync(string? html)
        {
            var safeHtml = html ?? string.Empty;
            try
            {
                if (!HasInlineDataImage(safeHtml))
                {
                    return (safeHtml, false);
                }

                var matches = InlineImageSourceRegex.Matches(safeHtml);
                if (matches.Count == 0)
                {
                    return (safeHtml, false);
                }

                var updatedContent = safeHtml;
                var hasUpdated = false;
                var mediaDirectory = GetMediaStorageDirectoryPath();

                foreach (Match match in matches)
                {
                    if (!match.Success)
                    {
                        continue;
                    }

                    var srcValue = WebUtility.HtmlDecode(match.Groups["src"].Value).Trim();
                    if (!TryParseInlineImageDataUri(srcValue, out var imageBytes, out var extension))
                    {
                        continue;
                    }

                    try
                    {
                        var fileName = $"{Guid.NewGuid():N}.{extension}";
                        var filePath = Path.Combine(mediaDirectory, fileName);
                        await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);

                        var replacementUrl = BuildLocalMediaUrl(fileName);
                        updatedContent = updatedContent.Replace(match.Groups["src"].Value, replacementUrl, StringComparison.Ordinal);
                        hasUpdated = true;
                    }
                    catch
                    {
                        // Skip invalid image payload or write failures and keep original source.
                    }
                }

                return (updatedContent, hasUpdated);
            }
            catch
            {
                return (safeHtml, false);
            }
        }

        private async Task<string> EnsureInlineImagesMigratedAsync(int articleId)
        {
            try
            {
                var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == articleId && !a.IsDeleted);
                if (article == null || string.IsNullOrWhiteSpace(article.Content))
                {
                    return string.Empty;
                }

                var migrated = await ConvertInlineDataImagesToStoredUrlsAsync(article.Content);
                if (migrated.Updated)
                {
                    article.Content = migrated.Content;
                    await _context.SaveChangesAsync();
                    return migrated.Content;
                }

                return article.Content;
            }
            catch
            {
                return string.Empty;
            }
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
                .Where(a => !a.IsDeleted)
                .Include(a => a.Category)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(a =>
                    a.Title.ToLower().Contains(term) ||
                    a.Content.ToLower().Contains(term) ||
                    a.Category!.Name.ToLower().Contains(term));
            }

            if (categoryId.HasValue && categoryId.Value > 0)
            {
                query = query.Where(a => a.CategoryId == categoryId.Value);
            }

            var canViewUnpublished = includeUnpublished && IsModerator();
            string? cacheKey = null;

            if (!canViewUnpublished)
            {
                var normalizedSearch = string.IsNullOrWhiteSpace(search)
                    ? string.Empty
                    : search.Trim().ToLowerInvariant();

                cacheKey = $"articles:list:{page}:{pageSize}:{normalizedSearch}:{categoryId?.ToString() ?? "all"}";
                if (_cache.TryGetValue(cacheKey, out object? cachedResponse))
                {
                    return Ok(cachedResponse);
                }
            }

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

            var articleRows = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    ContentHtml = a.Content == null
                        ? string.Empty
                        : (a.Content.Length > MaxThumbnailScanLength
                            ? a.Content.Substring(0, MaxThumbnailScanLength)
                            : a.Content),
                    HasInlineDataImage = a.Content != null && a.Content.Contains("data:image/"),
                    a.Status,
                    a.CreatedAt,
                    a.SubmittedAt,
                    a.ReviewedAt,
                    a.ReviewedBy,
                    a.PublishedAt,
                    a.PublishedBy,
                    a.ViewCount,
                    CommentCount = a.Comments.Count(c => c.Status == "Approved"),
                    Category = a.Category!.Name
                })
                .ToListAsync();

            var articles = new List<object>(articleRows.Count);
            foreach (var a in articleRows)
            {
                var contentForPreview = a.ContentHtml;
                var thumbnailUrl = BuildThumbnailUrl(contentForPreview);

                if (string.IsNullOrWhiteSpace(thumbnailUrl) && a.HasInlineDataImage)
                {
                    var migratedContent = await EnsureInlineImagesMigratedAsync(a.Id);
                    contentForPreview = TrimContentForScan(migratedContent);
                    thumbnailUrl = BuildThumbnailUrl(contentForPreview);
                }

                articles.Add(new
                {
                    a.Id,
                    a.Title,
                    Content = string.Empty,
                    ContentPreview = BuildContentPreview(contentForPreview),
                    ThumbnailUrl = thumbnailUrl,
                    a.Status,
                    a.CreatedAt,
                    a.SubmittedAt,
                    a.ReviewedAt,
                    a.ReviewedBy,
                    a.PublishedAt,
                    a.PublishedBy,
                    a.ViewCount,
                    a.CommentCount,
                    a.Category
                });
            }

            var response = new
            {
                total,
                page,
                pageSize,
                search,
                categoryId,
                status = canViewUnpublished ? normalizedStatus : "Published",
                data = articles
            };

            if (!string.IsNullOrWhiteSpace(cacheKey))
            {
                _cache.Set(cacheKey, response, PublicListCacheDuration);
            }

            return Ok(response);
        }

        // GET /api/articles/featured?take=5
        [HttpGet("featured")]
        public async Task<ActionResult<IEnumerable<object>>> GetFeatured([FromQuery] int take = 5)
        {
            if (take < 1) take = 5;
            if (take > 10) take = 10;

            var cacheKey = $"articles:featured:{take}";
            if (_cache.TryGetValue(cacheKey, out object? cachedFeatured))
            {
                return Ok(cachedFeatured);
            }

            var approvedCommentCounts = _context.Comments
                .AsNoTracking()
                .Where(c => c.Status == "Approved")
                .GroupBy(c => c.ArticleId)
                .Select(g => new
                {
                    ArticleId = g.Key,
                    Count = g.Count()
                });

            var featuredRows = await (
                from a in _context.Articles.AsNoTracking()
                where !a.IsDeleted && a.Status == "Published"
                join cc in approvedCommentCounts on a.Id equals cc.ArticleId into commentGroup
                from cc in commentGroup.DefaultIfEmpty()
                orderby a.ViewCount descending,
                        ((int?)cc.Count ?? 0) descending,
                        (a.PublishedAt ?? a.CreatedAt) descending
                select new
                {
                    a.Id,
                    a.Title,
                    ContentHtml = a.Content == null
                        ? string.Empty
                        : (a.Content.Length > MaxThumbnailScanLength
                            ? a.Content.Substring(0, MaxThumbnailScanLength)
                            : a.Content),
                    HasInlineDataImage = a.Content != null && a.Content.Contains("data:image/"),
                    a.CreatedAt,
                    a.PublishedAt,
                    a.ViewCount,
                    CommentCount = (int?)cc.Count ?? 0,
                    Category = a.Category != null ? a.Category.Name : string.Empty
                })
                .Take(take)
                .ToListAsync();

            var featured = new List<object>(featuredRows.Count);
            foreach (var a in featuredRows)
            {
                var contentForPreview = a.ContentHtml;
                var thumbnailUrl = BuildThumbnailUrl(contentForPreview);

                if (string.IsNullOrWhiteSpace(thumbnailUrl) && a.HasInlineDataImage)
                {
                    var migratedContent = await EnsureInlineImagesMigratedAsync(a.Id);
                    contentForPreview = TrimContentForScan(migratedContent);
                    thumbnailUrl = BuildThumbnailUrl(contentForPreview);
                }

                featured.Add(new
                {
                    a.Id,
                    a.Title,
                    Content = string.Empty,
                    ContentPreview = BuildContentPreview(contentForPreview),
                    ThumbnailUrl = thumbnailUrl,
                    a.CreatedAt,
                    a.PublishedAt,
                    a.ViewCount,
                    a.CommentCount,
                    a.Category
                });
            }

            _cache.Set(cacheKey, featured, FeaturedCacheDuration);

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

            var migratedInlineImages = await ConvertInlineDataImagesToStoredUrlsAsync(article.Content);
            var shouldSave = false;

            if (migratedInlineImages.Updated)
            {
                article.Content = migratedInlineImages.Content;
                shouldSave = true;
            }

            if (!isModerator && article.Status == "Published")
            {
                article.ViewCount += 1;
                shouldSave = true;
            }

            if (shouldSave)
            {
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
            var migratedContent = await ConvertInlineDataImagesToStoredUrlsAsync(sanitizedContent);
            sanitizedContent = migratedContent.Content;
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
            var migratedContent = await ConvertInlineDataImagesToStoredUrlsAsync(sanitizedContent);
            sanitizedContent = migratedContent.Content;
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

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WardWebsite.API.Data;
using WardWebsite.API.Models;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MediaController : ControllerBase
    {
        public class UploadMediaRequest
        {
            public IFormFile? File { get; set; }
        }

        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private const string DefaultMediaType = "Image";
        private const string VideoMediaType = "Video";
        private const string HomeFeaturedVideoType = "HomeFeaturedVideo";
        private const string HomeBannerType = "HomeBanner";
        private const string HomeIntroType = "HomeIntro";
        private const double MinBannerOffset = -40;
        private const double MaxBannerOffset = 40;
        private const double MinBannerZoom = 1;
        private const double MaxBannerZoom = 2.5;

        private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
        };

        private static readonly HashSet<string> AllowedVideoExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".mp4",
            ".webm",
            ".mov",
            ".m4v"
        };

        public MediaController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        private void AddAdminLog(string action, string details, int? targetId = null)
        {
            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = action,
                TargetType = "Media",
                TargetId = targetId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
        }

        private string GetHomepageLayoutFilePath()
        {
            var appDataDirectory = Path.Combine(_environment.ContentRootPath, "App_Data");
            Directory.CreateDirectory(appDataDirectory);
            return Path.Combine(appDataDirectory, "homepage-banner-layout.json");
        }

        private HomepageLayoutSettings ReadHomepageLayout()
        {
            var filePath = GetHomepageLayoutFilePath();
            if (!System.IO.File.Exists(filePath))
            {
                return new HomepageLayoutSettings();
            }

            try
            {
                var json = System.IO.File.ReadAllText(filePath);
                return JsonSerializer.Deserialize<HomepageLayoutSettings>(json) ?? new HomepageLayoutSettings();
            }
            catch
            {
                return new HomepageLayoutSettings();
            }
        }

        private async Task SaveHomepageLayoutAsync(HomepageLayoutSettings settings)
        {
            var filePath = GetHomepageLayoutFilePath();
            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            await System.IO.File.WriteAllTextAsync(filePath, json);
        }

        private string GetWebRootPath()
        {
            return string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;
        }

        private string GetPersistentUploadsRootPath()
        {
            var homePath = Environment.GetEnvironmentVariable("HOME");
            if (!string.IsNullOrWhiteSpace(homePath))
            {
                return Path.Combine(homePath, "site", "uploads");
            }

            return Path.Combine(_environment.ContentRootPath, "App_Data", "uploads");
        }

        private string GetMediaDirectoryPath()
        {
            var candidates = new[]
            {
                Path.Combine(GetPersistentUploadsRootPath(), "media"),
                Path.Combine(GetWebRootPath(), "uploads", "media")
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

        private static bool IsLocalMediaPath(string path)
        {
            return path.StartsWith("/uploads/media/", StringComparison.OrdinalIgnoreCase);
        }

        private static string ExtractMediaFileName(string path)
        {
            var cleanPath = path.Split('?', '#')[0];
            return Path.GetFileName(cleanPath);
        }

        private string BuildSiteAbsoluteUrl(string path)
        {
            var normalizedPath = path.StartsWith('/') ? path : $"/{path}";
            return $"{Request.Scheme}://{Request.Host}{normalizedPath}";
        }

        private string NormalizeMediaUrl(string? mediaUrl)
        {
            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                return string.Empty;
            }

            if (Uri.TryCreate(mediaUrl, UriKind.Absolute, out var absoluteUri))
            {
                if (IsLocalMediaPath(absoluteUri.AbsolutePath)
                    && !string.Equals(absoluteUri.Host, Request.Host.Host, StringComparison.OrdinalIgnoreCase))
                {
                    return BuildSiteAbsoluteUrl(absoluteUri.AbsolutePath);
                }

                return mediaUrl;
            }

            if (mediaUrl.StartsWith('/'))
            {
                return BuildSiteAbsoluteUrl(mediaUrl);
            }

            return mediaUrl;
        }

        private object ToMediaResponse(Media media)
        {
            return new
            {
                media.Id,
                Url = NormalizeMediaUrl(media.Url),
                media.Type,
                IsAvailable = IsLocalMediaAvailable(media.Url)
            };
        }

        private bool IsLocalMediaAvailable(string? mediaUrl)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(mediaUrl))
                {
                    return false;
                }

                string mediaPath;
                if (Uri.TryCreate(mediaUrl, UriKind.Absolute, out var uri))
                {
                    mediaPath = uri.AbsolutePath;
                }
                else
                {
                    mediaPath = mediaUrl.StartsWith('/') ? mediaUrl : $"/{mediaUrl}";
                }

                if (!IsLocalMediaPath(mediaPath))
                {
                    return true;
                }

                var fileName = ExtractMediaFileName(mediaPath);
                if (string.IsNullOrWhiteSpace(fileName))
                {
                    return false;
                }

                var persistentPath = Path.Combine(GetMediaDirectoryPath(), fileName);
                if (System.IO.File.Exists(persistentPath))
                {
                    return true;
                }

                var legacyPath = Path.Combine(GetWebRootPath(), "uploads", "media", fileName);
                return System.IO.File.Exists(legacyPath);
            }
            catch
            {
                return false;
            }
        }

        private void TryDeleteLocalMediaFile(string? mediaUrl)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(mediaUrl))
                {
                    return;
                }

                string mediaPath;
                if (Uri.TryCreate(mediaUrl, UriKind.Absolute, out var uri))
                {
                    mediaPath = uri.AbsolutePath;
                }
                else
                {
                    mediaPath = mediaUrl.StartsWith('/') ? mediaUrl : $"/{mediaUrl}";
                }

                if (!IsLocalMediaPath(mediaPath))
                {
                    return;
                }

                var fileName = ExtractMediaFileName(mediaPath);
                if (string.IsNullOrWhiteSpace(fileName))
                {
                    return;
                }

                var candidatePaths = new[]
                {
                    Path.Combine(GetMediaDirectoryPath(), fileName),
                    Path.Combine(GetWebRootPath(), "uploads", "media", fileName)
                };

                foreach (var fullPath in candidatePaths)
                {
                    if (System.IO.File.Exists(fullPath))
                    {
                        System.IO.File.Delete(fullPath);
                    }
                }
            }
            catch
            {
                // Ignore file deletion failure to avoid blocking DB delete.
            }
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetMedia()
        {
            var media = await _context.Media
                .Where(m => !m.Url.Contains("images.unsplash.com"))
                .OrderByDescending(m => m.Id)
                .ToListAsync();

            return Ok(media.Select(ToMediaResponse));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Media>> GetById(int id)
        {
            var media = await _context.Media.FindAsync(id);
            if (media == null)
            {
                return NotFound(new { message = "Không tìm thấy ảnh" });
            }

            return Ok(ToMediaResponse(media));
        }

        [HttpGet("homepage")]
        public async Task<ActionResult<object>> GetHomepageMedia()
        {
            var banner = await _context.Media
                .Where(m => m.Type == HomeBannerType)
                .OrderByDescending(m => m.Id)
                .FirstOrDefaultAsync();

            var intro = await _context.Media
                .Where(m => m.Type == HomeIntroType)
                .OrderByDescending(m => m.Id)
                .FirstOrDefaultAsync();

            var featuredVideo = await _context.Media
                .Where(m => m.Type == HomeFeaturedVideoType)
                .OrderByDescending(m => m.Id)
                .FirstOrDefaultAsync();

            var fallbackVideo = featuredVideo == null
                ? await _context.Media
                    .Where(m => m.Type == VideoMediaType)
                    .OrderByDescending(m => m.Id)
                    .FirstOrDefaultAsync()
                : null;

            if (banner != null && !IsLocalMediaAvailable(banner.Url))
            {
                banner = null;
            }

            if (intro != null && !IsLocalMediaAvailable(intro.Url))
            {
                intro = null;
            }

            if (featuredVideo != null && !IsLocalMediaAvailable(featuredVideo.Url))
            {
                featuredVideo = null;
            }

            if (fallbackVideo != null && !IsLocalMediaAvailable(fallbackVideo.Url))
            {
                fallbackVideo = null;
            }

            var homepageLayout = ReadHomepageLayout();

            if (banner == null)
            {
                homepageLayout.BannerMediaId = null;
                homepageLayout.BannerOffsetX = 0;
                homepageLayout.BannerOffsetY = 0;
                homepageLayout.BannerZoom = 1;
            }
            else if (homepageLayout.BannerMediaId != banner.Id)
            {
                homepageLayout.BannerMediaId = banner.Id;
                homepageLayout.BannerOffsetX = 0;
                homepageLayout.BannerOffsetY = 0;
                homepageLayout.BannerZoom = 1;
            }

            if (intro == null)
            {
                homepageLayout.IntroMediaId = null;
                homepageLayout.IntroOffsetX = 0;
                homepageLayout.IntroOffsetY = 0;
                homepageLayout.IntroZoom = 1;
            }
            else if (homepageLayout.IntroMediaId != intro.Id)
            {
                homepageLayout.IntroMediaId = intro.Id;
                homepageLayout.IntroOffsetX = 0;
                homepageLayout.IntroOffsetY = 0;
                homepageLayout.IntroZoom = 1;
            }

            if (featuredVideo == null)
            {
                homepageLayout.FeaturedVideoMediaId = fallbackVideo?.Id;
            }
            else if (homepageLayout.FeaturedVideoMediaId != featuredVideo.Id)
            {
                homepageLayout.FeaturedVideoMediaId = featuredVideo.Id;
            }

            var homepageVideo = featuredVideo ?? fallbackVideo;

            return Ok(new
            {
                bannerMediaId = banner?.Id,
                bannerUrl = banner == null ? string.Empty : NormalizeMediaUrl(banner.Url),
                introMediaId = intro?.Id,
                introUrl = intro == null ? string.Empty : NormalizeMediaUrl(intro.Url),
                featuredVideoMediaId = homepageVideo?.Id,
                featuredVideoUrl = homepageVideo == null ? string.Empty : NormalizeMediaUrl(homepageVideo.Url),
                hasPinnedFeaturedVideo = featuredVideo != null,
                bannerOffsetX = homepageLayout.BannerOffsetX,
                bannerOffsetY = homepageLayout.BannerOffsetY,
                bannerZoom = homepageLayout.BannerZoom,
                introOffsetX = homepageLayout.IntroOffsetX,
                introOffsetY = homepageLayout.IntroOffsetY,
                introZoom = homepageLayout.IntroZoom
            });
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Admin,Editor")]
        [RequestSizeLimit(100 * 1024 * 1024)]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<Media>> Upload([FromForm] UploadMediaRequest request)
        {
            const long maxImageFileSizeBytes = 10 * 1024 * 1024;
            const long maxVideoFileSizeBytes = 100 * 1024 * 1024;

            var file = request.File;

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn file media" });
            }

            var extension = Path.GetExtension(file.FileName);
            var isImage = !string.IsNullOrWhiteSpace(extension) && AllowedImageExtensions.Contains(extension);
            var isVideo = !string.IsNullOrWhiteSpace(extension) && AllowedVideoExtensions.Contains(extension);

            if (!isImage && !isVideo)
            {
                return BadRequest(new { message = "Định dạng file không hợp lệ. Ảnh: jpg, jpeg, png, webp, gif. Video: mp4, webm, mov, m4v" });
            }

            var maxFileSizeBytes = isVideo ? maxVideoFileSizeBytes : maxImageFileSizeBytes;
            if (file.Length > maxFileSizeBytes)
            {
                if (isVideo)
                {
                    return BadRequest(new { message = "Kích thước video tối đa là 100MB" });
                }

                return BadRequest(new { message = "Kích thước ảnh tối đa là 10MB" });
            }

            var mediaDirectory = GetMediaDirectoryPath();

            var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var filePath = Path.Combine(mediaDirectory, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/media/{fileName}";

            var media = new Media
            {
                Url = fileUrl,
                Type = isVideo ? VideoMediaType : DefaultMediaType
            };

            _context.Media.Add(media);
            AddAdminLog(isVideo ? "Tải video" : "Tải ảnh", $"Tải media {file.FileName} thành {fileName}");
            await _context.SaveChangesAsync();

            return Ok(media);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> Delete(int id)
        {
            var media = await _context.Media.FindAsync(id);
            if (media == null)
            {
                return NotFound(new { message = "Không tìm thấy media" });
            }

            var wasBanner = media.Type == HomeBannerType;
            var wasIntro = media.Type == HomeIntroType;
            var wasHomeVideo = media.Type == HomeFeaturedVideoType;
            var isVideo = string.Equals(media.Type, VideoMediaType, StringComparison.OrdinalIgnoreCase)
                || string.Equals(media.Type, HomeFeaturedVideoType, StringComparison.OrdinalIgnoreCase);
            var mediaUrl = media.Url;

            var currentLayout = ReadHomepageLayout();
            var shouldSaveLayout = false;

            if (wasBanner && currentLayout.BannerMediaId == media.Id)
            {
                currentLayout.BannerMediaId = null;
                currentLayout.BannerOffsetX = 0;
                currentLayout.BannerOffsetY = 0;
                currentLayout.BannerZoom = 1;
                shouldSaveLayout = true;
            }

            if (wasIntro && currentLayout.IntroMediaId == media.Id)
            {
                currentLayout.IntroMediaId = null;
                currentLayout.IntroOffsetX = 0;
                currentLayout.IntroOffsetY = 0;
                currentLayout.IntroZoom = 1;
                shouldSaveLayout = true;
            }

            if (currentLayout.FeaturedVideoMediaId == media.Id)
            {
                currentLayout.FeaturedVideoMediaId = null;
                shouldSaveLayout = true;
            }

            if (shouldSaveLayout)
            {
                await SaveHomepageLayoutAsync(currentLayout);
            }

            _context.Media.Remove(media);
            AddAdminLog(isVideo ? "Xóa video" : "Xóa ảnh", $"Xóa media ID {media.Id}", media.Id);
            await _context.SaveChangesAsync();

            TryDeleteLocalMediaFile(mediaUrl);

            return Ok(new
            {
                message = "Xóa media thành công",
                wasBanner,
                wasIntro,
                wasHomeVideo
            });
        }

        [HttpPut("{id}/set-home-image")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> SetHomeImage(int id, [FromBody] SetHomeImageDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Slot))
            {
                return BadRequest(new { message = "Thiếu vị trí ảnh trang chủ" });
            }

            var slot = dto.Slot.Trim().ToLowerInvariant();
            var targetType = slot switch
            {
                "banner" => HomeBannerType,
                "intro" => HomeIntroType,
                _ => string.Empty
            };

            if (string.IsNullOrWhiteSpace(targetType))
            {
                return BadRequest(new { message = "Vị trí không hợp lệ. Chỉ hỗ trợ banner hoặc intro" });
            }

            var media = await _context.Media.FindAsync(id);
            if (media == null)
            {
                return NotFound(new { message = "Không tìm thấy ảnh" });
            }

            if (string.Equals(media.Type, VideoMediaType, StringComparison.OrdinalIgnoreCase)
                || string.Equals(media.Type, HomeFeaturedVideoType, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Video không thể đặt làm ảnh trang chủ" });
            }

            var currentSlotMedia = await _context.Media
                .Where(m => m.Type == targetType)
                .ToListAsync();

            foreach (var item in currentSlotMedia)
            {
                item.Type = DefaultMediaType;
            }

            media.Type = targetType;

            var slotLabel = slot == "banner" ? "ảnh bìa" : "ảnh giới thiệu";

            var currentLayout = ReadHomepageLayout();

            if (targetType == HomeBannerType)
            {
                if (currentLayout.BannerMediaId != media.Id)
                {
                    currentLayout.BannerMediaId = media.Id;
                    currentLayout.BannerOffsetX = 0;
                    currentLayout.BannerOffsetY = 0;
                    currentLayout.BannerZoom = 1;
                }

                if (dto.BannerOffsetX.HasValue)
                {
                    currentLayout.BannerOffsetX = Math.Clamp(dto.BannerOffsetX.Value, MinBannerOffset, MaxBannerOffset);
                }

                if (dto.BannerOffsetY.HasValue)
                {
                    currentLayout.BannerOffsetY = Math.Clamp(dto.BannerOffsetY.Value, MinBannerOffset, MaxBannerOffset);
                }

                if (dto.BannerZoom.HasValue)
                {
                    currentLayout.BannerZoom = Math.Clamp(dto.BannerZoom.Value, MinBannerZoom, MaxBannerZoom);
                }
            }

            if (targetType == HomeIntroType)
            {
                if (currentLayout.IntroMediaId != media.Id)
                {
                    currentLayout.IntroMediaId = media.Id;
                    currentLayout.IntroOffsetX = 0;
                    currentLayout.IntroOffsetY = 0;
                    currentLayout.IntroZoom = 1;
                }

                if (dto.IntroOffsetX.HasValue)
                {
                    currentLayout.IntroOffsetX = Math.Clamp(dto.IntroOffsetX.Value, MinBannerOffset, MaxBannerOffset);
                }

                if (dto.IntroOffsetY.HasValue)
                {
                    currentLayout.IntroOffsetY = Math.Clamp(dto.IntroOffsetY.Value, MinBannerOffset, MaxBannerOffset);
                }

                if (dto.IntroZoom.HasValue)
                {
                    currentLayout.IntroZoom = Math.Clamp(dto.IntroZoom.Value, MinBannerZoom, MaxBannerZoom);
                }
            }

            await SaveHomepageLayoutAsync(currentLayout);

            AddAdminLog("Đặt ảnh trang chủ", $"Đặt ảnh ID {id} làm {slotLabel}", id);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật ảnh trang chủ thành công",
                slot,
                mediaId = id,
                url = NormalizeMediaUrl(media.Url),
                bannerOffsetX = dto.BannerOffsetX,
                bannerOffsetY = dto.BannerOffsetY,
                bannerZoom = dto.BannerZoom,
                introOffsetX = dto.IntroOffsetX,
                introOffsetY = dto.IntroOffsetY,
                introZoom = dto.IntroZoom
            });
        }

        [HttpPut("{id}/set-home-video")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<ActionResult<object>> SetHomeVideo(int id)
        {
            var media = await _context.Media.FindAsync(id);
            if (media == null)
            {
                return NotFound(new { message = "Không tìm thấy video" });
            }

            var isVideo = string.Equals(media.Type, VideoMediaType, StringComparison.OrdinalIgnoreCase)
                || string.Equals(media.Type, HomeFeaturedVideoType, StringComparison.OrdinalIgnoreCase);

            if (!isVideo)
            {
                return BadRequest(new { message = "Chỉ có thể chọn file video để hiển thị trang chủ" });
            }

            var currentFeaturedVideos = await _context.Media
                .Where(m => m.Type == HomeFeaturedVideoType && m.Id != id)
                .ToListAsync();

            foreach (var item in currentFeaturedVideos)
            {
                item.Type = VideoMediaType;
            }

            media.Type = HomeFeaturedVideoType;

            var currentLayout = ReadHomepageLayout();
            currentLayout.FeaturedVideoMediaId = media.Id;
            await SaveHomepageLayoutAsync(currentLayout);

            AddAdminLog("Đặt video trang chủ", $"Đặt video ID {id} hiển thị ở trang chủ", id);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật video trang chủ thành công",
                mediaId = id,
                url = NormalizeMediaUrl(media.Url)
            });
        }
    }

    public class SetHomeImageDto
    {
        public string Slot { get; set; } = string.Empty;
        public double? BannerOffsetX { get; set; }
        public double? BannerOffsetY { get; set; }
        public double? BannerZoom { get; set; }
        public double? IntroOffsetX { get; set; }
        public double? IntroOffsetY { get; set; }
        public double? IntroZoom { get; set; }
    }

    public class HomepageLayoutSettings
    {
        public int? BannerMediaId { get; set; }
        public double BannerOffsetX { get; set; } = 0;
        public double BannerOffsetY { get; set; } = 0;
        public double BannerZoom { get; set; } = 1;
        public int? IntroMediaId { get; set; }
        public double IntroOffsetX { get; set; } = 0;
        public double IntroOffsetY { get; set; } = 0;
        public double IntroZoom { get; set; } = 1;
        public int? FeaturedVideoMediaId { get; set; }
    }
}

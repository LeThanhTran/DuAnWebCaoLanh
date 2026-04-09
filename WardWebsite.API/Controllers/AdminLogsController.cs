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
    [Authorize(Roles = "Admin")]
    public class AdminLogsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private const int MinRetentionDays = 7;
        private const int MaxRetentionDays = 3650;
        private const string UndoTypeServiceSoftDelete = "SERVICE_SOFT_DELETE";
        private const string UndoTypeCategorySoftDelete = "CATEGORY_SOFT_DELETE";
        private const string UndoTypeArticleSoftDelete = "ARTICLE_SOFT_DELETE";
        private const string UndoTypeDownloadFormSoftDelete = "DOWNLOAD_FORM_SOFT_DELETE";

        private sealed class AdminActionLogSnapshot
        {
            public string AdminUsername { get; set; } = string.Empty;
            public string Action { get; set; } = string.Empty;
            public string TargetType { get; set; } = string.Empty;
            public int? TargetId { get; set; }
            public string Details { get; set; } = string.Empty;
            public DateTime CreatedAt { get; set; }
        }

        public AdminLogsController(AppDbContext context)
        {
            _context = context;
        }

        private static bool IsRetentionDaysValid(int retentionDays)
        {
            return retentionDays >= MinRetentionDays && retentionDays <= MaxRetentionDays;
        }

        private sealed class UndoMetadata
        {
            public bool CanUndo { get; set; }
            public string? UndoType { get; set; }
            public string? UndoReason { get; set; }
        }

        private sealed class ServiceUndoState
        {
            public bool IsDeleted { get; set; }
            public string Name { get; set; } = string.Empty;
            public bool HasActiveNameConflict { get; set; }
        }

        private sealed class CategoryUndoState
        {
            public bool IsDeleted { get; set; }
            public string Name { get; set; } = string.Empty;
            public bool HasActiveNameConflict { get; set; }
        }

        private sealed class ArticleUndoState
        {
            public bool IsDeleted { get; set; }
            public string Title { get; set; } = string.Empty;
            public int? CategoryId { get; set; }
            public bool HasActiveCategory { get; set; }
        }

        private sealed class DownloadFormUndoState
        {
            public bool IsDeleted { get; set; }
            public string Title { get; set; } = string.Empty;
            public int? ServiceId { get; set; }
            public bool HasActiveService { get; set; }
        }

        private static bool IsUndoableServiceDeleteAction(AdminActionLog log)
        {
            return string.Equals(log.Action, "Xóa dịch vụ", StringComparison.OrdinalIgnoreCase)
                && string.Equals(log.TargetType, "Service", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsUndoableCategoryDeleteAction(AdminActionLog log)
        {
            return string.Equals(log.Action, "Xóa danh mục", StringComparison.OrdinalIgnoreCase)
                && string.Equals(log.TargetType, "Category", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsUndoableArticleDeleteAction(AdminActionLog log)
        {
            return string.Equals(log.Action, "Xóa bài viết", StringComparison.OrdinalIgnoreCase)
                && string.Equals(log.TargetType, "Article", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsUndoableDownloadFormDeleteAction(AdminActionLog log)
        {
            return string.Equals(log.Action, "Xóa biểu mẫu", StringComparison.OrdinalIgnoreCase)
                && string.Equals(log.TargetType, "DownloadForm", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsSupportedUndoAction(AdminActionLog log)
        {
            return IsUndoableServiceDeleteAction(log)
                || IsUndoableCategoryDeleteAction(log)
                || IsUndoableArticleDeleteAction(log)
                || IsUndoableDownloadFormDeleteAction(log);
        }

        private static string? ResolveUndoType(AdminActionLog log)
        {
            if (IsUndoableServiceDeleteAction(log))
            {
                return UndoTypeServiceSoftDelete;
            }

            if (IsUndoableCategoryDeleteAction(log))
            {
                return UndoTypeCategorySoftDelete;
            }

            if (IsUndoableArticleDeleteAction(log))
            {
                return UndoTypeArticleSoftDelete;
            }

            if (IsUndoableDownloadFormDeleteAction(log))
            {
                return UndoTypeDownloadFormSoftDelete;
            }

            return null;
        }

        private static UndoMetadata BuildUndoMetadata(
            AdminActionLog log,
            IReadOnlyDictionary<int, ServiceUndoState> serviceStates,
            IReadOnlyDictionary<int, CategoryUndoState> categoryStates,
            IReadOnlyDictionary<int, ArticleUndoState> articleStates,
            IReadOnlyDictionary<int, DownloadFormUndoState> formStates)
        {
            if (!IsSupportedUndoAction(log))
            {
                return new UndoMetadata
                {
                    CanUndo = false,
                    UndoType = null,
                    UndoReason = "Hành động này hiện chưa hỗ trợ hoàn tác"
                };
            }

            if (!log.TargetId.HasValue)
            {
                return new UndoMetadata
                {
                    CanUndo = false,
                    UndoType = ResolveUndoType(log),
                    UndoReason = "Bản ghi không có mã đối tượng để hoàn tác"
                };
            }

            var targetId = log.TargetId.Value;

            if (IsUndoableServiceDeleteAction(log))
            {
                if (!serviceStates.TryGetValue(targetId, out var serviceState))
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Đối tượng gốc không còn tồn tại trong hệ thống"
                    };
                }

                if (!serviceState.IsDeleted)
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Đối tượng đã ở trạng thái hoạt động (có thể đã hoàn tác trước đó)"
                    };
                }

                if (serviceState.HasActiveNameConflict)
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Không thể hoàn tác vì đã có dịch vụ đang hoạt động trùng tên"
                    };
                }

                return new UndoMetadata
                {
                    CanUndo = true,
                    UndoType = ResolveUndoType(log),
                    UndoReason = null
                };
            }

            if (IsUndoableCategoryDeleteAction(log))
            {
                if (!categoryStates.TryGetValue(targetId, out var categoryState))
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Đối tượng gốc không còn tồn tại trong hệ thống"
                    };
                }

                if (!categoryState.IsDeleted)
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Đối tượng đã ở trạng thái hoạt động (có thể đã hoàn tác trước đó)"
                    };
                }

                if (categoryState.HasActiveNameConflict)
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Không thể hoàn tác vì đã có danh mục đang hoạt động trùng tên"
                    };
                }

                return new UndoMetadata
                {
                    CanUndo = true,
                    UndoType = ResolveUndoType(log),
                    UndoReason = null
                };
            }

            if (IsUndoableArticleDeleteAction(log))
            {
                if (!articleStates.TryGetValue(targetId, out var articleState))
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Đối tượng gốc không còn tồn tại trong hệ thống"
                    };
                }

                if (!articleState.IsDeleted)
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Đối tượng đã ở trạng thái hoạt động (có thể đã hoàn tác trước đó)"
                    };
                }

                if (articleState.CategoryId.HasValue && !articleState.HasActiveCategory)
                {
                    return new UndoMetadata
                    {
                        CanUndo = false,
                        UndoType = ResolveUndoType(log),
                        UndoReason = "Không thể hoàn tác vì danh mục của bài viết đang bị xóa hoặc không còn tồn tại"
                    };
                }

                return new UndoMetadata
                {
                    CanUndo = true,
                    UndoType = ResolveUndoType(log),
                    UndoReason = null
                };
            }

            if (!formStates.TryGetValue(targetId, out var formState))
            {
                return new UndoMetadata
                {
                    CanUndo = false,
                    UndoType = ResolveUndoType(log),
                    UndoReason = "Đối tượng gốc không còn tồn tại trong hệ thống"
                };
            }

            if (!formState.IsDeleted)
            {
                return new UndoMetadata
                {
                    CanUndo = false,
                    UndoType = ResolveUndoType(log),
                    UndoReason = "Đối tượng đã ở trạng thái hoạt động (có thể đã hoàn tác trước đó)"
                };
            }

            if (formState.ServiceId.HasValue && !formState.HasActiveService)
            {
                return new UndoMetadata
                {
                    CanUndo = false,
                    UndoType = ResolveUndoType(log),
                    UndoReason = "Không thể hoàn tác vì dịch vụ liên kết đang bị xóa hoặc không còn tồn tại"
                };
            }

            return new UndoMetadata
            {
                CanUndo = true,
                UndoType = ResolveUndoType(log),
                UndoReason = null
            };
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

            var serviceTargetIds = items
                .Where(x => IsUndoableServiceDeleteAction(x) && x.TargetId.HasValue)
                .Select(x => x.TargetId!.Value)
                .Distinct()
                .ToList();

            var categoryTargetIds = items
                .Where(x => IsUndoableCategoryDeleteAction(x) && x.TargetId.HasValue)
                .Select(x => x.TargetId!.Value)
                .Distinct()
                .ToList();

            var articleTargetIds = items
                .Where(x => IsUndoableArticleDeleteAction(x) && x.TargetId.HasValue)
                .Select(x => x.TargetId!.Value)
                .Distinct()
                .ToList();

            var formTargetIds = items
                .Where(x => IsUndoableDownloadFormDeleteAction(x) && x.TargetId.HasValue)
                .Select(x => x.TargetId!.Value)
                .Distinct()
                .ToList();

            var serviceRows = serviceTargetIds.Count == 0
                ? new List<(int Id, string Name, bool IsDeleted)>()
                : (await _context.Services
                    .AsNoTracking()
                    .Where(s => serviceTargetIds.Contains(s.Id))
                    .Select(s => new { s.Id, s.Name, s.IsDeleted })
                    .ToListAsync())
                    .Select(s => (s.Id, s.Name, s.IsDeleted))
                    .ToList();

            var deletedServiceNameKeys = serviceRows
                .Where(s => s.IsDeleted)
                .Select(s => s.Name.ToLower())
                .Distinct()
                .ToList();

            var activeServiceRows = deletedServiceNameKeys.Count == 0
                ? new List<(int Id, string NameKey)>()
                : (await _context.Services
                    .AsNoTracking()
                    .Where(s => !s.IsDeleted)
                    .Select(s => new { s.Id, NameKey = s.Name.ToLower() })
                    .Where(s => deletedServiceNameKeys.Contains(s.NameKey))
                    .ToListAsync())
                    .Select(s => (s.Id, s.NameKey))
                    .ToList();

            var activeServiceIdsByNameKey = activeServiceRows
                .GroupBy(x => x.NameKey)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToHashSet());

            var serviceStates = serviceRows.ToDictionary(
                x => x.Id,
                x =>
                {
                    var nameKey = x.Name.ToLower();
                    var hasNameConflict = activeServiceIdsByNameKey.TryGetValue(nameKey, out var ids)
                        && ids.Any(id => id != x.Id);

                    return new ServiceUndoState
                    {
                        IsDeleted = x.IsDeleted,
                        Name = x.Name,
                        HasActiveNameConflict = hasNameConflict
                    };
                });

            var categoryRows = categoryTargetIds.Count == 0
                ? new List<(int Id, string Name, bool IsDeleted)>()
                : (await _context.Categories
                    .AsNoTracking()
                    .Where(c => categoryTargetIds.Contains(c.Id))
                    .Select(c => new { c.Id, c.Name, c.IsDeleted })
                    .ToListAsync())
                    .Select(c => (c.Id, c.Name, c.IsDeleted))
                    .ToList();

            var deletedCategoryNameKeys = categoryRows
                .Where(c => c.IsDeleted)
                .Select(c => c.Name.ToLower())
                .Distinct()
                .ToList();

            var activeCategoryRows = deletedCategoryNameKeys.Count == 0
                ? new List<(int Id, string NameKey)>()
                : (await _context.Categories
                    .AsNoTracking()
                    .Where(c => !c.IsDeleted)
                    .Select(c => new { c.Id, NameKey = c.Name.ToLower() })
                    .Where(c => deletedCategoryNameKeys.Contains(c.NameKey))
                    .ToListAsync())
                    .Select(c => (c.Id, c.NameKey))
                    .ToList();

            var activeCategoryIdsByNameKey = activeCategoryRows
                .GroupBy(x => x.NameKey)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToHashSet());

            var categoryStates = categoryRows.ToDictionary(
                x => x.Id,
                x =>
                {
                    var nameKey = x.Name.ToLower();
                    var hasNameConflict = activeCategoryIdsByNameKey.TryGetValue(nameKey, out var ids)
                        && ids.Any(id => id != x.Id);

                    return new CategoryUndoState
                    {
                        IsDeleted = x.IsDeleted,
                        Name = x.Name,
                        HasActiveNameConflict = hasNameConflict
                    };
                });

            var articleRows = articleTargetIds.Count == 0
                ? new List<(int Id, string Title, bool IsDeleted, int? CategoryId)>()
                : (await _context.Articles
                    .AsNoTracking()
                    .Where(a => articleTargetIds.Contains(a.Id))
                    .Select(a => new { a.Id, a.Title, a.IsDeleted, a.CategoryId })
                    .ToListAsync())
                    .Select(a => (Id: a.Id, Title: a.Title, IsDeleted: a.IsDeleted, CategoryId: (int?)a.CategoryId))
                    .ToList();

            var articleCategoryIds = articleRows
                .Where(a => a.CategoryId.HasValue)
                .Select(a => a.CategoryId!.Value)
                .Distinct()
                .ToList();

            var articleCategoryActiveMap = articleCategoryIds.Count == 0
                ? new Dictionary<int, bool>()
                : await _context.Categories
                    .AsNoTracking()
                    .Where(c => articleCategoryIds.Contains(c.Id))
                    .ToDictionaryAsync(c => c.Id, c => !c.IsDeleted);

            var articleStates = articleRows.ToDictionary(
                x => x.Id,
                x => new ArticleUndoState
                {
                    IsDeleted = x.IsDeleted,
                    Title = x.Title,
                    CategoryId = x.CategoryId,
                    HasActiveCategory = !x.CategoryId.HasValue
                        || (articleCategoryActiveMap.TryGetValue(x.CategoryId.Value, out var isActive) && isActive)
                });

            var formRows = formTargetIds.Count == 0
                ? new List<(int Id, string Title, bool IsDeleted, int? ServiceId)>()
                : (await _context.DownloadForms
                    .AsNoTracking()
                    .Where(f => formTargetIds.Contains(f.Id))
                    .Select(f => new { f.Id, f.Title, f.IsDeleted, f.ServiceId })
                    .ToListAsync())
                    .Select(f => (Id: f.Id, Title: f.Title, IsDeleted: f.IsDeleted, ServiceId: f.ServiceId))
                    .ToList();

            var formServiceIds = formRows
                .Where(f => f.ServiceId.HasValue)
                .Select(f => f.ServiceId!.Value)
                .Distinct()
                .ToList();

            var formServiceActiveMap = formServiceIds.Count == 0
                ? new Dictionary<int, bool>()
                : await _context.Services
                    .AsNoTracking()
                    .Where(s => formServiceIds.Contains(s.Id))
                    .ToDictionaryAsync(s => s.Id, s => !s.IsDeleted);

            var formStates = formRows.ToDictionary(
                x => x.Id,
                x => new DownloadFormUndoState
                {
                    IsDeleted = x.IsDeleted,
                    Title = x.Title,
                    ServiceId = x.ServiceId,
                    HasActiveService = !x.ServiceId.HasValue
                        || (formServiceActiveMap.TryGetValue(x.ServiceId.Value, out var isActive) && isActive)
                });

            var mappedItems = items.Select(x =>
            {
                var undoMetadata = BuildUndoMetadata(x, serviceStates, categoryStates, articleStates, formStates);

                return new
                {
                    x.Id,
                    x.AdminUsername,
                    x.Action,
                    x.TargetType,
                    x.TargetId,
                    x.Details,
                    x.CreatedAt,
                    canUndo = undoMetadata.CanUndo,
                    undoType = undoMetadata.UndoType,
                    undoReason = undoMetadata.UndoReason
                };
            });

            return Ok(new
            {
                success = true,
                data = mappedItems,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (total + pageSize - 1) / pageSize
                }
            });
        }

        [HttpGet("retention/preview")]
        public async Task<IActionResult> PreviewRetention([FromQuery] int retentionDays = 90)
        {
            if (!IsRetentionDaysValid(retentionDays))
            {
                return BadRequest(new
                {
                    message = $"retentionDays phải trong khoảng {MinRetentionDays} - {MaxRetentionDays} ngày"
                });
            }

            var cutoffUtc = DateTime.UtcNow.AddDays(-retentionDays);
            var query = _context.AdminActionLogs
                .AsNoTracking()
                .Where(x => x.CreatedAt < cutoffUtc);

            var deleteCount = await query.CountAsync();
            var oldest = await query
                .OrderBy(x => x.CreatedAt)
                .Select(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                success = true,
                retentionDays,
                cutoffUtc,
                deleteCount,
                oldestMatchedLogUtc = deleteCount > 0 ? oldest : (DateTime?)null
            });
        }

        [HttpDelete("retention/purge")]
        public async Task<IActionResult> PurgeRetention([FromQuery] int retentionDays = 90)
        {
            if (!IsRetentionDaysValid(retentionDays))
            {
                return BadRequest(new
                {
                    message = $"retentionDays phải trong khoảng {MinRetentionDays} - {MaxRetentionDays} ngày"
                });
            }

            var cutoffUtc = DateTime.UtcNow.AddDays(-retentionDays);
            var staleLogs = await _context.AdminActionLogs
                .Where(x => x.CreatedAt < cutoffUtc)
                .ToListAsync();

            var deletedCount = staleLogs.Count;
            if (deletedCount > 0)
            {
                var snapshotPayload = staleLogs.Select(x => new AdminActionLogSnapshot
                {
                    AdminUsername = x.AdminUsername,
                    Action = x.Action,
                    TargetType = x.TargetType,
                    TargetId = x.TargetId,
                    Details = x.Details,
                    CreatedAt = x.CreatedAt
                }).ToList();

                var purgeBackup = new AdminActionLogPurgeBackup
                {
                    PurgedBy = User?.Identity?.Name ?? "Unknown",
                    RetentionDays = retentionDays,
                    CutoffUtc = cutoffUtc,
                    DeletedCount = deletedCount,
                    LogsJson = JsonSerializer.Serialize(snapshotPayload),
                    PurgedAtUtc = DateTime.UtcNow
                };

                _context.AdminActionLogPurgeBackups.Add(purgeBackup);
                _context.AdminActionLogs.RemoveRange(staleLogs);
                await _context.SaveChangesAsync();
            }

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Dọn nhật ký hệ thống",
                TargetType = "AdminActionLog",
                TargetId = null,
                Details = $"Xóa {deletedCount} bản ghi nhật ký cũ hơn {retentionDays} ngày",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = deletedCount > 0
                    ? $"Đã xóa {deletedCount} bản ghi nhật ký cũ"
                    : "Không có bản ghi nào cần xóa",
                retentionDays,
                cutoffUtc,
                deletedCount
            });
        }

        [HttpPost("retention/undo-last")]
        public async Task<IActionResult> UndoLastRetentionPurge()
        {
            var latestBackup = await _context.AdminActionLogPurgeBackups
                .OrderByDescending(x => x.PurgedAtUtc)
                .FirstOrDefaultAsync();

            if (latestBackup == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không có lần dọn nhật ký nào có thể hoàn tác"
                });
            }

            if (latestBackup.RestoredAtUtc != null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Lần dọn nhật ký gần nhất đã được hoàn tác trước đó"
                });
            }

            List<AdminActionLogSnapshot>? snapshots;
            try
            {
                snapshots = JsonSerializer.Deserialize<List<AdminActionLogSnapshot>>(latestBackup.LogsJson);
            }
            catch
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Dữ liệu sao lưu nhật ký bị lỗi, không thể hoàn tác"
                });
            }

            var restoredLogs = (snapshots ?? new List<AdminActionLogSnapshot>())
                .Select(x => new AdminActionLog
                {
                    AdminUsername = string.IsNullOrWhiteSpace(x.AdminUsername) ? "Unknown" : x.AdminUsername,
                    Action = string.IsNullOrWhiteSpace(x.Action) ? "Unknown" : x.Action,
                    TargetType = string.IsNullOrWhiteSpace(x.TargetType) ? "Unknown" : x.TargetType,
                    TargetId = x.TargetId,
                    Details = x.Details ?? string.Empty,
                    CreatedAt = x.CreatedAt
                })
                .ToList();

            if (restoredLogs.Count > 0)
            {
                _context.AdminActionLogs.AddRange(restoredLogs);
            }

            latestBackup.RestoredAtUtc = DateTime.UtcNow;
            latestBackup.RestoredBy = User?.Identity?.Name ?? "Unknown";
            latestBackup.RestoredCount = restoredLogs.Count;

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Hoàn tác dọn nhật ký hệ thống",
                TargetType = "AdminActionLog",
                TargetId = null,
                Details = $"Khôi phục {restoredLogs.Count} bản ghi từ lần dọn nhật ký lúc {latestBackup.PurgedAtUtc:O}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = restoredLogs.Count > 0
                    ? $"Đã hoàn tác thành công, khôi phục {restoredLogs.Count} bản ghi nhật ký"
                    : "Đã đánh dấu hoàn tác, nhưng không có dữ liệu nhật ký cần khôi phục",
                restoredCount = restoredLogs.Count,
                purgedAtUtc = latestBackup.PurgedAtUtc
            });
        }

        private sealed class UndoExecutionResult
        {
            public bool Success { get; set; }
            public bool IsSupported { get; set; } = true;
            public string Message { get; set; } = string.Empty;
        }

        private async Task<UndoExecutionResult> UndoServiceDeleteAsync(AdminActionLog log)
        {
            if (!log.TargetId.HasValue)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Bản ghi nhật ký không có mã dịch vụ để hoàn tác"
                };
            }

            var serviceId = log.TargetId.Value;
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId);
            if (service == null)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Không tìm thấy dịch vụ gốc để khôi phục"
                };
            }

            if (!service.IsDeleted)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Dịch vụ đã ở trạng thái hoạt động, không cần hoàn tác"
                };
            }

            var hasDuplicateName = await _context.Services
                .AnyAsync(s => s.Id != service.Id && !s.IsDeleted && s.Name.ToLower() == service.Name.ToLower());

            if (hasDuplicateName)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = $"Không thể hoàn tác vì đã có dịch vụ đang hoạt động trùng tên '{service.Name}'"
                };
            }

            service.IsDeleted = false;
            service.DeletedAt = null;
            service.DeletedBy = null;

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Hoàn tác xóa dịch vụ",
                TargetType = "Service",
                TargetId = service.Id,
                Details = $"Khôi phục dịch vụ '{service.Name}' từ log #{log.Id}",
                CreatedAt = DateTime.UtcNow
            });

            return new UndoExecutionResult
            {
                Success = true,
                Message = $"Đã khôi phục dịch vụ '{service.Name}'"
            };
        }

        private async Task<UndoExecutionResult> UndoCategoryDeleteAsync(AdminActionLog log)
        {
            if (!log.TargetId.HasValue)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Bản ghi nhật ký không có mã danh mục để hoàn tác"
                };
            }

            var categoryId = log.TargetId.Value;
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == categoryId);
            if (category == null)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Không tìm thấy danh mục gốc để khôi phục"
                };
            }

            if (!category.IsDeleted)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Danh mục đã ở trạng thái hoạt động, không cần hoàn tác"
                };
            }

            var hasDuplicateName = await _context.Categories
                .AnyAsync(c => c.Id != category.Id && !c.IsDeleted && c.Name.ToLower() == category.Name.ToLower());

            if (hasDuplicateName)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = $"Không thể hoàn tác vì đã có danh mục đang hoạt động trùng tên '{category.Name}'"
                };
            }

            category.IsDeleted = false;
            category.DeletedAt = null;
            category.DeletedBy = null;

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Hoàn tác xóa danh mục",
                TargetType = "Category",
                TargetId = category.Id,
                Details = $"Khôi phục danh mục '{category.Name}' từ log #{log.Id}",
                CreatedAt = DateTime.UtcNow
            });

            return new UndoExecutionResult
            {
                Success = true,
                Message = $"Đã khôi phục danh mục '{category.Name}'"
            };
        }

        private async Task<UndoExecutionResult> UndoArticleDeleteAsync(AdminActionLog log)
        {
            if (!log.TargetId.HasValue)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Bản ghi nhật ký không có mã bài viết để hoàn tác"
                };
            }

            var articleId = log.TargetId.Value;
            var article = await _context.Articles.FirstOrDefaultAsync(a => a.Id == articleId);
            if (article == null)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Không tìm thấy bài viết gốc để khôi phục"
                };
            }

            if (!article.IsDeleted)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Bài viết đã ở trạng thái hoạt động, không cần hoàn tác"
                };
            }

            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == article.CategoryId);
            if (category == null || category.IsDeleted)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Không thể hoàn tác vì danh mục của bài viết đang bị xóa hoặc không còn tồn tại"
                };
            }

            article.IsDeleted = false;
            article.DeletedAt = null;
            article.DeletedBy = null;

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Hoàn tác xóa bài viết",
                TargetType = "Article",
                TargetId = article.Id,
                Details = $"Khôi phục bài viết '{article.Title}' từ log #{log.Id}",
                CreatedAt = DateTime.UtcNow
            });

            return new UndoExecutionResult
            {
                Success = true,
                Message = $"Đã khôi phục bài viết '{article.Title}'"
            };
        }

        private async Task<UndoExecutionResult> UndoDownloadFormDeleteAsync(AdminActionLog log)
        {
            if (!log.TargetId.HasValue)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Bản ghi nhật ký không có mã biểu mẫu để hoàn tác"
                };
            }

            var formId = log.TargetId.Value;
            var form = await _context.DownloadForms.FirstOrDefaultAsync(f => f.Id == formId);
            if (form == null)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Không tìm thấy biểu mẫu gốc để khôi phục"
                };
            }

            if (!form.IsDeleted)
            {
                return new UndoExecutionResult
                {
                    Success = false,
                    Message = "Biểu mẫu đã ở trạng thái hoạt động, không cần hoàn tác"
                };
            }

            if (form.ServiceId.HasValue)
            {
                var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == form.ServiceId.Value);
                if (service == null || service.IsDeleted)
                {
                    return new UndoExecutionResult
                    {
                        Success = false,
                        Message = "Không thể hoàn tác vì dịch vụ liên kết đang bị xóa hoặc không còn tồn tại"
                    };
                }
            }

            form.IsDeleted = false;
            form.DeletedAt = null;
            form.DeletedBy = null;

            _context.AdminActionLogs.Add(new AdminActionLog
            {
                AdminUsername = User?.Identity?.Name ?? "Unknown",
                Action = "Hoàn tác xóa biểu mẫu",
                TargetType = "DownloadForm",
                TargetId = form.Id,
                Details = $"Khôi phục biểu mẫu '{form.Title}' từ log #{log.Id}",
                CreatedAt = DateTime.UtcNow
            });

            return new UndoExecutionResult
            {
                Success = true,
                Message = $"Đã khôi phục biểu mẫu '{form.Title}'"
            };
        }

        [HttpPost("undo")]
        public async Task<IActionResult> UndoSelected([FromBody] UndoAdminLogsRequest request)
        {
            var requestedLogIds = ((request?.LogIds) ?? new List<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (requestedLogIds.Count == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Vui lòng chọn ít nhất một bản ghi nhật ký để hoàn tác"
                });
            }

            var logs = await _context.AdminActionLogs
                .Where(x => requestedLogIds.Contains(x.Id))
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            if (logs.Count == 0)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không tìm thấy bản ghi nhật ký đã chọn"
                });
            }

            var foundLogIds = logs.Select(x => x.Id).ToHashSet();
            var notFoundIds = requestedLogIds.Where(id => !foundLogIds.Contains(id)).ToList();

            var successCount = 0;
            var failedCount = 0;
            var unsupportedCount = 0;
            var results = new List<object>();

            foreach (var log in logs)
            {
                UndoExecutionResult undoResult;

                if (IsUndoableServiceDeleteAction(log))
                {
                    undoResult = await UndoServiceDeleteAsync(log);
                }
                else if (IsUndoableCategoryDeleteAction(log))
                {
                    undoResult = await UndoCategoryDeleteAsync(log);
                }
                else if (IsUndoableArticleDeleteAction(log))
                {
                    undoResult = await UndoArticleDeleteAsync(log);
                }
                else if (IsUndoableDownloadFormDeleteAction(log))
                {
                    undoResult = await UndoDownloadFormDeleteAsync(log);
                }
                else
                {
                    undoResult = new UndoExecutionResult
                    {
                        Success = false,
                        IsSupported = false,
                        Message = "Hành động này hiện chưa hỗ trợ hoàn tác"
                    };
                }

                if (!undoResult.IsSupported)
                {
                    unsupportedCount++;
                }
                else if (undoResult.Success)
                {
                    successCount++;
                }
                else
                {
                    failedCount++;
                }

                results.Add(new
                {
                    logId = log.Id,
                    success = undoResult.Success,
                    message = undoResult.Message
                });
            }

            if (successCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            if (notFoundIds.Count > 0)
            {
                failedCount += notFoundIds.Count;
                foreach (var missingId in notFoundIds)
                {
                    results.Add(new
                    {
                        logId = missingId,
                        success = false,
                        message = "Bản ghi nhật ký không tồn tại hoặc đã bị xóa"
                    });
                }
            }

            var summaryMessage = successCount > 0
                ? $"Đã hoàn tác thành công {successCount} thao tác"
                : "Không có thao tác nào được hoàn tác";

            return Ok(new
            {
                success = successCount > 0,
                message = summaryMessage,
                restoredCount = successCount,
                failedCount,
                unsupportedCount,
                requestedCount = requestedLogIds.Count,
                results
            });
        }

        public class UndoAdminLogsRequest
        {
            public List<int> LogIds { get; set; } = new();
        }
    }
}

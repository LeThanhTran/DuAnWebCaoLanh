namespace WardWebsite.API.Models
{
    public class DownloadForm
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string FileExtension { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public int? ServiceId { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; }
        public int DownloadCount { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string UploadedBy { get; set; } = string.Empty;

        public Service? Service { get; set; }
    }
}
